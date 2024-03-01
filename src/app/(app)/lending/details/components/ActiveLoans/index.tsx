import React, { useEffect, useState } from "react"
import Image from "next/image"
import { LendingTerms, LoansObj, loanObj } from "types/lending"
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  readContract,
  readContracts,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core"
import { TermABI, GuildABI } from "lib/contracts"
import { QuestionMarkIcon, TooltipHorizon } from "components/tooltip"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import Spinner from "components/spinner"
import { useAppStore } from "store"
import { coinsList } from "config"
import { wagmiConfig } from "contexts/Web3Provider"
import { ItemIdBadge } from "components/badge/ItemIdBadge"
import { AddressBadge } from "components/badge/AddressBadge"
import { formatUnits, Address, parseUnits, Abi } from "viem"
import { formatDecimal, toLocaleString } from "utils/numbers"
import { secondsToAppropriateUnit } from "utils/date"
import { CurrencyTypes } from "components/switch/ToggleCredit"
import CustomTable from "components/table/CustomTable"
import clsx from "clsx"
import { useReadContracts } from "wagmi"

const columnHelper = createColumnHelper<loanObj>()

function ActiveLoans({
  isLoadingEventLoans,
  lendingTerm,
  activeLoans,
  reload,
  currencyType,
}: {
  isLoadingEventLoans: boolean
  activeLoans: loanObj[]
  lendingTerm: LendingTerms
  reload: React.Dispatch<React.SetStateAction<boolean>>
  currencyType: CurrencyTypes
}) {
  const { prices, contractsList } = useAppStore()
  const [collateralPrice, setCollateralPrice] = useState(0)
  const [pegPrice, setPegPrice] = useState(0)
  const [repays, setRepays] = useState<Record<string, number>>({})
  const [showModal, setShowModal] = useState(false)

  const [steps, setSteps] = useState<Step[]>()

  const updateStepStatus = (stepName: string, status: Step["status"]) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
    )
  }

  const [data, setData] = useState<loanObj[]>([])

  const {
    data: contractData,
    isError,
    isLoading,
    refetch,
  } = useReadContracts({
    contracts: [
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: "isGauge",
        args: [lendingTerm.address],
      },
    ],
    query: {
      select: (data) => {
        return {
          isGauge: data[0].result as boolean,
        }
      },
    },
  })
  /* End Smart contract reads */

  useEffect(() => {
    async function fetchLoanDebts() {
      const debts = await Promise.all(activeLoans.map((loan) => getLoanDebt(loan.id)))
      const newTableData = activeLoans
        .map((loan, index) => ({
          ...loan,
          loanDebt: debts[index],
        }))
        .filter(
          (loan) => loan.callTime === 0 && loan.borrowAmount + loan.loanDebt !== BigInt(0)
        )
      setData(newTableData)
    }

    const fetchRepays = async () => {
      const repaysPromises = activeLoans.map((loan) =>
        lastPartialRepay(loan.id).then((partialRepay) => [loan.id, partialRepay])
      )
      const repaysResults = await Promise.all(repaysPromises)
      const newRepays = Object.fromEntries(repaysResults)
      setRepays(newRepays)
    }

    if (activeLoans) {
      fetchRepays()
      fetchLoanDebts()
    }
  }, [activeLoans, reload])

  useEffect(() => {
    async function getCollateralPrice() {
      const nameCG = coinsList.find(
        (name) => name.nameECG === lendingTerm.collateral.symbol
      )?.nameCG
      const price = prices[nameCG].usd
      setCollateralPrice(price)
    }

    async function getPegPrice() {
      const nameCG = "usd-coin"
      const price = prices[nameCG].usd
      setPegPrice(price)
    }

    if (lendingTerm) {
      getCollateralPrice()
      getPegPrice()
    }
  }, [lendingTerm])

  function CallableButton({ original }: { original: LoansObj }) {
    const [isCallable, setIsCallable] = useState(false)
    useEffect(() => {
      async function isCallable() {
        const data = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: lendingTerm.address as Address,
              abi: TermABI as Abi,
              functionName: "partialRepayDelayPassed",
              args: [original.id],
            },
            {
              address: lendingTerm.address as Address,
              abi: TermABI as Abi,
              functionName: "maxDebtForCollateral",
              args: [original.collateralAmount],
            },
          ],
        })

        if (
          !contractData.isGauge ||
          data[0].result ||
          (data[1].result as bigint) < original.loanDebt
        ) {
          setIsCallable(true)
        }
      }
      isCallable()
    }, [])

    return (
      <div className="flex items-center">
        <button
          onClick={() => call(original.id, original.collateralAmount)}
          disabled={isCallable ? false : true}
          className="m-1 flex cursor-pointer items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 ease-in-out hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 dark:disabled:bg-navy-900 dark:disabled:text-navy-400"
        >
          Call
        </button>
      </div>
    )
  }

  async function getLoanDebt(loanId: string): Promise<bigint> {
    const result = await readContract(wagmiConfig, {
      address: lendingTerm.address as Address,
      abi: TermABI,
      functionName: "getLoanDebt",
      args: [loanId],
    })
    return result as bigint
  }

  async function lastPartialRepay(id: string): Promise<number> {
    const response = await readContract(wagmiConfig, {
      address: lendingTerm.address as Address,
      abi: TermABI,
      functionName: "getLoan",
      args: [id],
    })

    return Number(response.lastPartialRepay)
  }

  /* Smart Contract write functions */
  async function call(loandId: string) {
    const createSteps = (): Step[] => {
      const baseSteps = [{ name: "Call", status: "Not Started" }]

      return baseSteps
    }

    setSteps(createSteps())

    try {
      setShowModal(true)
      updateStepStatus("Call", "In Progress")
      const hash = await writeContract(wagmiConfig, {
        address: lendingTerm.address,
        abi: TermABI,
        functionName: "call",
        args: [loandId],
      })
      const checkCall = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (checkCall.status != "success") {
        updateStepStatus("Call", "Error")
        return
      }
      updateStepStatus("Call", "Success")
      reload(true)
    } catch (e) {
      console.log(e)
      updateStepStatus("Call", "Error")
    }
  }

  async function callMany() {
    const createSteps = (): Step[] => {
      const baseSteps = [{ name: "Call Many", status: "Not Started" }]

      return baseSteps
    }
    setSteps(createSteps())

    try {
      updateStepStatus("Call Many", "In Progress")
      const hash = await writeContract(wagmiConfig, {
        address: lendingTerm.address,
        abi: TermABI,
        functionName: "callMany",
        args: [data.map((loan) => loan.id)],
      })
      const checkCall = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })
      if (checkCall.status != "success") {
        updateStepStatus("Call Many", "Error")
        return
      }
      updateStepStatus("Call Many", "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Call Many", "Error")
    }
  }
  /* End Smart Contract write functions */

  const columns = [
    columnHelper.accessor("id", {
      id: "loadId",
      header: "Loan ID",
      enableSorting: true,
      cell: (info) => (
        <div className="flex justify-center">
          <ItemIdBadge id={info.getValue()} />
        </div>
      ),
    }),
    columnHelper.accessor("borrower", {
      id: "borrower",
      header: "Borrower",
      enableSorting: true,
      cell: (info) => (
        <div className="flex justify-center">
          <AddressBadge address={info.getValue()} />
        </div>
      ),
    }),
    {
      id: "ltv",
      header: "LTV",
      cell: (info: any) => {
        const borrowValue = formatUnits(
          BigInt(info.row.original.loanDebt * info.row.original.borrowCreditMultiplier) /
            BigInt(1e18),
          18
        )

        const currentDebtInCollateralEquivalent =
          Number(
            formatUnits(
              info.row.original.borrowAmount / BigInt(lendingTerm.borrowRatio),
              18
            )
          ) * Number(formatUnits(info.row.original.borrowCreditMultiplier, 18))

        const collateralValue = Number(
          formatUnits(info.row.original.collateralAmount, lendingTerm.collateral.decimals)
        )

        const ltvValue = formatDecimal(
          (currentDebtInCollateralEquivalent / collateralValue) * 100,
          2
        )

        return (
          <TooltipHorizon
            extra="dark:text-gray-200"
            content={
              <div className="space-y-4 p-2">
                <div>
                  <p>
                    Collateral Amount :{" "}
                    <span className="font-semibold">
                      {" "}
                      {toLocaleString(
                        formatDecimal(
                          Number(
                            formatUnits(
                              info.row.original.collateralAmount,
                              lendingTerm.collateral.decimals
                            )
                          ),
                          2
                        )
                      )}
                    </span>{" "}
                    {lendingTerm.collateral.name}
                  </p>
                  <p>
                    Collateral Value : ${" "}
                    <span className="font-semibold">
                      {toLocaleString(collateralValue.toString())}
                    </span>
                  </p>
                </div>
                <div>
                  <p>
                    Debt Amount :{" "}
                    <strong>
                      {toLocaleString(
                        formatDecimal(
                          Number(formatUnits(info.row.original.loanDebt, 18)),
                          2
                        )
                      )}
                    </strong>{" "}
                    gUSDC
                  </p>
                  <p>
                    Debt Value :{" "}
                    <strong>
                      {toLocaleString(formatDecimal(Number(borrowValue), 2))}
                    </strong>{" "}
                    USDC
                  </p>
                  <p>
                    Debt Value :{" "}
                    <strong>
                      $ {toLocaleString(formatDecimal(Number(borrowValue) * pegPrice, 2))}
                    </strong>
                  </p>
                </div>
                <div>
                  <p>
                    Unit Collateral Price:{" "}
                    <span className="font-semibold">
                      $ {toLocaleString(formatDecimal(collateralPrice, 2))}
                    </span>{" "}
                  </p>
                  <p>
                    Unit USDC Price:{" "}
                    <span className="font-semibold">
                      $ {toLocaleString(formatDecimal(pegPrice, 6))}
                    </span>
                  </p>
                </div>
              </div>
            }
            trigger={
              <div className="flex items-center justify-center">
                <p
                  className={clsx(
                    "font-semibold",
                    Number(ltvValue) < 80
                      ? "text-green-500"
                      : Number(ltvValue) < 90
                      ? "text-amber-500"
                      : "text-red-500"
                  )}
                >
                  {ltvValue}%
                </p>
                <div className="ml-1">
                  <QuestionMarkIcon />
                </div>
              </div>
            }
            placement="top"
          />
        )
      },
    },
    {
      id: "DebtAmount",
      header: "Debt Amount",
      cell: (info: any) => (
        <p className="font-semibold text-gray-700 dark:text-white">
          <div className="flex justify-center gap-1">
            {currencyType == "USDC"
              ? toLocaleString(
                  formatDecimal(
                    Number(formatUnits(info.row.original.loanDebt, 18)) *
                      Number(formatUnits(info.row.original.borrowCreditMultiplier, 18)),
                    2
                  )
                )
              : toLocaleString(
                  formatDecimal(Number(formatUnits(info.row.original.loanDebt, 18)), 2)
                )}
            {currencyType == "USDC" ? (
              <Image src="/img/crypto-logos/usdc.png" width={25} height={25} alt="logo" />
            ) : (
              <Image
                src="/img/crypto-logos/credit.png"
                width={25}
                height={25}
                alt="logo"
              />
            )}
          </div>
        </p>
      ),
    },
    {
      id: "nextPaymentDue",
      header: "Next Payment Due",
      cell: (info: any) => {
        const currentDateInSeconds = Date.now() / 1000
        const sumOfTimestamps =
          repays[info.row.original.id] + lendingTerm.maxDelayBetweenPartialRepay
        return (
          <>
            <p className="font-semibold text-gray-700 dark:text-white">
              {lendingTerm.maxDelayBetweenPartialRepay === 0
                ? "n/a"
                : Number.isNaN(sumOfTimestamps)
                ? "--"
                : sumOfTimestamps < currentDateInSeconds
                ? "Overdue"
                : secondsToAppropriateUnit(sumOfTimestamps - currentDateInSeconds)}
            </p>
          </>
        )
      },
    },

    {
      id: "call",
      enableSorting: false,
      cell: (info: any) => {
        return <CallableButton original={info.row.original} />
      },
    },
  ] // eslint-disable-next-line

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
    initialState: {
      pagination: {
        pageSize: 10,
      },
      sorting: [
        {
          id: "nextPaymentDue",
          desc: true,
        },
      ],
    },
  })

  if (!contractData) return null

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} setSteps={setSteps} />}
      <div className="relative flex items-center justify-between">
        <p className="mt-4 space-x-2 text-gray-700 dark:text-gray-200">
          There are <span className="font-semibold">{data?.length}</span> active loans
        </p>
        {data && (
          <div>
            <button
              disabled={contractData.isGauge || data.length === 0}
              onClick={callMany}
              className="m-1 flex w-full cursor-pointer items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 ease-in-out hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 dark:disabled:bg-navy-900 dark:disabled:text-navy-400"
            >
              Call all
            </button>
          </div>
        )}
      </div>
      {isLoadingEventLoans || data.length == 0 ? (
        <div className="flex flex-grow flex-col items-center justify-center gap-2">
          <Spinner />
        </div>
      ) : (
        <>
          <CustomTable withNav={true} table={table} />
        </>
      )}
    </>
  )
}

export default ActiveLoans
