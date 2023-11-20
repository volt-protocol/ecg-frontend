"use client"

import React, { useEffect } from "react"

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  DecimalToUnit,
  formatCurrencyValue,
  secondsToAppropriateUnit,
} from "utils/utils-old"
import { LendingTerms } from "types/lending"
import Progress from "components/progress"
import { TooltipHorizon, QuestionMarkIcon } from "components/tooltip"
import { AiOutlineQuestionCircle } from "react-icons/ai"
import {
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdExpandMore,
} from "react-icons/md"

import { CreditABI, GuildABI, TermABI } from "lib/contracts"
import { Address, readContract } from "@wagmi/core"
import { formatDecimal, formatNumberDecimal } from "utils/numbers"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa"

export default function LendingTermsTable(props: {
  tableData: LendingTerms[]
}) {
  const { tableData } = props
  const [sorting, setSorting] = React.useState<SortingState>([])
  const columnHelper = createColumnHelper<LendingTerms>()

  const [data, setData] = React.useState<LendingTerms[]>([])

  const router = useRouter()

  useEffect(() => {
    setData([...tableData])
  }, [tableData])

  useEffect(() => {
    async function fetchDataForTerms() {
      console.log("refetching contract data")

      const enrichedTableData = await Promise.all(
        tableData.map(async (term) => {
          const [gaugeWeight, totalWeight, creditTotalSupply, currentDebt] =
            await Promise.all([
              getGaugeWeightForTerm(term),
              getTotalWeightForTerm(term),
              getCreditTotalSupplyForTerm(),
              getCurrentDebt(term),
            ])

          // Add these values to your term
          return {
            ...term,
            gaugeWeight,
            totalWeight,
            creditTotalSupply,
            currentDebt,
          }
        })
      )

      setData(enrichedTableData)
    }
    fetchDataForTerms()
  }, [tableData])

  async function getGaugeWeightForTerm(term: LendingTerms): Promise<number> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
      abi: GuildABI,
      functionName: "getGaugeWeight",
      args: [term.address], // Assuming each term has a unique contractAddress
    })
    return Number(DecimalToUnit(result as bigint, 18))
  }

  async function getTotalWeightForTerm(term: LendingTerms): Promise<number> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
      abi: GuildABI,
      functionName: "totalTypeWeight",
      args: [1],
    })
    return Number(DecimalToUnit(result as bigint, 18))
  }

  async function getCreditTotalSupplyForTerm(): Promise<number> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
      abi: CreditABI,
      functionName: "totalSupply",
      args: [],
    })
    return Number(DecimalToUnit(result as bigint, 18))
  }
  async function getCurrentDebt(term: LendingTerms): Promise<number> {
    const result = await readContract({
      address: term.address as Address,
      abi: TermABI,
      functionName: "issuance",
    })
    return Number(DecimalToUnit(result as bigint, 18))
  }

  /* eslint-disable */
  const columns = [
    columnHelper.accessor("collateral", {
      id: "name",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="ml-3 text-center text-sm font-medium text-gray-500 dark:text-white">
              Name
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="ml-3 flex items-center">
          <p className="text-sm font-bold text-gray-700 dark:text-white">
            {info.row.original.collateral}-
            {info.row.original.interestRate * 100}%-
            {formatNumberDecimal(info.row.original.borrowRatio)}
          </p>
        </div>
      ),
    }),
    {
      id: "usage",
      header: () => (
        <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
          Utilization
        </p>
      ),
      cell: (info: any) => {
        const debtCeilling =
          info.row.original.creditTotalSupply *
          (info.row.original.gaugeWeight / info.row.original.totalWeight) *
          1.2
        return (
          <div>
            <TooltipHorizon
              extra=""
              content={
                <div className="text-gray-700 dark:text-white">
                  <p>
                    Debt Ceiling:{" "}
                    <span className="font-semibold">
                      {formatCurrencyValue(
                        parseFloat(formatNumberDecimal(debtCeilling))
                      )}
                    </span>
                  </p>
                  <p>
                    Current Debt:{" "}
                    <span className="font-semibold">
                      {" "}
                      {formatCurrencyValue(
                        parseFloat(
                          formatNumberDecimal(info.row.original.currentDebt)
                        )
                      )}
                    </span>
                  </p>
                  <p>
                    Available Debt:{" "}
                    <span className="font-semibold">
                      {" "}
                      {formatCurrencyValue(
                        parseFloat(
                          formatNumberDecimal(
                            debtCeilling - info.row.original.currentDebt
                          )
                        )
                      )}
                    </span>
                  </p>
                </div>
              }
              trigger={
                <div className="flex items-center justify-center gap-1">
                  <Progress
                    width="w-[110px]"
                    value={
                      info.row.original.currentDebt / debtCeilling * 100
                    }
                    color="teal"
                  />
                  <div className="ml-1">
                    <QuestionMarkIcon />
                  </div>
                </div>
              }
              placement="top"
            />
          </div>
        )
      },
    },

    columnHelper.accessor("currentDebt", {
      id: "currentDebt",
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="ml-8 text-center text-sm font-medium text-gray-500 dark:text-white">
              Current Debt
            </p>
          </a>
        </div>
      ),
      cell: (info) => (
        <p className="text-center text-sm font-bold text-gray-600 dark:text-white">
          {formatNumberDecimal(info.getValue())}
        </p>
      ),
    }),

    columnHelper.accessor("interestRate", {
      id: "interestRate",
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="ml-8 text-center text-sm font-medium text-gray-500 dark:text-white">
              Interest Rate
            </p>
          </a>
        </div>
      ),
      cell: (info) => (
        <p className="text-center text-sm font-bold text-gray-600 dark:text-white">
          {formatNumberDecimal(info.getValue() * 100)}%
        </p>
      ),
    }),
    columnHelper.accessor("borrowRatio", {
      id: "BorrowRatio",
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="ml-8 text-center text-sm font-medium text-gray-500 dark:text-white">
              Borrow Ratio
            </p>
          </a>
        </div>
      ),
      cell: (info) => (
        <p className="text-center text-sm font-bold text-gray-600 dark:text-white">
          {formatNumberDecimal(info.getValue())}
        </p>
      ),
    }),

    columnHelper.accessor("openingFee", {
      id: "openingFee",
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="ml-8 text-center text-sm font-medium text-gray-500 dark:text-white">
              Opening Fee
            </p>
          </a>
        </div>
      ),
      cell: (info) => (
        <p className="text-center text-sm font-bold text-gray-600 dark:text-white">
          {formatNumberDecimal(info.getValue() * 100)}%
        </p>
      ),
    }),

    columnHelper.accessor("maxDelayBetweenPartialRepay", {
      id: "maxDelayBetweenPartialRepay",
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="ml-8 text-center text-sm font-medium text-gray-500 dark:text-white">
              Periodic Payments
            </p>
          </a>
        </div>
      ),
      cell: (info) => (
        <p className="text-center text-sm font-bold text-gray-600 dark:text-white">
          {/* {secondsToAppropriateUnit(info.getValue())} */}
          {info.getValue() != 0 ? (
            <div className="flex items-center justify-center gap-1">
              Yes{" "}
              <TooltipHorizon
                extra=""
                content={
                  <div className="text-gray-700 dark:text-white">
                    <p>
                      Periodic Payment minimum size :{" "}
                      <span className="font-semibold">
                        {formatDecimal(
                          info.row.original.minPartialRepayPercent,
                          9
                        )}
                        %
                      </span>
                    </p>
                    <p>
                      Periodic Payment maximum interval :{" "}
                      <span className="font-semibold">
                        {secondsToAppropriateUnit(
                          info.row.original.maxDelayBetweenPartialRepay
                        )}
                      </span>
                    </p>
                    <p>
                      <br />
                      <i>
                        As a borrower, if you miss Periodic Payments, your loan
                        will be called.
                      </i>
                    </p>
                  </div>
                }
                trigger={
                  <div className="">
                    <QuestionMarkIcon />
                  </div>
                }
                placement="right"
              />
            </div>
          ) : (
            "No"
          )}
        </p>
      ),
    }),
    {
      id: "action",
      header: () => <></>,
      enableSorting: false,
      cell: (info) => (
        <p className="text-center font-medium text-gray-600 dark:text-white">
          <Link href={`/lending/details?term=${info.row.original.address}`}>
            <button
              type="button"
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-700 dark:ring-navy-600"
            >
              Details
            </button>
          </Link>
        </p>
      ),
    },
  ]
  /* eslint-enable */

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

  return (
    <div className="mt-4 overflow-auto xl:overflow-auto">
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
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.columnDef.enableSorting && (
                        <span className="text-sm text-gray-400">
                          {{
                            asc: <FaSortDown />,
                            desc: <FaSortUp />,
                            null: <FaSort />,
                          }[header.column.getIsSorted() as string] ?? (
                            <FaSort />
                          )}
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
                  onClick={() =>
                    router.push(`/lending/details?term=${row.original.address}`)
                  }
                  key={row.id}
                  className="border-b border-gray-100 transition-all duration-150 ease-in-out last:border-none hover:cursor-pointer hover:bg-gray-50 dark:border-gray-500 dark:hover:bg-navy-700"
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
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </>
                        ) : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )
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
  )
}
