import React, { useEffect } from 'react'
import { config } from 'wagmiConfig'
import { LoansObj } from 'types/lending'
import {
  CellContext,
createColumnHelper,
flexRender,
getCoreRowModel,
getSortedRowModel,
SortingState,
useReactTable,
} from "@tanstack/react-table";
import Card from 'components/card';
import { waitForTransaction, WaitForTransactionArgs, WaitForTransactionResult, writeContract } from '@wagmi/core';
import { toastError, toastRocket } from 'toast';
import { creditAbi, termAbi, usdcAbi } from 'guildAbi';
import { UnitToDecimal } from 'utils';
import SpinnerLoader from 'components/spinner';

const columnHelper = createColumnHelper<LoansObj>();

function ActiveLoans ({termAddress, activeLoans,callFee,collateralAddress}: {termAddress: string,activeLoans: LoansObj[], callFee: number, collateralAddress: string }) {
 let defaultData = activeLoans
 const [sorting, setSorting] = React.useState<SortingState>([]);
 const [loading, setLoading] = React.useState(false);


async function call(loandId: string, collateralAmount: number){
  try{
  setLoading(true);
  if(callFee > 0){
    const { hash } = await writeContract({
      address: process.env.REACT_APP_CREDIT_ADDRESS,
      abi: creditAbi,
      functionName: "approve",
      args: [termAddress, UnitToDecimal(callFee*collateralAmount, 18) ],
    });
     const checkApprove :WaitForTransactionResult = await waitForTransaction({
      hash: hash,
    });
    if (checkApprove.status != "success") {
      toastError("Approve transaction failed");
      setLoading(false);
      return;
    }
  }

  



  const { hash } = await writeContract({
    address: termAddress,
    abi: termAbi,
    functionName: "call",
    args: [loandId],
  });

  const checkCall = await waitForTransaction({
    hash: hash,
  });

  if (checkCall.status != "success") {
    toastError("Call transaction failed");
    setLoading(false);
    return;
  }
  toastRocket("Call transaction success");

}catch(e){
  toastError("Call transaction failed");
  setLoading(false);
}
}

async function seize(loandId: string){
  try{
    setLoading(true);
  const { hash } = await writeContract({
    address: termAddress,
    abi: termAbi,
    functionName: "seize",
    args: [loandId],
  });

  const checkSeize = await waitForTransaction({
    hash: hash,
  });

  if (checkSeize.status != "success") {
    toastError("Seize transaction failed");
    setLoading(false)
    return;
  }
  toastRocket("Seize transaction success");
}catch(e){
  toastError("Seize transaction failed");
  setLoading(false);
}
}

 const columns = [
  columnHelper.accessor("id", {
    id: "loadId",
    header: "Loan ID",
    cell: (info) => info.getValue().slice(0, 8)
  }),
  columnHelper.accessor("borrowerAddress", {
    id: "borrower",
    header: "borrower",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("collateralAmount", {
    id: "collateralCredit",
    header: "Collateral amount",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("borrowAmount", {
    id: "borrowCredit",
    header: "Credit borrowed",
    cell: (info) => info.getValue().toString(),
  }),


  {
    id: "call",
    header: "Call",
    cell: (info :any) => {
      // if (!inputRefs.current[info.row.original.loadId]) {
      //   inputRefs.current[info.row.original.loadId] = React.createRef();
      // }

      return (
        <div className="flex items-center">
          <button
            onClick={() => call(info.row.original.id, info.row.original.collateralAmount)}
            className="min-w-[8rem] rounded-2xl bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 px-3 py-1 text-white"
          >
            Call
          </button>
        </div>
      );
    },
  },
  {
    id: "seize",
    header: "Seize",
    cell: (info: any) => (
      <button onClick={()=>seize(info.row.original.id)} className="min-w-[8rem] rounded-2xl bg-green-500 px-3 py-1 text-white ">
        Seize
      </button>
    ),
  },
]; // eslint-disable-next-line
const [data, setData] = React.useState(() => defaultData.filter(loan => loan.status !== "closed"));
useEffect(() => {
  setData(defaultData.filter(loan => loan.status !== "closed"));
}, [defaultData]);

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
    <Card extra={"w-full h-full px-6 pb-6 overflow-x-scroll sm:overflow-x-auto"}>
      {loading && (
        <div className="absolute h-screen w-full">
          <SpinnerLoader />
        </div>
      )}
    <div className="relative flex items-center justify-between pt-4">
      <div className="text-xl font-bold text-navy-700 dark:text-white">
        Active Loans
      </div>
    </div>

    <div className="mt-8  xl:overflow-x-scroll h-full">
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
                    <div className="text-gray-black items-center justify-between text-xs ">
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
            .rows.slice(0, 5)
            .map((row) => {
              return (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td
                        key={cell.id}
                        className="min-w-[150px] border-white/0 py-3  pr-4 "
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
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
  )
}

export default ActiveLoans