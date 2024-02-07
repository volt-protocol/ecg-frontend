"use client"
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table"
import CustomTable from "components/table/CustomTable"
import ButtonPrimary from "components/button/ButtonPrimary"

export interface CurrentPosition {
  position: string
  leverage: number
  netValue: number
  size: number
  collateral: {
    amount: number
    symbol: string
    address: string
  }
  entryPrice: number
  marketPrice: number
  liquidationPrice: number
}

const data: CurrentPosition[] = [
  {
    position: "LONG",
    leverage: 3,
    netValue: 600000,
    size: 300,
    collateral: {
      amount: 100,
      symbol: "ETH",
      address: "0x000000",
    },
    entryPrice: 1800,
    marketPrice: 2000,
    liquidationPrice: 1700,
  },
  {
    position: "LONG",
    leverage: 3,
    netValue: 600000,
    size: 300,
    collateral: {
      amount: 100,
      symbol: "ETH",
      address: "0x000000",
    },
    entryPrice: 1800,
    marketPrice: 2000,
    liquidationPrice: 1700,
  },
  {
    position: "LONG",
    leverage: 3,
    netValue: 600000,
    size: 300,
    collateral: {
      amount: 100,
      symbol: "ETH",
      address: "0x000000",
    },
    entryPrice: 1800,
    marketPrice: 2000,
    liquidationPrice: 1700,
  },
]

export default function CurrentPosition({}: {}) {
  /* Create Table */
  const columnHelper = createColumnHelper<CurrentPosition>()

  const columns = [
    columnHelper.accessor("position", {
      id: "position",
      header: "Position",
      cell: (info) => {
        return (
          <div className="">
            <span className="items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
              {info.getValue()}
              {" x" + info.row.original.leverage}
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor("netValue", {
      id: "netValue",
      header: "Net Value",
      cell: (info) => {
        return (
          <div className="">
            <span className="text-sm font-medium text-gray-600 dark:text-white">
              {info.getValue()}$
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor("size", {
      id: "size",
      header: "Size",
      cell: (info) => {
        return (
          <div className="">
            <span className="text-sm font-medium text-gray-600 dark:text-white">
              {info.getValue()}
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor("collateral.amount", {
      id: "collateral",
      header: "Collateral",
      cell: (info) => {
        return (
          <div className="">
            <span className="text-sm font-medium text-gray-600 dark:text-white">
              {info.getValue()}
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor("entryPrice", {
      id: "entryPrice",
      header: "Entry Price",
      cell: (info) => {
        return (
          <div className="">
            <span className="text-sm font-medium text-gray-600 dark:text-white">
              {info.getValue()}$
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor("marketPrice", {
      id: "maxPrice",
      header: "Market Price",
      cell: (info) => {
        return (
          <div className="">
            <span className="text-sm font-medium text-gray-600 dark:text-white">
              {info.getValue()}$
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor("liquidationPrice", {
      id: "liquidationPrice",
      header: "Liquidation Price",
      cell: (info) => {
        return (
          <div className="">
            <span className="text-sm font-medium text-gray-600 dark:text-white">
              {info.getValue()}$
            </span>
          </div>
        )
      },
    }),
    {
      id: "action",
      header: "",
      cell: (info: any) => {
        return (
          <div className="flex items-center gap-1">
            <ButtonPrimary variant="xs" title="Close" onClick={() => {}} />
          </div>
        )
      },
    },
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
