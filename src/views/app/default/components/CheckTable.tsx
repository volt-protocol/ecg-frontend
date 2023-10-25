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
  DecimalToUnit,
  formatCurrencyValue,
  preciseRound,
  secondsToAppropriateUnit,
} from "../../../../utils";
import { Link } from "react-router-dom";
import { lendingTerms, loanObj, LoansObj } from "types/lending";
import Progress from "components/progress";
import { color } from "@chakra-ui/system";
import TooltipHorizon from "components/tooltip";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { guildAbi, termAbi } from "guildAbi";
import { Address, readContract } from "@wagmi/core";

function CheckTable(props: { tableData: lendingTerms[], name: string }) {
  const { tableData,name } = props;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  // const [creditTotalSupply, setCreditTotalSupply] = React.useState<number>(0);
  // const [gaugeWeight, setGaugeWeight] = React.useState<number>(0);
  // const [totalWeight, setTotalWeight] = React.useState<number>(0);

  let defaultData = tableData;
  const navigation = useNavigate();

  useEffect(() => {
    async function fetchDataForTerms() {
        const enrichedTableData = await Promise.all(
            tableData.map(async (term) => {
                const [gaugeWeight, totalWeight, creditTotalSupply, currentDebt] = await Promise.all([
                    getGaugeWeightForTerm(term),
                    getTotalWeightForTerm(term),
                    getCreditTotalSupplyForTerm(),
                    getCurrentDebt(term)
                ]);

                // Add these values to your term
                return {
                    ...term,
                    gaugeWeight,
                    totalWeight,
                    creditTotalSupply,
                    currentDebt
                };
            })
        );

        setData(enrichedTableData);
    }

    fetchDataForTerms();
}, [tableData]);

async function getGaugeWeightForTerm(term: lendingTerms): Promise<number> {
    const result = await readContract({
        address: import.meta.env.VITE_GUILD_ADDRESS as Address,
        abi: guildAbi,
        functionName: "getGaugeWeight",
        args: [term.address], // Assuming each term has a unique contractAddress
    });
    return Number(DecimalToUnit(result as bigint, 18));
}

async function getTotalWeightForTerm(term: lendingTerms): Promise<number> {
    const result = await readContract({
        address: import.meta.env.VITE_GUILD_ADDRESS as Address,
        abi: guildAbi,
        functionName: "totalTypeWeight",
        args: [1],
    });
    return Number(DecimalToUnit(result as bigint, 18));
}

async function getCreditTotalSupplyForTerm(): Promise<number> {
    const result = await readContract({
        address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
        abi: guildAbi,
        functionName: "totalSupply",
        args: [],
    });
    return Number(DecimalToUnit(result as bigint, 18));
}
async function getCurrentDebt(term:lendingTerms): Promise<number> {
  const result = await readContract({
    address: term.address as Address,
    abi: termAbi,
    functionName: "issuance",
  });
  return(Number(DecimalToUnit(result as bigint, 18)));
}




  
  const columns = [
    columnHelper.accessor("collateral", {
      id: "name",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">Name</p>
      ),
      cell: (info: any) => (
        <div className="flex items-center">
          

          <p className="ml-3 text-sm font-bold text-navy-700 dark:text-white">
            {info.row.original.collateral}-
            {info.row.original.interestRate * 100}%-
            {preciseRound(
              info.row.original.borrowRatio,
              info.row.original.borrowRatio >= 1 ? 0 : 2
            )}
          </p>
        </div>
      ),
    }),
    {
      id: "usage",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">Usage</p>
      ),
      cell: (info: any) =>{
      const debtCeilling = (info.row.original.creditTotalSupply*(info.row.original.gaugeWeight/info.row.original.totalWeight))*1.2
      return (
        <>
        <TooltipHorizon
          extra="dark:text-white  "
          content={
            <>
              <p>
                Current Debt:{" "}
                <span className="font-bold">
                  {" "}
                  {formatCurrencyValue(
                    parseFloat(preciseRound(info.row.original.currentDebt, 2))
                  )}
                </span>
              </p>
              <p>
                Available Debt:{" "}
                <span className="font-bold">
                  {" "}
                  {formatCurrencyValue(
                    parseFloat(preciseRound(debtCeilling -info.row.original.currentDebt, 2))
                  )}
                </span>
              </p>
              <p>
                Debt Ceilling:{" "}
                <span className="font-bold">
                
                  {formatCurrencyValue(
                    parseFloat(
                      preciseRound(
               debtCeilling,
                        2
                      )
                    )
                  )}
                </span>
              </p>
            </>
          }
          trigger={
            <div className="absolute left-0 top-0 flex h-full w-full items-center">
              <Progress
                width="w-[108px]"
                value={
                  (info.row.original.currentDebt /
                    (info.row.original.currentDebt +
                      debtCeilling -info.row.original.currentDebt)) *
                  100
                }
                color="purple"
              />
              <div className="mb-2 ml-1">
                <AiOutlineQuestionCircle color="gray" />
              </div>
            </div>
          }
          placement="right"
        />
        </>
      );
    },
    },

    columnHelper.accessor("interestRate", {
      id: "interestRate",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Interest Rate
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {preciseRound(info.getValue() * 100, 2)}%
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
          {preciseRound(
            info.getValue(),
            info.row.original.borrowRatio >= 1 ? 0 : 2
          )}
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
          {preciseRound(info.getValue() * 100, 2)}%
        </p>
      ),
    }),

    columnHelper.accessor("maxDelayBetweenPartialRepay", {
      id: "maxDelayBetweenPartialRepay",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Periodic Payments
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-navy-700 dark:text-white">
          {/* {secondsToAppropriateUnit(info.getValue())} */}
          {info.getValue() != 0 ? (
            <div>
              Yes{" "}
              <TooltipHorizon
                extra="dark:text-white w-[300px] "
                content={
                  <>
                    <p>
                      Minimum periodic repayment :{" "}
                      <span className="font-semibold">
                        {" "}
                        {preciseRound(
                          info.row.original.minPartialRepayPercent * 100000,
                          2
                        )}{" "}
                        CREDIT every{" "}
                        {secondsToAppropriateUnit(
                          info.row.original.maxDelayBetweenPartialRepay
                        )}{" "}
                        per 100K CREDIT borrowed{" "}
                      </span>
                    </p>
                    <p>
                      As a borrower, if you miss periodic repayments, your loan
                      will be called
                    </p>
                  </>
                }
                trigger={
                  <div className="">
                    <AiOutlineQuestionCircle color="gray" />
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
  ]; // eslint-disable-next-line
  const [data, setData] = React.useState<lendingTerms[]>([]);

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
  const navigateToDetails = (row: any) => {
    navigation(`/app/lendingTerms/${row.original.address}`);
  };

  return (
    <Card extra={"w-full h-full sm:overflow-auto px-6 pb-6"}>
      <header className="relative flex items-center justify-between pt-4">
        <div className="text-xl font-bold text-navy-700 dark:text-white">
         {name}
        </div>

        {/* <CardMenu /> */}
      </header>

      <div className="mt-8 overflow-auto xl:overflow-auto">
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
                  <tr
                    key={row.id}
                    onClick={() => navigateToDetails(row)}
                    className="hover:cursor-pointer hover:bg-gray-300"
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <td
                          key={cell.id}
                          className="relative min-w-[150px] border-white/0 py-3  pr-4"
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
