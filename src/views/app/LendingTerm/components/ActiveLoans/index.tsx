import React, { useEffect } from "react";
import { config } from "wagmiConfig";
import { LoansObj } from "types/lending";
import {
  CellContext,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import Card from "components/card";
import {
  Address,
  readContract,
  waitForTransaction,
  WaitForTransactionArgs,
  WaitForTransactionResult,
  writeContract,
} from "@wagmi/core";
import { toastError, toastRocket } from "toast";
import { creditAbi, guildAbi, profitManager, termAbi, usdcAbi } from "guildAbi";
import { DecimalToUnit, preciseRound, secondsToAppropriateUnit, UnitToDecimal } from "utils";
import SpinnerLoader from "components/spinner";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import TooltipHorizon from "components/tooltip";
import { nameCoinGecko } from "coinGecko";
import axios from "axios";
import { AiOutlineQuestionCircle } from "react-icons/ai";

const columnHelper = createColumnHelper<LoansObj>();

function ActiveLoans({
  termAddress,
  activeLoans,
  callFee,
  collateralAddress,
  collateralName,
  maxDelayBetweenPartialRepay,
}: {
  termAddress: string;
  activeLoans: LoansObj[];
  callFee: number;
  collateralAddress: string;
  collateralName: string;
  maxDelayBetweenPartialRepay: number;
}) {
  let defaultData = activeLoans;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [loading, setLoading] = React.useState(false);
  const { address, isConnected } = useAccount();

  const [creditMultiplier, setCreditMultiplier] = React.useState(0);
  const [collateralPrice, setCollateralPrice] = React.useState(0);
  const [isGauge, setIsGauge] = React.useState(false);
  // const [isRepayPassed, setIsRepayPassed] = React.useState(false);
  const [repays, setRepays] = React.useState<Record<string, number>>({});

  function CallableButton({ original }: { original: LoansObj }) {
    const [isCallable, setIsCallable] = React.useState(true);
    useEffect(() => {
      async function isCallable() {
        const isGauge = await readContract({
          address: import.meta.env.VITE_GUILD_ADDRESS as Address,
          abi: guildAbi,
          functionName: "isGauge",
          args: [termAddress],
        });
        setIsGauge(isGauge as boolean);
        const termRepayDelayPassed = await readContract({
          address: termAddress as Address,
          abi: termAbi,
          functionName: "partialRepayDelayPassed",
          args: [original.id],
        });
        // setIsRepayPassed(termRepayDelayPassed as boolean);
        if (isGauge && !termRepayDelayPassed) {
          setIsCallable(false);
        }
      }
      isCallable();
    }, []);

    return (
      <div className="flex items-center">
        <button
          onClick={() => call(original.id, original.collateralAmount)}
          disabled={isCallable}
          className={`min-w-[8rem] rounded-2xl  px-3 py-1 text-white ${
            isCallable
              ? "bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500"
              : "bg-gray-500 text-gray-700"
          } `}
        >
          Call
        </button>
      </div>
    );
  }
  async function lastPartialRepay(id: string): Promise<number> {
    const response = await readContract({
      address: termAddress as Address,
      abi: termAbi,
      functionName: "lastPartialRepay",
      args: [id],
    });
    return Number(response);
  }

  async function call(loandId: string, collateralAmount: number) {
    try {
      setLoading(true);
      if (callFee > 0) {
        const { hash } = await writeContract({
          address: import.meta.env.VITE_CREDIT_ADDRESS,
          abi: creditAbi,
          functionName: "approve",
          args: [termAddress, UnitToDecimal(callFee * collateralAmount, 18)],
        });
        const checkApprove: WaitForTransactionResult = await waitForTransaction(
          {
            hash: hash,
          }
        );
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
    } catch (e) {
      toastError("Call transaction failed");
      setLoading(false);
    }
  }
  async function callMany() {
    try{
    setLoading(true);
    const responde = await writeContract({
      address: termAddress,
      abi: termAbi,
      functionName: "callMany",
      args: [data.map((loan) => loan.id)],
    });
    const checkCall = await waitForTransaction({
      hash: responde.hash,
    });
    if (checkCall.status != "success") {
      toastError("Call transaction failed");
      setLoading(false);
      return;
    }
    setLoading(false);
    toastRocket("Call transaction success");
  }
  catch(e){
    setLoading(false);
    toastError("Call transaction failed");
  }
  }

  useEffect(() => {
    async function getcreditMultiplier() {
      const creditMultiplier = await readContract({
        address: import.meta.env.VITE_PROFIT_MANAGER_ADDRESS,
        abi: profitManager,
        functionName: "creditMultiplier",
      });

      setCreditMultiplier(Number(creditMultiplier));
    }
   

    async function getCollateralPrice() {
      //requête axios en post vers coinmarketcap avec sort au name et limit à 1.
      const nameCG = nameCoinGecko.find(
        (name) => name.nameECG === collateralName
      )?.nameCG;
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${nameCG}&vs_currencies=usd`,
        {}
      );
      setCollateralPrice(response.data[nameCG].usd);
    }

    getcreditMultiplier();
    getCollateralPrice();
  }, []);
  useEffect(() => {
    const fetchRepays = async () => {
      const newRepays: Record<string, number> = {};
      for (let loan of activeLoans) {
        newRepays[loan.id] = await lastPartialRepay(loan.id);
      }
      setRepays(newRepays);
    };

    fetchRepays();
  }, [activeLoans]);

  useEffect(() => {
    const fetchRepays = async () => {
      const newRepays: Record<string, number> = {};
      for (let loan of activeLoans) {
        newRepays[loan.id] = await lastPartialRepay(loan.id);
      }
      setRepays(newRepays);
    };

    fetchRepays();
  }, [activeLoans]);

  const columns = [
    columnHelper.accessor("id", {
      id: "loadId",
      header: "Loan ID",
      cell: (info) => info.getValue().slice(0, 8),
    }),
    columnHelper.accessor("borrowerAddress", {
      id: "borrower",
      header: "Borrower",
      cell: (info) => (
        <Link
          className="hover:text-blue-700"
          target="__blank"
          to={`https://sepolia.etherscan.io/address/${address}`}
        >
          {info.getValue().slice(0, 4) + "..." + info.getValue().slice(-4)}{" "}
        </Link>
      ),
    }),
    {
      id: "ltv",
      header: "LTV",
      cell: (info: any) => {
        return (
          <TooltipHorizon
            extra="dark:text-white"
            content={
              <div className="space-y-2 p-2">
                <p>
                  Collateral Amount :{" "}
                  <span className="font-semibold">
                    {" "}
                    {info.row.original.collateralAmount}{" "}
                  </span>
                </p>
                <p>
                  CREDIT Borrowed :{" "}
                  <span className="font-semibold">
                    {" "}
                    {info.row.original.borrowAmount}{" "}
                  </span>{" "}
                </p>
                <p>
                  Collateral Price:{" "}
                  <span className="font-semibold"> {collateralPrice} $</span>
                </p>
                <p>
                  Collateral Value :{" "}
                  <span className="font-semibold">
                    {" "}
                    {preciseRound(
                      info.row.original.collateralAmount * collateralPrice,
                      2
                    )}
                    ${" "}
                  </span>
                </p>
                <p>
                  Value Borrowed :{" "}
                  <span className="font-semibold">
                    {" "}
                    {DecimalToUnit(
                      BigInt(info.row.original.borrowAmount * creditMultiplier),
                      18
                    )}
                    $
                  </span>
                </p>
              </div>
            }
            trigger={
              <div className="flex ">
                <p>
                {preciseRound(
                    (info.row.original.borrowAmount * creditMultiplier) /
                      (1e18 * Number(collateralPrice*info.row.original.collateralAmount)),
                    2
                  )}
                </p>
                <div className="mb-2 ml-1">
                <AiOutlineQuestionCircle color="gray" />
              </div>
              </div>
            }
            placement="right"
          />
        );
      },
    },
    {
      id: "nextPaymentDue",
      header: "Next Payment Due",
      cell: (info: any) => {
        const isOverdue=Date.now()/1000-
        (repays[info.row.original.id] +
        maxDelayBetweenPartialRepay)
        return (
          <>
            <p>
              { maxDelayBetweenPartialRepay === 0
                ? "n/a"
                :isOverdue  < 0? "Overdue":secondsToAppropriateUnit(isOverdue)  }
            </p>
          </>
        );
      },
    },

    {
      id: "call",
      header: "Call",
      cell: (info: any) => {
        // if (!inputRefs.current[info.row.original.loadId]) {
        //   inputRefs.current[info.row.original.loadId] = React.createRef();
        // }

        return <CallableButton original={info.row.original} />;
      },
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

  return (
    <Card extra={"w-full h-full px-6 pb-6 overflow-auto sm:overflow-x-auto"}>
      {loading && (
        <div className="absolute h-screen w-full">
          <SpinnerLoader />
        </div>
      )}
      <div className="relative flex items-center justify-between pt-4">
        <div className="text-xl font-bold text-navy-700 dark:text-white">
          Active Loans
        </div>
        <div>
          <button
            disabled={isGauge || data.length===0}
            onClick={callMany}
            className={`cursor-default rounded-2xl px-4 py-1 font-semibold text-white ${
              isGauge || data.length===0
                ? " bg-gray-500"
                : " bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 "
            } `}
          >
            Call all
          </button>
        </div>
      </div>

      {defaultData.length === 0 ? (
        <div className="flex flex-grow items-center justify-center font-semibold text-gray-500 ">
          {" "}
          <p>There are no active loans on this term yet</p>
        </div>
      ):(

      <div className="mt-8  h-full xl:overflow-auto">
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
                      <div
                        className={`text-gray-black items-center justify-between text-xs ${
                          header.id === "loadId" || header.id === "borrower"
                            ? "font-mono"
                            : ""
                        } `}
                      >
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
      )}
    </Card>
  );
}

export default ActiveLoans;
