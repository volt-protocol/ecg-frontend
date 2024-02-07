"use client"
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table"
import CustomTable from "components/table/CustomTable"
import moment from "moment"
import { formatDecimal} from "utils/numbers"
import {
  MdArrowDownward,
  MdArrowUpward,
} from "react-icons/md"
import clsx from "clsx"
import { useAccount } from "wagmi"
import { fromNow } from "utils/date"
import { BLOCK_LENGTH_MILLISECONDS } from "utils/constants"
import { MintRedeemLogs } from "lib/logs/mint-redeem"
import { Address } from "viem"
import { TransactionBadge } from "components/badge/TransactionBadge"

export default function LastMintEvents({
  userAddress,
  data,
  currentBlock,
}: {
  userAddress: Address
  data: any
  currentBlock: BigInt
}) {
  const { address } = useAccount()

  /* Create Table */
  const columnHelper = createColumnHelper<MintRedeemLogs>()

  const columns = [
    columnHelper.accessor("type", {
      id: "type",
      header: "Type",
      enableSorting: true,
      cell: (info) => {
        return (
          <>
            <span
              className={clsx(
                info.getValue() == "Mint"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800",
                "inline-flex items-center gap-x-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-200"
              )}
            >
              {info.getValue() == "Mint" ? (
                <MdArrowUpward className="inline-block h-4 w-4 text-green-500" />
              ) : (
                <MdArrowDownward className="inline-block h-4 w-4 text-red-500" />
              )}
              {info.getValue()}
            </span>
          </>
        )
      },
    }),
    columnHelper.accessor("amountIn", {
      id: "amountIn",
      header: "Amount In",
      cell: (info) => {
        return (
          <div className="ml-4 text-sm ">
            <span className="font-semibold mr-1">
              {formatDecimal(info.getValue(), 2)}
            </span>
            {info.row.original.type == "Mint" ? "USDC" : "gUSDC"}
          </div>
        )
      },
    }),
    columnHelper.accessor("amountOut", {
      id: "amountOut",
      header: "Amount Out",
      cell: (info) => {
        return (
          <div className="ml-4 text-sm ">
            <span className="font-semibold mr-1">
              {formatDecimal(info.getValue(), 2)}
            </span>
            {info.row.original.type == "Mint" ? "gUSDC" : "USDC"}
          </div>
        )
      },
    }),
    columnHelper.accessor("block", {
      id: "block",
      header: "Date",
      enableSorting: true,
      cell: (info) => {
        return (
          <p className="text-sm font-medium text-gray-600 dark:text-white">
            {fromNow(
              Number(
                moment().subtract(
                  (Number(currentBlock) - Number(info.getValue())) *
                    BLOCK_LENGTH_MILLISECONDS,
                  "milliseconds"
                )
              )
            )}
          </p>
        )
      },
    }),
    columnHelper.accessor("txHash", {
      id: "txHash",
      header: "Transaction",
      enableSorting: true,
      cell: (info) => <TransactionBadge txHash={info.getValue()} />,
    }),
  ]

  const table = useReactTable({
    data: data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
    initialState: {
      pagination: {
        pageSize: 8,
      },
      sorting: [
        {
          id: "block",
          desc: true,
        },
      ],
    },
  })
  /* End Create Table */

  return <CustomTable withNav={true} table={table} />
}
