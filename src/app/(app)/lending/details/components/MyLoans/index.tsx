import React, { useEffect, useState } from "react"
import Card from "components/card"
import {
  CellContext,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  Address,
  readContract,
  waitForTransaction,
  WaitForTransactionArgs,
  writeContract,
  WriteContractResult,
} from "@wagmi/core"
import { TermABI, CreditABI } from "lib/contracts"
import {
  DecimalToUnit,
  preciseCeil,
  preciseRound,
  secondsToAppropriateUnit,
  signTransferPermit,
  UnitToDecimal,
} from "utils/utils-old"
import { toastError, toastRocket } from "components/toast"
import { LoansObj, loanObj } from "types/lending"
import { useAccount } from "wagmi"
import axios from "axios"
import { TooltipHorizon } from "components/tooltip"
import { nameCoinGecko } from "../coinGecko"
import { AiOutlineQuestionCircle } from "react-icons/ai"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import { MdOutlineError, MdWarning } from "react-icons/md"
import Spinner from "components/spinner"
import { match } from "react-router-dom"
import { formatDecimal } from "utils/numbers"
import Link from "next/link"

const columnHelper = createColumnHelper<loanObj>()

function Myloans({
  isLoadingEventLoans,
  collateralName,
  tableData,
  smartContractAddress,
  collateralPrice,
  pegPrice,
  maxDelayBetweenPartialRepay,
  collateralDecimals,
  reload,
}: {
  isLoadingEventLoans: boolean
  collateralName: string
  tableData: loanObj[]
  smartContractAddress: string
  collateralPrice: number
  pegPrice: number
  maxDelayBetweenPartialRepay: number
  collateralDecimals: number
  reload: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const inputRefs = React.useRef<{
    [key: string]: React.RefObject<HTMLInputElement>
  }>({})

  // const { account, chainId, provider } = useWeb3React()
  const [values, setValues] = React.useState<{ [key: string]: number }>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [loading, setLoading] = React.useState(false)
  const { address, isConnected, isDisconnected } = useAccount()
  const [creditMultiplier, setCreditMultiplier] = React.useState(0)
  const [showModal, setShowModal] = useState(false)
  const [tableDataWithDebts, setTableDataWithDebts] = useState<loanObj[]>([])
  const [repays, setRepays] = React.useState<Record<string, number>>({})
  const [minRepayPercent, setMinRepayPercent] = useState<bigint>(BigInt(0))
  const [creditBalance, setCreditBalance] = useState<number>(0)

  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: "Approve", status: "Not Started" },
      { name: "Partial Repay", status: "Not Started" },
    ]
    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())
  const pageSize = 3
  const [currentPage, setCurrentPage] = React.useState(1)

  const goToNextPage = () => {
    if (currentPage < Math.ceil(data.length / pageSize)) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  useEffect(() => {
    async function fetchLoanDebts() {
      const debts = await Promise.all(
        tableData.map((loan) => getLoanDebt(loan.id))
      )
      const newTableData = tableData.map((loan, index) => ({
        ...loan,
        loanDebt: debts[index],
      }))
      setTableDataWithDebts(newTableData)
    }
    const fetchRepays = async () => {
      const newRepays: Record<string, number> = {}
      for (let loan of tableData) {
        newRepays[loan.id] = await lastPartialRepay(loan.id)
      }
      setRepays(newRepays)
    }
    fetchRepays()
    fetchLoanDebts()
    getCreditBalance()
  }, [tableData, reload])

  async function getLoanDebt(loanId: string): Promise<bigint> {
    const result = await readContract({
      address: smartContractAddress as Address,
      abi: TermABI,
      functionName: "getLoanDebt",
      args: [loanId],
    })

    return result as bigint
  }

  async function getCreditBalance(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
      abi: CreditABI,
      functionName: "balanceOf",
      args: [address],
    })
    setCreditBalance(DecimalToUnit(result as bigint, 18))
  }

  async function lastPartialRepay(id: string): Promise<number> {
    const response = await readContract({
      address: smartContractAddress as Address,
      abi: TermABI,
      functionName: "lastPartialRepay",
      args: [id],
    })
    return Number(response)
  }

  function RepayCell({ original }: { original: loanObj }) {
    const [inputValue, setInputValue] = useState("")
    const [match, setMatch] = useState<boolean>(false)

    if (!inputRefs.current[original.id]) {
      inputRefs.current[original.id] = React.createRef()
    }

    useEffect(() => {
      setMatch(
        Number(inputValue) >=
          Number(preciseRound(DecimalToUnit(original.loanDebt, 18), 2))
      )
    }, [inputValue, original.borrowAmount])

    async function getMinRepay() {
      const result = await readContract({
        address: smartContractAddress as Address,
        abi: TermABI,
        functionName: "minPartialRepayPercent",
      })

      setMinRepayPercent(result as bigint)
    }
    useEffect(() => {
      getMinRepay()
    }, [original.id])

    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-sm">
          Available:{" "}
          <span className="font-semibold">
            {creditBalance != undefined ? formatDecimal(creditBalance, 2) : "?"}{" "}
            CREDIT
          </span>
        </div>
        <input
          type="number"
          ref={inputRefs.current[original.id]}
          value={inputValue}
          onChange={(e) => {
            if (Number(e.target.value) >= DecimalToUnit(original.loanDebt, 18))
              setInputValue(
                preciseRound(DecimalToUnit(original.loanDebt, 18), 2)
              )
            else setInputValue(e.target.value)
          }}
          className="block rounded-md border border-gray-300 py-3 pl-7 pr-12 text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 focus:!ring-0 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:text-lg sm:leading-6"
          placeholder="0"
        />
        <button
          disabled={!inputValue}
          onClick={() =>
            match
              ? repay(
                  original.id,
                  original.loanDebt +
                    (original.loanDebt * BigInt(5)) / BigInt(10000000)
                )
              : partialRepay(original.id)
          }
          className={`mb-2 mr-2 mt-4 flex min-w-[9rem] cursor-pointer items-center justify-center rounded-md bg-brand-500 bg-gradient-to-br px-4 py-2 font-semibold text-white transition-all duration-150 ease-in-out hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 dark:disabled:bg-navy-900 dark:disabled:text-navy-400`}
        >
          {match ? "Repay" : "Partial Repay"}
        </button>
        {Number(inputValue) > Number(creditBalance) && (
          <div className="my-4 flex items-center justify-center gap-x-3 rounded-md bg-amber-100 px-2.5 py-1.5 text-sm dark:bg-amber-100/0 text-amber-500/90 dark:text-amber-500">
            <MdWarning className="h-5 w-5" />
            <p>
              You do not have enought CREDIT. Go to {" "}
              <Link href="/mint" className="font-bold">
                Mint & Saving
              </Link>{" "}
              to mint new CREDITs.
            </p>
          </div>
        )}
      </div>
    )
  }

  let defaultData = tableDataWithDebts

  const columns = [
    {
      id: "ltv",
      header: "Information",
      cell: (info: any) => {
        const borrowValue = DecimalToUnit(
          BigInt(
            info.row.original.loanDebt *
              info.row.original.borrowCreditMultiplier
          ) / BigInt(1e18),
          18
        )
        const collateralValue = preciseRound(
          DecimalToUnit(
            BigInt(
              Number(info.row.original.collateralAmount) * collateralPrice
            ),
            collateralDecimals
          ),
          2
        )
        const currentDateInSeconds = Date.now() / 1000
        const sumOfTimestamps =
          repays[info.row.original.id] + maxDelayBetweenPartialRepay
        const nextPaymentDue =
          maxDelayBetweenPartialRepay === 0
            ? "n/a"
            : Number.isNaN(sumOfTimestamps)
            ? "--"
            : sumOfTimestamps < currentDateInSeconds
            ? "Overdue"
            : secondsToAppropriateUnit(sumOfTimestamps - currentDateInSeconds)
        return (
          <>
            <div className="min-w-[250px] flex-col space-y-4  p-2">
              <div>
                <div>
                  <p>
                    TLV :{" "}
                    <strong>
                      {" "}
                      {preciseRound(
                        (Number(
                          info.row.original.borrowAmount *
                            info.row.original.borrowCreditMultiplier
                        ) /
                          1e18 /
                          1e18 /
                          ((collateralPrice *
                            Number(info.row.original.collateralAmount)) /
                            UnitToDecimal(1, collateralDecimals))) *
                          100,
                        2
                      )}
                    </strong>
                    %
                  </p>
                </div>
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
                    {preciseRound(
                      DecimalToUnit(info.row.original.loanDebt, 18),
                      2
                    )}
                  </strong>{" "}
                  CREDIT
                </p>
                <p>
                  Debt Value : <strong>{preciseRound(borrowValue, 2)}</strong>{" "}
                  USDC
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
                  <span className="font-semibold">
                    {preciseRound(pegPrice, 6)}
                  </span>{" "}
                  $
                </p>
                {nextPaymentDue !== "n/a" && (
                  <>
                    <div className=" flex items-center space-x-1">
                      <p>
                        Next Payment Due : <strong>{nextPaymentDue}</strong>
                      </p>
                      <MdOutlineError
                        className={` absolute left-1.5 ${
                          nextPaymentDue === "Overdue"
                            ? "text-red-500 dark:text-red-500"
                            : "text-amber-500 dark:text-amber-300"
                        }`}
                      />
                    </div>
                    <p>
                      Min to repay :{" "}
                      <strong>
                        {preciseRound(
                          DecimalToUnit(info.row.original.borrowAmount, 18) *
                            DecimalToUnit(minRepayPercent, 18),
                          2
                        )}
                      </strong>{" "}
                      CREDIT
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )
      },
    },
    {
      id: "partialRepay",
      header: "Repay",
      cell: (info: any) => {
        return <RepayCell original={info.row.original} />
      },
    },
  ] // eslint-disable-next-line

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
    setData(
      defaultData.filter(
        (loan) =>
          // loan.status !== "closed" &&
          loan.callTime === BigInt(0) &&
          loan.borrowAmount + loan.loanDebt !== BigInt(0) &&
          loan.borrower === address
      )
    )
  }, [defaultData])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  })

  function updateStepName(oldName: string, newName: string) {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.name === oldName ? { ...step, name: newName } : step
      )
    )
  }

  async function partialRepay(loanId: string) {
    const inputValue = Number(inputRefs.current[loanId].current?.value)

    if (inputValue <= 0 || inputValue === null || inputValue === undefined) {
      setLoading(false)
      return toastError("Please enter a value")
    }

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      )
    }

    try {
      setShowModal(true)
      updateStepStatus("Approve", "In Progress")
      const approve = await writeContract({
        address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS,
        abi: CreditABI,
        functionName: "approve",
        args: [smartContractAddress, UnitToDecimal(inputValue, 18)],
      })

      const data = await waitForTransaction({
        hash: approve.hash,
      })

      if (data.status != "success") {
        updateStepStatus("Approve", "Error")
        return
      }
      updateStepStatus("Approve", "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Approve", "Error")
      return
    }

    try {
      updateStepStatus("Partial Repay", "In Progress")
      const { hash } = await writeContract({
        address: smartContractAddress,
        abi: TermABI,
        functionName: "partialRepay",
        args: [loanId, UnitToDecimal(inputValue, 18)],
      })

      const checkPartialPay = await waitForTransaction({
        hash: hash,
      })

      if (checkPartialPay.status === "success") {
        updateStepStatus("Partial Repay", "Success")
        reload(true)
      } else {
        updateStepStatus("Partial Repay", "Error")
      }
    } catch (e) {
      updateStepStatus("Partial Repay", "Error")
      console.log(e)
    }
  }

  async function partialRepayWithPermit(loanId: string) {
    const inputValue = inputRefs.current[loanId].current?.value

    if (inputValue && /^\d*$/.test(inputValue)) {
      const valueToRepay = Number(inputValue)
      if (valueToRepay === 0) return toastError("Please enter a value")

      const { r, s, v, deadline } = await signTransferPermit(valueToRepay)

      const { hash } = await writeContract({
        address: smartContractAddress,
        abi: TermABI,
        functionName: "partialRepayWithPermit",
        args: [
          loanId,
          UnitToDecimal(valueToRepay, 18),
          deadline,
          { v: v, r: r, s: s },
        ],
      })
    }
  }

  async function repay(loanId: string, borrowCredit: bigint) {
    console.log(borrowCredit, "repayCredit")
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      )
    }

    updateStepName("Partial Repay", "Repay")

    try {
      setShowModal(true)
      updateStepStatus("Approve", "In Progress")
      const approve = await writeContract({
        address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS,
        abi: CreditABI,
        functionName: "approve",
        args: [smartContractAddress, borrowCredit],
      })

      const data = await waitForTransaction({
        hash: approve.hash,
      })

      if (data.status != "success") {
        updateStepStatus("Approve", "Error")
        return
      }
      updateStepStatus("Approve", "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Approve", "Error")
      return
    }
    try {
      updateStepStatus("Repay", "In Progress")
      const { hash } = await writeContract({
        address: smartContractAddress,
        abi: TermABI,
        functionName: "repay",
        args: [loanId],
      })

      const checkRepay = await waitForTransaction({
        hash: hash,
      })

      if (checkRepay.status != "success") {
        updateStepStatus("Repay", "Error")
      }
      updateStepStatus("Repay", "Success")
      reload(true)
    } catch (e) {
      console.log(e)
      updateStepStatus("Repay", "Error")
    }
  }

  const isPrevPageAvailable = currentPage > 1
  const isNextPageAvailable = currentPage < Math.ceil(data.length / pageSize)
  const [selectedLoan, setSelectedLoan] = useState(data[0])

  useEffect(() => {
    if (data && data.length > 0) {
      setSelectedLoan(data[0])
    }
  }, [data])

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
      <div className="h-full rounded-md text-gray-700 dark:text-gray-200">
        <div className="relative flex items-center justify-between pt-4">
          {data && data.length > 0 && (
            <select
              value={selectedLoan?.id}
              className="px-2 py-1 dark:bg-navy-600"
              onChange={(e) => {
                const selected = data.find((loan) => loan.id === e.target.value)
                setSelectedLoan(selected)
              }}
            >
              {data.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.id.slice(0, 6)}
                </option>
              ))}
            </select>
          )}
        </div>

        {!isConnected && (
          <div className="flex h-full flex-grow items-center justify-center text-gray-700 dark:text-gray-100 ">
            <p>You need to be connected to see your active loans</p>
          </div>
        )}
        {isLoadingEventLoans ? (
          <div className="flex h-full flex-grow items-center justify-center text-gray-700 dark:text-gray-100 ">
            <Spinner />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full flex-grow items-center justify-center text-gray-700 dark:text-gray-100 ">
            <p>You do not have active loans on this term yet</p>
          </div>
        ) : (
          <div className="mt-4 overflow-auto xl:overflow-auto">
            {selectedLoan ? (
              <p>
                <strong>Loan ID : </strong>
                {selectedLoan.id.slice(0, 6) +
                  "..." +
                  selectedLoan.id.slice(-6)}
              </p>
            ) : (
              ""
            )}
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="!border-px !border-gray-400"
                  >
                    {headerGroup.headers.map((header) => {
                      return (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          onClick={header.column.getToggleSortingHandler()}
                          className="border-b-[1px] border-gray-200 pb-2 pr-4 pt-4 text-start"
                        >
                          <div className="text-sm font-medium text-gray-500 dark:text-white">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table
                  .getRowModel()
                  .rows.filter((row) => row.original.id === selectedLoan?.id)
                  .map((row) => {
                    return (
                      <tr key={row.id}>
                        {row.getVisibleCells().map((cell) => {
                          return (
                            <td
                              key={cell.id}
                              className={`${
                                cell.id === "ltv" ? "w-[400px]" : ""
                              }`}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export default Myloans
