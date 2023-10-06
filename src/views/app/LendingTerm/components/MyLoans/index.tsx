import React, { useEffect } from "react";
import Card from "components/card";
import {
  CellContext,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import Progress from "components/progress";
import {
  readContract,
  waitForTransaction,
  WaitForTransactionArgs,
  writeContract,
  WriteContractResult,
} from "@wagmi/core";
import { creditAbi, profitManager, termAbi } from "guildAbi";
import { preciseRound, signTransferPermit, UnitToDecimal } from "utils";
import { toastError, toastRocket } from "toast";
import { LoansObj } from "types/lending";
import SpinnerLoader from "components/spinner";
import { useAccount } from "wagmi";
import axios from "axios";

const columnHelper = createColumnHelper<LoansObj>();


function Myloans(props: {
  collateralName: string;
  tableData: LoansObj[];
  smartContractAddress: string;
}) {
  const inputRefs = React.useRef<{
    [key: string]: React.RefObject<HTMLInputElement>;
  }>({});

  // const { account, chainId, provider } = useWeb3React()
  const [values, setValues] = React.useState<{ [key: string]: number }>({});
  const { tableData, smartContractAddress,collateralName } = props;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [loading, setLoading] = React.useState(false);
  const { address, isConnected, isDisconnected } = useAccount();
  const [creditMultiplier, setCreditMultiplier] = React.useState(0);


useEffect(() => {
  async function getcreditMultiplier() {
    const creditMultiplier  = await readContract({
      address: import.meta.env.VITE_PROFIT_MANAGER_ADDRESS,
      abi: profitManager,
      functionName: "creditMultiplier",
    });
    setCreditMultiplier(Number(creditMultiplier));
    console.log(creditMultiplier);
  }
  async function getCollateralPrice() {
    //requête axios en post vers coinmarketcap avec sort au name et limit à 1.

    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': "9cf5dd6e-43b1-42ff-993c-91f6f08e81d8",
        'Access-Control-Allow-Origin': '*',
      },
      params:{
          symbol: 'USDC'
      }
    });
    console.log(response,"collateralPrice")
  }
  getcreditMultiplier();
  getCollateralPrice();
}, []);

  let defaultData = tableData;
  const columns = [
    columnHelper.accessor("id", {
      id: "loadId",
      header: "Loan ID",
      cell: (info) => info.getValue().slice(0, 8),
    }),
    // columnHelper.accessor("collateralAmount", {
    //   id: "collateralAmount",
    //   header: "Collateral Amount",
    //   cell: (info) => preciseRound(parseFloat(info.getValue().toString()),2),
    // }),
    // columnHelper.accessor("borrowAmount", {
    //   id: "borrowCredit",
    //   header: "Credit Borrowed",
    //   cell: (info) => preciseRound(parseFloat(info.getValue().toString()),2),
    // }),
    {
      id: "ltv",
      header:"Loan Health",
      cell: (info: any) => {
        return (
          <p>
            {info.row.original.borrowAmount* creditMultiplier / 1e18 * 1}
            
          </p>
        );
      },
    },
    {
      id: "partialRepay",
      header: "Partial Repay",
      cell: (info: any) => {
        if (!inputRefs.current[info.row.original.id]) {
          inputRefs.current[info.row.original.id] = React.createRef();
        }

        return (
          <div className="flex items-center">
            <input
              ref={inputRefs.current[info.row.original.id]}
              type="number"
              className="mr-2 rounded-2xl  number-spinner-off dark:text-black"
              placeholder="0"
            />
            <button
              onClick={() => partialRepay(info.row.original.id)}
              className="min-w-[8rem] rounded-2xl bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 px-3 py-1 text-white"
            >
              Partial Repay
            </button>
          </div>
        );
      },
    },
    {
      id: "fullRepay",
      header: "Repay",
      cell: (info: any) => (
        <button
          onClick={() =>
            repay(info.row.original.id, info.row.original.borrowAmount)
          }
          className="min-w-[8rem] rounded-2xl bg-green-500 px-3 py-1 text-white "
        >
          Repay
        </button>
      ),
    },
  ]; // eslint-disable-next-line
  const [data, setData] = React.useState(() =>
    defaultData.filter((loan) => loan.status !== "closed")
  );
  useEffect(() => {
    setData(defaultData.filter((loan) => loan.status !== "closed"));
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

  async function partialRepay(loanId: string) {
    setLoading(true);
    const inputValue = Number(inputRefs.current[loanId].current?.value);

    if (inputValue <= 0 || inputValue === null || inputValue === undefined) {
      setLoading(false);
      return toastError("Please enter a value");
    }

    try {
      const approve = await writeContract({
        address: import.meta.env.VITE_CREDIT_ADDRESS,
        abi: creditAbi,
        functionName: "approve",
        args: [smartContractAddress, UnitToDecimal(inputValue, 18)],
      });

      const data = await waitForTransaction({
        hash: approve.hash,
      });

      if (data.status != "success") {
        setLoading(false);
        return toastError("You don't have enough credit");
      }

      const { hash } = await writeContract({
        address: smartContractAddress,
        abi: termAbi,
        functionName: "partialRepay",
        args: [loanId, UnitToDecimal(inputValue, 18)],
      });

      const checkPartialPay = await waitForTransaction({
        hash: hash,
      });

      if (checkPartialPay.status === "success") {
        setLoading(false);
        toastRocket("Transaction success");
      } else {
        setLoading(false);
        toastError("Transaction failed");
      }
    } catch (e) {
      setLoading(false);
      toastError("Transaction failed");
      console.log(e)
    }
  }

  async function partialRepayWithPermit(loanId: string) {
    const inputValue = inputRefs.current[loanId].current?.value;

    if (inputValue && /^\d*$/.test(inputValue)) {
      const valueToRepay = Number(inputValue);
      if (valueToRepay === 0) return toastError("Please enter a value");

      const { r, s, v, deadline } = await signTransferPermit(valueToRepay);

      const { hash } = await writeContract({
        address: smartContractAddress,
        abi: termAbi,
        functionName: "partialRepayWithPermit",
        args: [
          loanId,
          UnitToDecimal(valueToRepay, 18),
          deadline,
          { v: v, r: r, s: s },
        ],
      });
    }
  }

  async function repay(loanId: string, borrowCredit: number) {
    try {
      setLoading(true);

      const approve = await writeContract({
        address: import.meta.env.VITE_CREDIT_ADDRESS,
        abi: creditAbi,
        functionName: "approve",
        args: [smartContractAddress, UnitToDecimal(borrowCredit, 18)],
      });

      const data = await waitForTransaction({
        hash: approve.hash,
      });

      if (data.status != "success") {
        setLoading(false);
        return toastError("You don't have enough credit");
      }

      const { hash } = await writeContract({
        address: smartContractAddress,
        abi: termAbi,
        functionName: "repay",
        args: [loanId],
      });

      const checkRepay = await waitForTransaction({
        hash: hash,
      });

      if (checkRepay.status === "success") {
        toastRocket("Transaction success");
        setLoading(false);
      } else toastError("Repay transaction failed");
    } catch (e) {
      toastError("Transaction failed");
      console.log(e); 
      setLoading(false);
    }
  }

  return (
    <Card extra={"w-full h-full px-6 pb-6 sm:overflow-x-auto"}>
      {loading && (
        <div className="absolute h-screen w-full">
          <SpinnerLoader />
        </div>
      )}

      <div className="relative flex items-center justify-between pt-4">
        <div className="text-xl font-bold text-navy-700 dark:text-white">
          My Active Loans
        </div>
      </div>
      {!isConnected? (<div className="flex flex-grow justify-center items-center text-gray-500 font-semibold "><p >You need to be connected to see your active loans</p></div>):(
        defaultData.length === 0 ? (
          <div className="flex flex-grow justify-center items-center text-gray-500 font-semibold "> <p>You do not have active loans on this term yet</p></div>
      ):(
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
      ))}
    </Card>
  );
}

export default Myloans;
