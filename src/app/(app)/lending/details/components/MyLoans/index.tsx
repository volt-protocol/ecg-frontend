import React, { useEffect, useState } from "react"
import Image from "next/image"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  columnHelper,
  createColumnHelper,
} from "@tanstack/react-table"
import { Address, readContract, waitForTransaction, writeContract } from "@wagmi/core"
import { TermABI, CreditABI, creditContract } from "lib/contracts"
import { preciseRound, secondsToAppropriateUnit, UnitToDecimal } from "utils/utils-old"
import { toastError, toastRocket } from "components/toast"
import { LendingTerms, LoansObj, loanObj } from "types/lending"
import { useAccount } from "wagmi"
import { Step } from "components/stepLoader/stepType"
import { MdOutlineError, MdWarning } from "react-icons/md"
import { formatDecimal } from "utils/numbers"
import Link from "next/link"
import { FaSlideshare, FaSort, FaSortDown, FaSortUp } from "react-icons/fa"
import { formatUnits, parseEther } from "viem"
import { shortenAddress, shortenUint } from "utils/strings"
import clsx from "clsx"
import { Modal } from "flowbite-react"
import ModalRepay from "./ModalRepay"
import StepModal from "components/stepLoader"
import Spinner from "components/spinner"

function Myloans({
  lendingTerm,
  isLoadingEventLoans,
  tableData,
  collateralPrice,
  pegPrice,
  reload,
}: {
  lendingTerm: LendingTerms
  isLoadingEventLoans: boolean
  tableData: loanObj[]
  collateralPrice: number
  pegPrice: number
  reload: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const inputRefs = React.useRef<{
    [key: string]: React.RefObject<HTMLInputElement>
  }>({})

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [loading, setLoading] = React.useState(false)
  const { address } = useAccount()
  const [showModal, setShowModal] = useState(false)
  const [tableDataWithDebts, setTableDataWithDebts] = useState<loanObj[]>([])
  const [repays, setRepays] = React.useState<Record<string, number>>({})
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [open, setOpen] = useState<boolean>(false)
  const [selectedRow, setSelectedRow] = useState<loanObj>()

  const [data, setData] = React.useState(() =>
    tableDataWithDebts.filter(
      (loan) =>
        // loan.status !== "closed" &&
        loan.callTime === BigInt(0) &&
        loan.borrowAmount + loan.loanDebt !== BigInt(0) &&
        loan.borrower === address
    )
  )

  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: "Approve", status: "Not Started" },
      { name: "Partial Repay", status: "Not Started" },
    ]
    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  useEffect(() => {
    const fetchLoanDebts = async () => {
      const debts = await Promise.all(tableData.map((loan) => getLoanDebt(loan.id)))
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
      address: lendingTerm.address as Address,
      abi: TermABI,
      functionName: "getLoanDebt",
      args: [loanId],
    })

    return result as bigint
  }

  async function getCreditBalance(): Promise<void> {
    const result = await readContract({
      ...creditContract,
      functionName: "balanceOf",
      args: [address],
    })
    setCreditBalance(Number(formatUnits(result as bigint, 18)))
  }

  async function lastPartialRepay(id: string): Promise<number> {
    const response = await readContract({
      address: lendingTerm.address as Address,
      abi: TermABI,
      functionName: "lastPartialRepay",
      args: [id],
    })
    return Number(response)
  }

  // function RepayCell({ original }: { original: loanObj }) {
  //   const [inputValue, setInputValue] = useState("")
  //   const [match, setMatch] = useState<boolean>(false)

  //   if (!inputRefs.current[original.id]) {
  //     inputRefs.current[original.id] = React.createRef()
  //   }

  //   useEffect(() => {
  //     setMatch(
  //       Number(inputValue) >=
  //         Number(preciseRound(Number(formatUnits(original.loanDebt, 18)), 2))
  //     )
  //   }, [inputValue, original.borrowAmount])

  //   return (
  //     <div className="flex flex-col items-center space-y-2">
  //       <div className="text-sm">
  //         Balance:{" "}
  //         <span className="font-semibold">
  //           {creditBalance != undefined ? formatDecimal(creditBalance, 2) : "?"} gUSDC
  //         </span>
  //         {" -"}
  //         <a
  //           className="ml-1 cursor-pointer text-brand-500 hover:text-brand-400"
  //           onClick={() =>
  //             setInputValue(preciseRound(Number(formatUnits(original.loanDebt, 18)), 2))
  //           }
  //         >
  //           Full Repay
  //         </a>
  //       </div>
  //       <input
  //         type="number"
  //         ref={inputRefs.current[original.id]}
  //         value={inputValue}
  //         onChange={(e) => {
  //           if (Number(e.target.value) >= Number(formatUnits(original.loanDebt, 18)))
  //             setInputValue(preciseRound(Number(formatUnits(original.loanDebt, 18)), 2))
  //           else setInputValue(e.target.value)
  //         }}
  //         className="block rounded-md border border-gray-300 py-3 pl-7 pr-12 text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 focus:!ring-0 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:text-lg sm:leading-6"
  //         placeholder="0"
  //       />
  //       {/* 
  //       <DefiInputBox
  //         topLabel={"Amount of gUSDC to repay"}
  //         currencyLogo="/img/crypto-logos/credit.png"
  //         currencySymbol="gUSDC"
  //         placeholder="0"
  //         pattern="^[0-9]*[.,]?[0-9]*$"
  //         inputSize="text-xl xl:text-3xl"
  //         value={inputValue}
  //         onChange={(e) => {
  //           if (Number(e.target.value) >= formatUnits(original.loanDebt, 18))
  //             setInputValue(preciseRound(formatUnits(original.loanDebt, 18), 2))
  //           else setInputValue(e.target.value)
  //         }}
  //         rightLabel={
  //           <>
  //             <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
  //               Balance: {formatDecimal(creditBalance, 2)}
  //             </p>
  //           </>
  //         }
  //         ref={inputRefs.current[original.id]}
  //       /> */}

  //       <button
  //         disabled={!inputValue || Number(inputValue) > Number(creditBalance)}
  //         onClick={() =>
  //           match
  //             ? repay(
  //                 original.id,
  //                 original.loanDebt + (original.loanDebt * BigInt(5)) / BigInt(10000000)
  //               )
  //             : partialRepay(original.id)
  //         }
  //         className={`mb-2 mr-2 mt-4 flex min-w-[9rem] cursor-pointer items-center justify-center rounded-md bg-brand-500 bg-gradient-to-br px-4 py-2 font-semibold text-white transition-all duration-150 ease-in-out hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 dark:disabled:bg-navy-900 dark:disabled:text-navy-400`}
  //       >
  //         {match ? "Repay" : "Partial Repay"}
  //       </button>
  //       {Number(inputValue) > Number(creditBalance) && (
  //         <div className="my-4 flex items-center justify-center gap-x-3 rounded-md bg-amber-100 px-2.5 py-1.5 text-sm text-amber-500/90 dark:bg-amber-100/0 dark:text-amber-500">
  //           <MdWarning className="h-5 w-5" />
  //           <p>
  //             You do not have enought gUSDC. Go to{" "}
  //             <Link href="/mint" className="font-bold">
  //               Mint & Saving
  //             </Link>{" "}
  //             to mint new gUSDCs.
  //           </p>
  //         </div>
  //       )}
  //     </div>
  //   )
  // }

  useEffect(() => {
    setData(
      tableDataWithDebts.filter(
        (loan) =>
          // loan.status !== "closed" &&
          loan.callTime === BigInt(0) &&
          loan.borrowAmount + loan.loanDebt !== BigInt(0) &&
          loan.borrower === address
      )
    )
  }, [tableDataWithDebts])

  /* Smart contract writes */
  function updateStepName(oldName: string, newName: string) {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.name === oldName ? { ...step, name: newName } : step))
    )
  }

  async function partialRepay(loanId: string, value: string) {
    setOpen(false)

    if (Number(value) <= 0 || Number(value) === null || Number(value) === undefined) {
      setLoading(false)
      return toastError("Please enter a value")
    }

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }

    try {
      setShowModal(true)
      updateStepStatus("Approve", "In Progress")
      const approve = await writeContract({
        address: process.env.NEXT_PUBLIC_ERC20_CREDIT_ADDRESS,
        abi: CreditABI,
        functionName: "approve",
        args: [lendingTerm.address, parseEther(value)],
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
        address: lendingTerm.address,
        abi: TermABI,
        functionName: "partialRepay",
        args: [loanId, parseEther(value)],
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

  async function repay(loanId: string, borrowCredit: bigint) {
    setOpen(false)

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }

    updateStepName("Partial Repay", "Repay")

    try {
      setShowModal(true)
      updateStepStatus("Approve", "In Progress")
      const approve = await writeContract({
        ...creditContract,
        functionName: "approve",
        args: [lendingTerm.address, borrowCredit],
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
        address: lendingTerm.address,
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
  /* End of smart contract writes */

  /* Set table */
  const columnHelper = createColumnHelper<loanObj>()

  const columns = [
    columnHelper.accessor("id", {
      id: "id",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              Loan Id
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="ml-3 text-center">
          <p className=" text-gray-700 dark:text-white">{shortenUint(info.getValue())}</p>
        </div>
      ),
    }),
    columnHelper.accessor("loanDebt", {
      id: "loanDebt",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              Debt Amount
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const borrowValue = Number(
          formatUnits(
            BigInt(
              info.row.original.loanDebt * info.row.original.borrowCreditMultiplier
            ) / BigInt(1e18),
            18
          )
        )
        return (
          <div className="ml-3 text-center">
            <p className="font-semibold text-gray-700 dark:text-white">
              <div className="flex items-center justify-center gap-1">
                {formatDecimal(Number(formatUnits(info.getValue(), 18)), 2)}
                <Image
                  src="/img/crypto-logos/credit.png"
                  width={20}
                  height={20}
                  alt="logo"
                />
              </div>
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {preciseRound(borrowValue * pegPrice, 2)}$
            </p>
          </div>
        )
      },
    }),
    columnHelper.accessor("collateralAmount", {
      id: "collateralAmount",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              Collateral Amount
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const collateralValue = preciseRound(
          Number(
            formatUnits(
              BigInt(Number(info.row.original.collateralAmount) * collateralPrice),
              lendingTerm.collateral.decimals
            )
          ),
          2
        )
        return (
          <div className="ml-3 text-center">
            <p className="font-semibold text-gray-700 dark:text-white">
              <div className="flex items-center justify-center gap-1">
                {formatDecimal(
                  Number(formatUnits(info.getValue(), lendingTerm.collateral.decimals)),
                  2
                )}{" "}
                <Image
                  src={lendingTerm.collateral.logo}
                  width={20}
                  height={20}
                  alt="logo"
                />
              </div>
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">{collateralValue}$</p>
          </div>
        )
      },
    }),
    {
      id: "borrowTime",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              Next Payment
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const currentDateInSeconds = Date.now() / 1000
        const sumOfTimestamps =
          repays[info.row.original.id] + lendingTerm.maxDelayBetweenPartialRepay
        const nextPaymentDue =
          lendingTerm.maxDelayBetweenPartialRepay === 0
            ? "n/a"
            : Number.isNaN(sumOfTimestamps)
            ? "--"
            : sumOfTimestamps < currentDateInSeconds
            ? "Overdue"
            : secondsToAppropriateUnit(sumOfTimestamps - currentDateInSeconds)

        return (
          <div className="ml-3 text-center">
            {lendingTerm.maxDelayBetweenPartialRepay != 0 ? (
              <>
                <div
                  className={clsx(
                    "flex items-center justify-center gap-1",
                    nextPaymentDue === "Overdue"
                      ? "text-red-500 dark:text-red-500"
                      : "text-amber-500 dark:text-amber-300"
                  )}
                >
                  <MdOutlineError />
                  <p>{nextPaymentDue}</p>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-200">
                  Min. repay:{" "}
                  <strong>
                    {preciseRound(
                      Number(formatUnits(info.row.original.borrowAmount, 18)) *
                        lendingTerm.minPartialRepayPercent,
                      2
                    )}
                  </strong>
                </p>
              </>
            ) : (
              "-"
            )}
          </div>
        )
      },
    },
    {
      id: "ltv",
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              LTV
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const ltvValue = formatDecimal(
          (Number(
            info.row.original.borrowAmount * info.row.original.borrowCreditMultiplier
          ) /
            1e18 /
            1e18 /
            ((collateralPrice * Number(info.row.original.collateralAmount)) /
              UnitToDecimal(1, lendingTerm.collateral.decimals))) *
            100,
          2
        )

        return (
          <div className="ml-3 text-center">
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
          </div>
        )
      },
    },
    {
      id: "repay",
      header: "",
      cell: (info: any) => (
        // return <RepayCell original={info.row.original} />
        <p className="text-center font-medium text-gray-600 dark:text-white">
          <button
            onClick={() => handleModalOpening(info.row.original)}
            type="button"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-700 dark:ring-navy-600"
          >
            Repay
          </button>
        </p>
      ),
    },
  ]

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
  /* End of table */

  const handleModalOpening = (rowData: loanObj) => {
    setSelectedRow(rowData)
    setOpen(true)
  }

  if (isLoadingEventLoans) {
    return (
      <div className="mt-20 flex justify-center">
        <Spinner />
      </div>
    )
  }

  if (data && !isLoadingEventLoans && data.length == 0) {
    return (
      <div className="mt-20 flex justify-center">You do not have any acive loans</div>
    )
  }

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
      <ModalRepay
        lendingTerm={lendingTerm}
        setOpen={setOpen}
        isOpen={open}
        creditBalance={creditBalance}
        rowData={selectedRow}
        repay={repay}
        partialRepay={partialRepay}
      />

      <div className="mt-4 overflow-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="!border-px !border-gray-400 ">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pt-4 text-start dark:border-gray-400"
                    >
                      <div className="flex items-center justify-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
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
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table
              .getRowModel()
              .rows.slice(0, 20)
              .map((row) => {
                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 transition-all duration-200 ease-in-out last:border-none hover:cursor-pointer hover:bg-stone-100/80 dark:border-gray-500 dark:hover:bg-navy-700"
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <td
                          key={cell.id}
                          className="relative min-w-[150px] border-white/0 py-5"
                        >
                          {cell.column.id != "usage" &&
                          cell.column.id != "maxDelayBetweenPartialRepay" ? (
                            <>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </>
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
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
    </>
  )
}

export default Myloans
