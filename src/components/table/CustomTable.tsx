import { Table, flexRender } from "@tanstack/react-table"
import clsx from "clsx"
import Spinner from "components/spinner"
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa"
import { MdChevronLeft, MdChevronRight } from "react-icons/md"

export default function CustomTable<T>({
  table,
  withNav,
  onRowClick,
  variant = "sm",
}: {
  table: Table<T>
  withNav?: boolean
  onRowClick?: (row: any) => void
  variant?: "sm" | "md" | "lg"
}) {
  const getVariant = () => {
    switch (variant) {
      case "sm":
        return {
          font: "text-sm",
        }
      case "md":
        return {
          font: "text-md",
        }
      case "lg":
        return {
          font: "text-lg",
        }
      default:
        return "text-sm"
    }
  }

  return (
    <>
      <div className="overflow-auto">
        <table className="mt-4 w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="!border-px !border-gray-400">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pt-4 text-center text-start dark:border-gray-400"
                  >
                    <div className="flex items-center justify-center">
                      <p className="text-sm font-medium text-gray-500 dark:text-white">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </p>
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
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              return (
                <tr
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  key={row.id}
                  className="border-b border-gray-100 transition-all duration-150 ease-in-out last:border-none hover:cursor-pointer hover:bg-gray-50 dark:border-gray-500 dark:hover:bg-navy-700"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={clsx(
                        getVariant(),
                        "relative min-w-[85px] border-white/0 py-2 text-center text-gray-700 dark:text-gray-200"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {withNav && (
        <nav
          className="flex w-full items-center justify-between border-t border-gray-200 px-2 py-3 text-gray-400"
          aria-label="Pagination"
        >
          <div className="hidden sm:block">
            <p className="text-sm ">
              Showing page{" "}
              <span className="font-medium">
                {table.getState().pagination.pageIndex + 1}
              </span>{" "}
              of <span className="font-semibold">{table.getPageCount()}</span>
            </p>
          </div>
          <div className="flex flex-1 justify-between sm:justify-end">
            <button
              onClick={() => table.previousPage()}
              className="relative inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
              disabled={!table.getCanPreviousPage()}
            >
              <MdChevronLeft />
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              className="relative ml-3 inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
              disabled={!table.getCanNextPage()}
            >
              Next
              <MdChevronRight />
            </button>
          </div>
        </nav>
      )}
    </>
  )
}
