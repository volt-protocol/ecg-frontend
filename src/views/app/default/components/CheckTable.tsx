import React, { useEffect } from "react";
import CardMenu from "components/card/CardMenu";
import Checkbox from "components/checkbox";
import Card from "components/card";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  formatCurrencyValue,
  secondsToAppropriateUnit,
} from "../../../../utils";
import { Link } from "react-router-dom";
import { lendingTerms } from "types/lending";




function CheckTable(props: { tableData: any }) {
  const { tableData } = props;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  let defaultData = tableData;
  const columns = [
    columnHelper.accessor("collateral", {
      id: "name",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">NAME</p>
      ),
      cell: (info: any) => (
        <div className="flex items-center">
          {/* <img src={info.getValue()[1]} alt="" className="w-10 h-10 rounded-full" /> */}

          <p className="ml-3 text-sm font-bold text-navy-700 dark:text-white">
            {info.getValue()}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("interestRate", {
      id: "interestRate",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          interest Rate
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {info.getValue()}%
        </p>
      ),
    }),
    columnHelper.accessor("borrowRatio", {
      id: "BorrowRatio",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Borrow Ratio
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {info.getValue()}
        </p>
      ),
    }),
    columnHelper.accessor("callFee", {
      id: "CallFee",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          CallFee
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {info.getValue()}
        </p>
      ),
    }),
    columnHelper.accessor("callPeriodSeconds", {
      id: "CallPeriod",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Call Period
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {secondsToAppropriateUnit(info.getValue())}
        </p>
      ),
    }),
    columnHelper.accessor("availableDebt", {
      id: "AvailableDebt",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          AvailableDebt
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {formatCurrencyValue(info.getValue())}
        </p>
      ),
    }),
    columnHelper.accessor("currentDebt", {
      id: "CurrentDebt",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Current Debt
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {formatCurrencyValue(info.getValue())}
        </p>
      ),
    }),
    columnHelper.accessor("openingFee", {
      id: "openingFee",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Opening Fee
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {formatCurrencyValue(info.getValue())}
        </p>
      ),
    }),
    columnHelper.accessor("minPartialRepayPercent", {
      id: "minPartialRepayPercent",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
         Min Partial Repay Percent
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {formatCurrencyValue(info.getValue())}
        </p>
      ),
    }),
    columnHelper.accessor("maxDelayBetweenPartialRepay", {
      id: "maxDelayBetweenPartialRepay",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
        Max Delay Between Partial Repay
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {formatCurrencyValue(info.getValue())}
        </p>
      ),
    }),
    columnHelper.accessor("minBorrow", {
      id: "minBorrow",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
        Min Borrow
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {formatCurrencyValue(info.getValue())}
        </p>
      ),
    }),
    columnHelper.accessor("ltvBuffer", {
      id: "ltvBuffer",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
       Ltv Buffer
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {formatCurrencyValue(info.getValue())}
        </p>
      ),
    }),
  ]; // eslint-disable-next-line
  const [data, setData] = React.useState([tableData]);

  useEffect(() => {
    setData([...tableData]);
  }, [tableData]);

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
  });
  return (
    <Card extra={"w-full h-full sm:overflow-auto px-6"}>
      <header className="relative flex items-center justify-between pt-4">
        <div className="text-xl font-bold text-navy-700 dark:text-white">
          Currently avtive Lending Terms
        </div>

        {/* <CardMenu /> */}
      </header>

      <div className="mt-8 overflow-x-scroll xl:overflow-x-scroll">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="!border-px !border-gray-400">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pr-4 pt-4 text-start"
                    >
                      <div className="items-center justify-between text-xs text-gray-200">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: "",
                          desc: "",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table
              .getRowModel()
              .rows.slice(0, 10)
              .map((row) => {
                return (
                  <tr key={row.id} className="hover:bg-gray-200">
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <td
                          key={cell.id}
                          className="min-w-[150px] border-white/0 py-3  pr-4"
                        >
                          <Link
                            to={`/app/lendingTerms/${row.original.address}`}
                            state={{ collateralAddress: row.original.collateralAddress, collateralDecimals: row.original.collateralDecimals, openingFee:row.original.openingFee,minBorrow:row.original.minBorrow,borrowRatio:row.original.borrowRatio,callFee:row.original.callFee,interestRate:row.original.interestRate,availableDebt:row.original.availableDebt, currentDebt: row.original.currentDebt  }}
                            className="hover:cursor-pointer"
                          >
                            
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default CheckTable;
const columnHelper = createColumnHelper<lendingTerms>();
