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
} from "react-icons/md"
import clsx from "clsx"
import { useAccount } from "wagmi"
import { fromNow } from "utils/date"
import { BLOCK_LENGTH_MILLISECONDS } from "utils/constants"
import { MintRedeemLogs } from "lib/logs/mint-redeem"
import { Address } from "viem"
import { TransactionBadge } from "components/badge/TransactionBadge"
import { useAppStore } from "store"
import { getCreditTokenSymbol } from "utils/strings"
import { marketsConfig } from "config"
import Image from "next/image"

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
  const { contractsList, appMarketId, coinDetails } = useAppStore()

  const creditAddress = contractsList?.marketContracts[appMarketId].creditAddress;
  const pegToken = coinDetails.find((item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase());
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const pegTokenLogo = marketsConfig.find((item) => item.marketId == appMarketId).logo;
  const creditTokenSymbol = getCreditTokenSymbol(coinDetails, appMarketId, contractsList);

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
      header: "Sent",
      cell: (info) => {
        return (
          <div className="ml-4 text-sm ">
            <Image src={pegTokenLogo} width={20} height={20} alt="" title={info.row.original.type == "Mint" ? pegToken.symbol : creditTokenSymbol} className="inline align-bottom" style={info.row.original.type == "Mint" ? {} : {'borderRadius':'50%','border':'2px solid #3e6b7d'}} /> <span className="font-semibold mr-1">{formatDecimal(info.getValue(), pegTokenDecimalsToDisplay)}</span>
          </div>
        )
      },
    }),
    columnHelper.accessor("amountOut", {
      id: "amountOut",
      header: "Received",
      cell: (info) => {
        return (
          <div className="ml-4 text-sm ">
            <Image src={pegTokenLogo} width={20} height={20} alt="" title={info.row.original.type == "Redeem" ? pegToken.symbol : creditTokenSymbol} className="inline align-bottom" style={info.row.original.type == "Redeem" ? {} : {'borderRadius':'50%','border':'2px solid #3e6b7d'}} /> <span className="font-semibold mr-1">{formatDecimal(info.getValue(), pegTokenDecimalsToDisplay)}</span>
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
