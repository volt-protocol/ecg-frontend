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
import { formatDecimal, ucFirst } from "utils/numbers"
import {
  MdNote,
  MdOpenInNew,
  MdOutlineDrafts,
  MdOutlineNote,
  MdOutlineThumbDown,
  MdOutlineThumbUp,
  MdRemove,
} from "react-icons/md"
import clsx from "clsx"
import Link from "next/link"
import { Address, useAccount } from "wagmi"
import { fromNow } from "utils/date"
import { BLOCK_LENGTH_MILLISECONDS } from "utils/constants"
import { VoteLogs } from "lib/logs/votes"
import { getLastVoteEventDescription } from "../helper"

export default function LastVotes({
  userAddress,
  data,
  currentBlock,
}: {
  userAddress: Address
  data: any
  currentBlock: BigInt
}) {
  /* Create Table */
  const columnHelper = createColumnHelper<VoteLogs>()

  const columns = [
    columnHelper.accessor("category", {
      id: "category",
      header: "Event",
      cell: (info) => {
        return (
          <div className="ml-4">
            <span className="text-sm font-medium">
              {getLastVoteEventDescription(info.row.original)}
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor("type", {
      id: "type",
      header: "Contract",
      enableSorting: true,
      cell: (info) => {
        return (
          <span className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600  dark:bg-navy-600 dark:text-gray-100">
            {info.row.original.type}
          </span>
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
      cell: (info) => {
        return (
          <a
            className="text-sm text-brand-500 hover:text-brand-400"
            target="_blank"
            href={process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_TX + "/" + info.getValue()}
          >
            {info.getValue().slice(0, 6) + "..." + info.getValue().slice(-4)}
            <MdOpenInNew className="ml-1.5 inline-block h-4 w-4" />
          </a>
        )
      },
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
