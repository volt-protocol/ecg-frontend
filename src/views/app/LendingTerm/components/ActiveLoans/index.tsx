import React, { useEffect, useState } from "react";
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
import {
  DecimalToUnit,
  preciseRound,
  secondsToAppropriateUnit,
  UnitToDecimal,
} from "utils";
import SpinnerLoader from "components/spinner";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import TooltipHorizon from "components/tooltip";
import { nameCoinGecko } from "coinGecko";
import axios from "axios";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { Step } from "components/stepLoader/stepType";
import StepModal from "components/stepLoader";

const columnHelper = createColumnHelper<LoansObj>();

function ActiveLoans({
  termAddress,
  activeLoans,
  collateralName,
  maxDelayBetweenPartialRepay,
  interestRate,
}: {
  termAddress: string;
  activeLoans: LoansObj[];
  collateralAddress: string;
  collateralName: string;
  maxDelayBetweenPartialRepay: number;
  interestRate: number;
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
  const [showModal, setShowModal] = useState(false);
  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: "Call", status: "Not Started" },
     
    ];

    // if (match) {
    //   baseSteps.splice(1, 1, { name: "Repay", status: "Not Started" });
    // }

    return baseSteps;
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());

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
          disabled={isCallable?false:true}
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
  function updateStepName(oldName: string, newName: string) {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.name === oldName ? { ...step, name: newName } : step
      )
    );
  }
  
  async function call(loandId: string, collateralAmount: number) {
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      );
    };
      if (isConnected == false) {
        toastError("Please connect your wallet");
        setLoading(false);
        return;
      }
      try {
      setShowModal(true);
      updateStepStatus("Call", "In Progress");  
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
        updateStepStatus("Call", "Error");
        return;
      }
      updateStepStatus("Call", "Success");
    } catch (e) {
      console.log(e)
      updateStepStatus("Call", "Error");
    }
  }
  async function callMany() {
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      );
    };
    updateStepName("Call", "Call Many");
    try {
      updateStepStatus("Call Many", "In Progress");
      if (isConnected == false) {
        toastError("Please connect your wallet");
        setLoading(false);
        return;
      }
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
        updateStepStatus("Call Many", "Error");
        return;
      }
      updateStepStatus("Call Many", "Success");
    } catch (e) {
      console.log(e);
      updateStepStatus("Call Many", "Error");
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
        const LTV = preciseRound(
          (info.row.original.borrowAmount * creditMultiplier) /
            (1e18 *
              Number(
                collateralPrice * info.row.original.collateralAmount
              ))*100,
          2
        )
        const borrowCredit =preciseRound(info.row.original.borrowAmount,2)
        const borrowValue = preciseRound(DecimalToUnit(
          BigInt(info.row.original.borrowAmount * creditMultiplier),
          18
        ),2)
        const collateralValue = preciseRound(
          info.row.original.collateralAmount * collateralPrice,
          2
        )
        return (
          <TooltipHorizon
            extra="dark:text-white"
            content={
              <div className="space-y-4 p-2 mt-4 ">
              <div className="space-y-2">
                <p>
                   Borrowed CREDIT :{" "}
                  <span className="font-semibold">
                    {" "}
                    {borrowCredit}{" "}
                  </span>{" "}
                </p>
                <p>
                   Borrow Interest :{" "}
                  <span className="font-semibold">
                    <strong>
                    {" "}
                    {interestRate}
                    {" "}
                    CREDIT
                    </strong>
                  </span>
                </p>
                <p>
                   Borrowed Value :{" "}
                  <span className="font-semibold">
                    {" "}
                    {borrowValue}
                    {" "}{collateralName}
                  </span>
                </p>
                <p>
                   Borrowed Value :{" "}
                  <span className="font-semibold">
                    {" "}
                    {borrowValue}
                    $
                  </span>
                </p>
                </div>
                <div className="space-y-2">
                <p>
                  Collateral Amount :{" "}
                  <span className="font-semibold">
                    {" "}
                    {(info.row.original.collateralAmount)}{" "} {collateralName}  
                  </span>
                </p>
                <p>
                  Collateral Price:{" "}
                  <span className="font-semibold"> {collateralPrice} $</span>
                </p>
                <p>
                  Collateral Value :{" "}
                  <span className="font-semibold">
                    {" "}
                    {collateralValue}
                    ${" "}
                  </span>
                </p>
                </div>
                <p>Price sources : <strong> Coingecko API</strong></p>
              </div>
            }
            trigger={
              <div className="flex ">
                <p>
                  {LTV == "0.00"?"-.--":LTV}%
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
        const currentDateInSeconds = Date.now() / 1000;
        const sumOfTimestamps =
          repays[info.row.original.id] + maxDelayBetweenPartialRepay;
          console.log(maxDelayBetweenPartialRepay,"maxDelayBetweenPartialRepay")
        return (
          <>
            <p>
              {maxDelayBetweenPartialRepay === 0
                ? "n/a"
                :Number.isNaN(sumOfTimestamps)?"--" :
                sumOfTimestamps < currentDateInSeconds
                ? "Overdue"
                : secondsToAppropriateUnit(
                    sumOfTimestamps - currentDateInSeconds
                  )}
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
    setData(defaultData.filter((loan) => loan.status !== "closed" && loan.callTime === 0));
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
         {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
      <div className="relative flex items-center justify-between pt-4">
        <div className="text-xl font-bold text-navy-700 dark:text-white">
          Active Loans : {data.length}
        </div>
        <div>
          <button
            disabled={isGauge || data.length === 0}
            onClick={callMany}
            className={`cursor-default rounded-2xl px-4 py-1 font-semibold text-white ${
              isGauge || data.length === 0
                ? " bg-gray-500"
                : " bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 "
            } `}
          >
            Call all
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-grow items-center justify-center font-semibold text-gray-500 ">
          {" "}
          <p>There are no active loans on this term yet</p>
        </div>
      ) : (
        <div className="mt-8  h-full xl:overflow-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="!border-px !border-gray-400"
                >
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
