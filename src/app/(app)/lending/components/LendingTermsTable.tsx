"use client"

import React, { useEffect } from "react"
import Image from "next/image"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { secondsToAppropriateUnit } from "utils/date"
import { LendingTerms } from "types/lending"
import Progress from "components/progress"
import { TooltipHorizon, QuestionMarkIcon } from "components/tooltip"
import {
  creditContract,
  guildContract,
  profitManagerContract,
  TermABI,
} from "lib/contracts"
import { readContracts } from "@wagmi/core"
import { formatDecimal, formatNumberDecimal, formatCurrencyValue } from "utils/numbers"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa"
import { Abi, formatUnits, Address } from "viem"
import { useReadContracts } from "wagmi"
import { wagmiConfig } from "contexts/Web3Provider"

export default function LendingTermsTable(props: { tableData: LendingTerms[] }) {
  const { tableData } = props
  const [sorting, setSorting] = React.useState<SortingState>([])
  const columnHelper = createColumnHelper<LendingTerms>()

  const [data, setData] = React.useState<LendingTerms[]>([])

  const router = useRouter()

  useEffect(() => {
    setData([...tableData])
  }, [tableData])

  /* Smart contract reads */
  const {
    data: contractData,
    isError,
    isLoading,
    refetch,
  } = useReadContracts({
    contracts: [
      {
        ...creditContract,
        functionName: "totalSupply",
        args: [],
      },
      {
        ...profitManagerContract,
        functionName: "creditMultiplier",
      },
    ],
    query: {
      select: (contractData) => {
        return {
          creditTotalSupply: Number(formatUnits(contractData[0].result as bigint, 18)),
          creditMultiplier: Number(formatUnits(contractData[1].result as bigint, 18)),
        }
      },
    },
  })
  /* End Smart contract reads */

  useEffect(() => {
    async function fetchDataForTerms() {
      const enrichedTableData = await Promise.all(
        tableData.map(async (term) => {
          const extraData = await getExtraTermData(term)
          // Add these values to your term
          return {
            ...term,
            gaugeWeight: Number(formatUnits(extraData[0].result, 18)),
            totalWeight: Number(formatUnits(extraData[1].result, 18)),
            creditTotalSupply: contractData.creditTotalSupply,
            currentDebt: Number(formatUnits(extraData[2].result, 18)),
            debtCeiling: Number(formatUnits(extraData[3].result, 18)),
          }
        })
      )
      setData(enrichedTableData)
    }
    tableData && contractData && fetchDataForTerms()
  }, [tableData, contractData])

  async function getExtraTermData(term: LendingTerms): Promise<any> {
    const result = await readContracts(wagmiConfig, {
      contracts: [
        {
          ...guildContract,
          functionName: "getGaugeWeight",
          args: [term.address], // Assuming each term has a unique contractAddress
        },
        {
          ...guildContract,
          functionName: "totalTypeWeight",
          args: [1],
        },
        {
          address: term.address as Address,
          abi: TermABI as Abi,
          functionName: "issuance",
        },
        {
          address: term.address as Address,
          abi: TermABI as Abi,
          functionName: "debtCeiling",
        },
      ],
    })

    return result
  }

  /* eslint-disable */
  const columns = [
    columnHelper.accessor("collateral.symbol", {
      id: "collateral",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              Collateral Token
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="ml-3 flex items-center gap-2 text-center">
          <Image
            src={info.row.original.collateral.logo}
            width={32}
            height={32}
            alt={"logo"}
          />
          <p className="text-sm font-bold text-gray-700 dark:text-white">
            {info.getValue()}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("interestRate", {
      id: "interestRate",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="ml-3 text-center text-sm font-medium text-gray-500 dark:text-white">
              Interest Rate
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="ml-3 text-center">
          <p className="text-sm font-bold text-gray-700 dark:text-white">
            {(info.getValue() * 100).toFixed(2)}%
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("borrowRatio", {
      id: "borrowRatio",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="ml-3 text-center text-sm font-medium text-gray-500 dark:text-white">
              Borrow Ratio
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="ml-3 text-center">
          <p className="text-sm font-bold text-gray-700 dark:text-white">
            {formatNumberDecimal(info.getValue() / contractData?.creditMultiplier)}
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
        const debtCeilling = info.row.original.debtCeiling

        return (
          <div>
            <TooltipHorizon
              extra=""
              content={
                <div className="text-gray-700 dark:text-white">
                  <p>
                    Debt Ceiling:{" "}
                    <span className="font-semibold">
                      {formatCurrencyValue(debtCeilling)}
                    </span>
                  </p>
                  <p>
                    Current Debt:{" "}
                    <span className="font-semibold">
                      {" "}
                      {formatCurrencyValue(info.row.original.currentDebt)}
                    </span>
                  </p>
                  <p>
                    Available Debt:{" "}
                    <span className="font-semibold">
                      {" "}
                      {formatCurrencyValue(
                        debtCeilling - info.row.original.currentDebt > 0
                          ? debtCeilling - info.row.original.currentDebt
                          : 0
                      )}
                    </span>
                  </p>
                </div>
              }
              trigger={
                <div className="flex items-center justify-center gap-1">
                  <Progress
                    useColors={true}
                    width="w-[110px]"
                    value={
                      debtCeilling
                        ? info.row.original.currentDebt > debtCeilling
                          ? 100
                          : (info.row.original.currentDebt / debtCeilling) * 100
                        : 0
                    }
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
        <div className="flex items-center justify-center gap-1">
          <p className="ml-3 text-center text-sm font-bold text-gray-600 dark:text-white">
            {formatNumberDecimal(info.getValue())}
          </p>
          <span className="text-sm font-medium text-gray-600 dark:text-white">gUSDC</span>
        </div>
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
        <p className="ml-3 text-center text-sm font-bold text-gray-600 dark:text-white">
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
        <p className="ml-3 text-center text-sm font-bold text-gray-600 dark:text-white">
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
                        {formatDecimal(info.row.original.minPartialRepayPercent, 4)}%
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
                        As a borrower, if you miss Periodic Payments, your loan will be
                        called.
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
                  onClick={() =>
                    router.push(`/lending/details?term=${row.original.address}`)
                  }
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
                          <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>
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
  )
}
