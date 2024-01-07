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
import { formatDecimal } from "utils/numbers"
import {
  MdArrowDownward,
  MdArrowUpward,
  MdOpenInNew,
} from "react-icons/md"
import { fromNow } from "utils/date"
import { BLOCK_LENGTH_MILLISECONDS } from "utils/constants"
import { MintRedeemLogs } from "lib/logs/mint-redeem"
import { VoteLogs } from "lib/logs/votes"
import { addSlash, camelCasetoString } from "utils/strings"
import { getLastVoteEventDescription } from "../profile/helper"

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
        <div className="ml-4 text-sm inline-flex items-center gap-1">
          {event.type == "Mint" ? (
            <MdArrowUpward className="inline-block h-4 w-4 text-green-500" />
          ) : (
            <MdArrowDownward className="inline-block h-4 w-4 text-red-500" />
          )}
          {event.type == "Mint" ? "Minted" : "Redeemed"}
          <span className="font-semibold">{formatDecimal(event.amountIn, 2)}</span>
          {event.type == "Mint" ? "gUSDC" : "USDC"}
        </div>
      )
    }

    if (event.category === "vote") {
      return getLastVoteEventDescription(event)
    }

    if(event.category == 'loan') {
      return event.type == 'opening' ? 
        'Openned loan #'+event.loanId.slice(0, 6) + "..." + event.loanId.slice(-4) :
        'Closed loan #'+event.loanId.slice(0, 6) + "..." + event.loanId.slice(-4)
    }
  }

  /* Create Table */
  const columnHelper = createColumnHelper<LastActivitiesLogs>()

  const columns = [
    columnHelper.accessor("userAddress", {
      id: "userAddress",
      header: "Wallet",
      cell: (info) => {
        return (
          <a
            className="text-sm text-brand-500 hover:text-brand-400"
            target="_blank"
            href={
              process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_ADDRESS + "/" + info.getValue()
            }
          >
            {info.getValue().slice(0, 6) + "..." + info.getValue().slice(-4)}
            <MdOpenInNew className="ml-1.5 inline-block h-4 w-4" />
          </a>
        )
      },
    }),
    columnHelper.accessor("category", {
      id: "category",
      header: "Category",
      enableSorting: true,
      cell: (info) => {
        return (
          <span className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-100 dark:bg-navy-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-100">
            {addSlash(camelCasetoString(info.getValue()))}
          </span>
        )
      },
    }),
    columnHelper.accessor("type", {
      id: "type",
      header: "Description",
      enableSorting: true,
      cell: (info) => {
        return (
          <span className="inline-flex items-center gap-x-1.5 text-sm ">
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
