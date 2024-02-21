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
import { formatDecimal, toLocaleString } from "utils/numbers"
import { MdArrowDownward, MdArrowUpward, MdOpenInNew } from "react-icons/md"
import { fromNow } from "utils/date"
import { BLOCK_LENGTH_MILLISECONDS } from "utils/constants"
import { MintRedeemLogs } from "lib/logs/mint-redeem"
import { VoteLogs } from "lib/logs/votes"
import { addSlash, camelCasetoString, shortenAddress, shortenUint } from "utils/strings"
import { getLastVoteEventDescription } from "../profile/helper"
import { AddressBadge } from "components/badge/AddressBadge"
import { Address } from "viem"
import { TransactionBadge } from "components/badge/TransactionBadge"

export type LastActivitiesLogs = MintRedeemLogs | VoteLogs

export type Category = "mintRedeem" | "vote"

export const LastProtocolActivity = ({
  data,
  currentBlock,
}: {
  data: number[]
  currentBlock: bigint
}) => {
  const getDescription = (event: LastActivitiesLogs): any => {
    if (event.category === "mintRedeem") {
      return (
        <div className="ml-4 inline-flex items-center gap-1 text-sm">
          {event.type == "Mint" ? (
            <MdArrowUpward className="inline-block h-4 w-4 text-green-500" />
          ) : (
            <MdArrowDownward className="inline-block h-4 w-4 text-red-500" />
          )}
          {event.type == "Mint" ? "Minted" : "Redeemed"}
          <span className="font-semibold">
            {toLocaleString(formatDecimal(event.amountIn, 2))}
          </span>
          {event.type == "Mint" ? "gUSDC" : "USDC"}
        </div>
      )
    }

    if (event.category === "vote") {
      return getLastVoteEventDescription(event)
    }

    if (event.category == "loan") {
      return event.type == "opening"
        ? "Opened loan #" + shortenUint(event.loanId)
        : "Closed loan #" + shortenUint(event.loanId)
    }
  }

  /* Create Table */
  const columnHelper = createColumnHelper<LastActivitiesLogs>()

  const columns = [
    columnHelper.accessor("userAddress", {
      id: "userAddress",
      header: "Wallet",
      cell: (info) => (
        <div className="flex justify-center">
          <AddressBadge address={info.getValue()} />
        </div>
      ),
    }),
    columnHelper.accessor("category", {
      id: "category",
      header: "Category",
      enableSorting: true,
      cell: (info) => {
        return (
          <span className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-navy-600 dark:text-gray-100">
            {addSlash(camelCasetoString(info.getValue()))}
          </span>
        )
      },
    }),
    columnHelper.accessor("termAddress", {
      id: "termAddress",
      header: "Lending Term",
      cell: (info) =>
        info.getValue() ? (
          <div className="flex justify-center">
            <AddressBadge address={info.getValue() as Address} />
          </div>
        ) : (
          "-"
        ),
    }),
    columnHelper.accessor("type", {
      id: "type",
      header: "Description",
      enableSorting: true,
      cell: (info) => {
        return (
          <span className="inline-flex items-center gap-x-1.5 text-sm">
            {getDescription(info.row.original)}
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
      cell: (info) => (
        <div className="flex justify-center">
          <TransactionBadge txHash={info.getValue()} />
        </div>
      ),
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
