import React, { useEffect, useState } from "react"
import { LoansObj, loanObj } from "types/lending"
import {
  CellContext,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { Address, readContract, waitForTransaction, writeContract } from "@wagmi/core"
import { toastError, toastRocket } from "components/toast"
import { GuildABI, TermABI, ProfitManagerABI } from "lib/contracts"
import {
  DecimalToUnit,
  preciseRound,
  secondsToAppropriateUnit,
  UnitToDecimal,
} from "utils/utils-old"
import { useAccount } from "wagmi"
import { QuestionMarkIcon, TooltipHorizon } from "components/tooltip"
import axios from "axios"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import { FaArrowLeft, FaArrowRight, FaSort, FaSortDown, FaSortUp } from "react-icons/fa"
import { MdArrowBack, MdArrowForward, MdChevronLeft, MdChevronRight, MdOpenInNew } from "react-icons/md"
import Spinner from "components/spinner"
import { useAppStore } from "store"
import { coinsList } from "store/slices/pair-prices"

const columnHelper = createColumnHelper<loanObj>()

function ActiveLoans({
  isLoadingEventLoans,
  termAddress,
  activeLoans,
  collateralName,
  maxDelayBetweenPartialRepay,
  collateralDecimals,
  reload,
}: {
  isLoadingEventLoans: boolean
  termAddress: string
  activeLoans: loanObj[]
  collateralName: string
  maxDelayBetweenPartialRepay: number
  collateralDecimals: number
  reload: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const { prices } = useAppStore()
  const [loading, setLoading] = React.useState(false)
  const { address, isConnected } = useAccount()
  const [creditMultiplier, setCreditMultiplier] = React.useState(0)
  const [collateralPrice, setCollateralPrice] = React.useState(0)
  const [pegPrice, setPegPrice] = React.useState(0)
  const [isGauge, setIsGauge] = React.useState(false)
  // const [isRepayPassed, setIsRepayPassed] = React.useState(false);
  const [repays, setRepays] = React.useState<Record<string, number>>({})
  const [showModal, setShowModal] = useState(false)
  const createSteps = (): Step[] => {
    const baseSteps = [{ name: "Call", status: "Not Started" }]

    // if (match) {
    //   baseSteps.splice(1, 1, { name: "Repay", status: "Not Started" });
    // }

    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())
  const [activeLoansWithDebt, setActiveLoansWithDebt] = useState<loanObj[]>([])
  let defaultData = activeLoansWithDebt
  const pageSize = 5
  const [currentPage, setCurrentPage] = React.useState(1)
  const [data, setData] = React.useState(() =>
    defaultData.filter(
      (loan) =>
        // loan.status !== "closed" &&
        loan.callTime === BigInt(0) &&
        loan.borrowAmount + loan.loanDebt !== BigInt(0) &&
        loan.borrower === address
    )
  )

  useEffect(() => {
    async function fetchLoanDebts() {
      const debts = await Promise.all(activeLoans.map((loan) => getLoanDebt(loan.id)))
      const newTableData = activeLoans.map((loan, index) => ({
        ...loan,
        loanDebt: debts[index],
      }))

      setActiveLoansWithDebt(newTableData)
    }
    const fetchRepays = async () => {
      const newRepays: Record<string, number> = {}
      for (let loan of activeLoans) {
        newRepays[loan.id] = await lastPartialRepay(loan.id)
      }
      setRepays(newRepays)
    }
    fetchRepays()
    fetchLoanDebts()
  }, [activeLoans, reload])

  async function getLoanDebt(loanId: string): Promise<bigint> {
    const result = await readContract({
      address: termAddress as Address,
      abi: TermABI,
      functionName: "getLoanDebt",
      args: [loanId],
    })
    return result as bigint
  }

  function CallableButton({ original }: { original: LoansObj }) {
    const [isCallable, setIsCallable] = React.useState(true)
    useEffect(() => {
      async function isCallable() {
        const isGauge = await readContract({
          address: process.env.NEXT_PUBLIC_ERC20_GUILD_ADDRESS as Address,
          abi: GuildABI,
          functionName: "isGauge",
          args: [termAddress],
        })
        setIsGauge(isGauge as boolean)
        const termRepayDelayPassed = await readContract({
          address: termAddress as Address,
          abi: TermABI,
          functionName: "partialRepayDelayPassed",
          args: [original.id],
        })
        // setIsRepayPassed(termRepayDelayPassed as boolean);
        if (isGauge && !termRepayDelayPassed) {
          setIsCallable(false)
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
  async function lastPartialRepay(id: string): Promise<number> {
    const response = await readContract({
      address: termAddress as Address,
      abi: TermABI,
      functionName: "lastPartialRepay",
      args: [id],
    })
    return Number(response)
  }
  function updateStepName(oldName: string, newName: string) {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.name === oldName ? { ...step, name: newName } : step))
    )
  }

  async function call(loandId: string, collateralAmount: number) {
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }
    if (isConnected == false) {
      toastError("Please connect your wallet")
      setLoading(false)
      return
    }
    try {
      setShowModal(true)
      updateStepStatus("Call", "In Progress")
      const { hash } = await writeContract({
        address: termAddress,
        abi: TermABI,
        functionName: "call",
        args: [loandId],
      })
      const checkCall = await waitForTransaction({
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
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }
    updateStepName("Call", "Call Many")
    try {
      updateStepStatus("Call Many", "In Progress")
      if (isConnected == false) {
        toastError("Please connect your wallet")
        setLoading(false)
        return
      }
      setLoading(true)
      const responde = await writeContract({
        address: termAddress,
        abi: TermABI,
        functionName: "callMany",
        args: [data.map((loan) => loan.id)],
      })
      const checkCall = await waitForTransaction({
        hash: responde.hash,
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

  useEffect(() => {
    async function getcreditMultiplier() {
      const creditMultiplier = await readContract({
        address: process.env.NEXT_PUBLIC_PROFIT_MANAGER_ADDRESS as Address,
        abi: ProfitManagerABI,
        functionName: "creditMultiplier",
      })

      setCreditMultiplier(Number(creditMultiplier))
    }

    async function getCollateralPrice() {
      const nameCG = coinsList.find((name) => name.nameECG === collateralName)?.nameCG
      const price = prices[nameCG].usd
      setCollateralPrice(price)
    }

    async function getPegPrice() {
      const nameCG = "usd-coin"
      const price = prices[nameCG].usd
      setPegPrice(price)
    }

    getcreditMultiplier()
    getCollateralPrice()
    getPegPrice()
  }, [])

  const columns = [
    columnHelper.accessor("id", {
      id: "loadId",
      header: "Loan ID",
      enableSorting: true,
      cell: (info) => info.getValue().slice(0, 8) + "...",
    }),
    columnHelper.accessor("borrower", {
      id: "borrower",
      header: "Borrower",
      enableSorting: true,
      cell: (info) => (
        <a
          className="flex items-center gap-1 transition-all duration-150 ease-in-out hover:text-brand-500"
          target="__blank"
          href={`${
            process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_ADDRESS
          }/${info.getValue()}`}
        >
          {info.getValue().slice(0, 4) + "..." + info.getValue().slice(-4)}{" "}
          <MdOpenInNew />
        </a>
      ),
    }),
    {
      id: "ltv",
      header: "LTV",
      cell: (info: any) => {
        const LTV = preciseRound(
          (Number(
            info.row.original.borrowAmount * info.row.original.borrowCreditMultiplier
          ) /
            1e18 /
            1e18 /
            ((collateralPrice * Number(info.row.original.collateralAmount)) /
              UnitToDecimal(1, collateralDecimals))) *
            100,
          2
        )
        const borrowValue = DecimalToUnit(
          BigInt(info.row.original.loanDebt * info.row.original.borrowCreditMultiplier) /
            BigInt(1e18),
          18
        )
        const collateralValue = preciseRound(
          DecimalToUnit(
            BigInt(Number(info.row.original.collateralAmount) * collateralPrice),
            collateralDecimals
          ),
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
                      {preciseRound(
                        DecimalToUnit(
                          info.row.original.collateralAmount,
                          collateralDecimals
                        ),
                        2
                      )}
                    </span>{" "}
                    {collateralName}
                  </p>
                  <p>
                    Collateral Value :{" "}
                    <span className="font-semibold">{collateralValue}</span> $
                  </p>
                </div>
                <div>
                  <p>
                    Debt Amount :{" "}
                    <strong>
                      {preciseRound(DecimalToUnit(info.row.original.loanDebt, 18), 2)}
                    </strong>{" "}
                    gUSDC
                  </p>
                  <p>
                    Debt Value : <strong>{preciseRound(borrowValue, 2)}</strong> USDC
                  </p>
                  <p>
                    Debt Value :{" "}
                    <strong>{preciseRound(borrowValue * pegPrice, 2)}</strong> $
                  </p>
                </div>
                <div>
                  <p>
                    Unit Collateral Price:{" "}
                    <span className="font-semibold">
                      {preciseRound(collateralPrice, 2)}
                    </span>{" "}
                    $
                  </p>
                  <p>
                    Unit USDC Price:{" "}
                    <span className="font-semibold">{preciseRound(pegPrice, 6)}</span> $
                  </p>
                </div>
              </div>
            }
            trigger={
              <div className="flex items-center">
                <p>{LTV == "0.00" ? "-.--" : LTV}%</p>
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
        <p>{preciseRound(DecimalToUnit(info.row.original.loanDebt, 18), 2)} gUSDC</p>
      ),
    },
    {
      id: "nextPaymentDue",
      header: "Next Payment Due",
      cell: (info: any) => {
        const currentDateInSeconds = Date.now() / 1000
        const sumOfTimestamps = repays[info.row.original.id] + maxDelayBetweenPartialRepay
        return (
          <>
            <p>
              {maxDelayBetweenPartialRepay === 0
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
        // if (!inputRefs.current[info.row.original.loadId]) {
        //   inputRefs.current[info.row.original.loadId] = React.createRef();
        // }

        return <CallableButton original={info.row.original} />
      },
    },
  ] // eslint-disable-next-line

  useEffect(() => {
    setData(
      defaultData.filter(
        (loan) =>
          loan.callTime === BigInt(0) && loan.borrowAmount + loan.loanDebt !== BigInt(0)
        // &&loan.status !== "closed"
      )
    )
  }, [defaultData])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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

  return (
    <>
      {showModal && (
        <StepModal
          steps={steps}
          close={setShowModal}
          initialStep={createSteps}
          setSteps={setSteps}
        />
      )}
      <div className="relative flex items-center justify-between">
        <p className="mt-4 space-x-2 text-gray-700 dark:text-gray-200">
          There are <span className="font-semibold">{data?.length}</span> active loans
        </p>
        {data && (
          <div>
            <button
              disabled={isGauge || data.length === 0}
              onClick={callMany}
              className="m-1 flex w-full cursor-pointer items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 ease-in-out hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 dark:disabled:bg-navy-900 dark:disabled:text-navy-400"
            >
              Call all
            </button>
          </div>
        )}
      </div>
      {isLoadingEventLoans? (
        <div className="flex flex-grow flex-col items-center justify-center gap-2">
          <Spinner />
        </div>
      ) : (
            <>
              <div className="overflow-auto">
                <table className="mt-4 w-full">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="!border-px !border-gray-400">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            colSpan={header.colSpan}
                            onClick={header.column.getToggleSortingHandler()}
                            className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pt-4 text-center text-start dark:border-gray-400"
                          >
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-500 dark:text-white">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </p>
                              {header.column.columnDef.enableSorting && (
                                <span className="text-sm text-gray-400">
                                  {{
                                    asc: <FaSortDown />,
                                    desc: <FaSortUp />,
                                    null: <FaSort />,
                                  }[header.column.getIsSorted() as string] ?? <FaSort />}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 transition-all duration-150 ease-in-out last:border-none hover:cursor-pointer hover:bg-gray-50 dark:border-gray-500 dark:hover:bg-navy-700"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="relative min-w-[85px] border-white/0 py-2"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav
                className="flex w-full items-center justify-between border-t border-gray-200 px-2 py-3 text-gray-400"
                aria-label="Pagination"
              >
                <div className="hidden sm:block">
                  <p className="text-sm ">
                    Showing page{" "}
                    <span className="font-medium">
                      {table.getState().pagination.pageIndex + 1}
                    </span>{" "}
                    of <span className="font-semibold">{table.getPageCount()}</span>
                  </p>
                </div>
                <div className="flex flex-1 justify-between sm:justify-end">
                  <button
                    onClick={() => table.previousPage()}
                    className="relative inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
                    disabled={!table.getCanPreviousPage()}
                  >
                    <MdChevronLeft />
                    Previous
                  </button>
                  <button
                    onClick={() => table.nextPage()}
                    className="relative ml-3 inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                    <MdChevronRight />
                  </button>
                </div>
              </nav>
            </>
      )}
    </>
  )
}

export default ActiveLoans
