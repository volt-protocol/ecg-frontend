import React, { useEffect, useState } from "react";
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
import {
  DecimalToUnit,
  preciseRound,
  signTransferPermit,
  UnitToDecimal,
} from "utils";
import { toastError, toastRocket } from "toast";
import { LoansObj } from "types/lending";
import SpinnerLoader from "components/spinner";
import { useAccount } from "wagmi";
import axios from "axios";
import TooltipHorizon from "components/tooltip";
import { nameCoinGecko } from "coinGecko";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { Step } from "components/stepLoader/stepType";
import StepModal from "components/stepLoader";

const columnHelper = createColumnHelper<LoansObj>();

function Myloans({
  collateralName,
  tableData,
  smartContractAddress,
  collateralPrice,
  interestRate,
}: {
  collateralName: string;
  tableData: LoansObj[];
  smartContractAddress: string;
  collateralPrice: number;
  interestRate: number;
}) {
  const inputRefs = React.useRef<{
    [key: string]: React.RefObject<HTMLInputElement>;
  }>({});

  // const { account, chainId, provider } = useWeb3React()
  const [values, setValues] = React.useState<{ [key: string]: number }>({});

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [loading, setLoading] = React.useState(false);
  const { address, isConnected, isDisconnected } = useAccount();
  const [creditMultiplier, setCreditMultiplier] = React.useState(0);
  const [showModal, setShowModal] = useState(false);
  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: "Approve", status: "Not Started" },
      { name: "Partial Repay", status: "Not Started" },
    ];

    // if (match) {
    //   baseSteps.splice(1, 1, { name: "Repay", status: "Not Started" });
    // }

    return baseSteps;
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());

  function TableCell({ original }: { original: LoansObj }) {
    const [inputValue, setInputValue] = useState("");
    const [match, setMatch] = useState(false);

    if (!inputRefs.current[original.id]) {
      inputRefs.current[original.id] = React.createRef();
    }

    useEffect(() => {
      setMatch(Number(inputValue) === original.borrowAmount+ original.borrowAmount *interestRate);
    }, [inputValue, original.borrowAmount]);

    return (
      <div className="flex items-center">
        <input
          type="number"
          ref={inputRefs.current[original.id]}
          value={inputValue}
          onChange={(e) => {
            if (Number(e.target.value) > original.borrowAmount + original.borrowAmount *interestRate)
              setInputValue(String(original.borrowAmount+ original.borrowAmount *interestRate));
            else setInputValue(e.target.value);
          }}
          className="mr-2 max-w-[9rem]  rounded-2xl number-spinner-off dark:text-black"
          placeholder="0"
        />
        <button
          onClick={() =>
            match
              ? repay(original.id, original.borrowAmount+ original.borrowAmount *interestRate)
              : partialRepay(original.id)
          }
          className={`min-w-[8rem] rounded-2xl bg-gradient-to-br px-3 py-1 text-white ${
            match
              ? "bg-green-500"
              : " from-[#868CFF] via-[#432CF3] to-brand-500"
          }`}
        >
          {match ? "Repay" : "Partial Repay"}
        </button>
      </div>
    );
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

    getcreditMultiplier();
  }, []);
  let defaultData = tableData;
  const columns = [
    columnHelper.accessor("id", {
      id: "loadId",
      header: "Loan ID",
      cell: (info) => info.getValue().slice(0, 8),
    }),
    {
      id: "ltv",
      header: "LTV",
      cell: (info: any) => {
        return (
          <TooltipHorizon
            extra="dark:text-white"
            content={
              <div className="mt-4 space-y-4 p-2 ">
                <div className="space-y-2">
                  <p>
                    Borrowed CREDIT :{" "}
                    <span className="font-semibold">
                      {" "}
                      {preciseRound(info.row.original.borrowAmount, 2)}{" "}
                    </span>{" "}
                  </p>
                  <p>
                    Borrow Interest :{" "}
                    <span className="font-semibold">
                      <strong> {interestRate} CREDIT</strong>
                    </span>
                  </p>
                  <p>
                    Borrowed Value :{" "}
                    <span className="font-semibold">
                      {" "}
                      {preciseRound(
                        DecimalToUnit(
                          BigInt(
                            info.row.original.borrowAmount * creditMultiplier
                          ),
                          18
                        ),
                        2
                      )}{" "}
                      {collateralName}
                    </span>
                  </p>
                  <p>
                    Borrowed Value :{" "}
                    <span className="font-semibold">
                      {" "}
                      {preciseRound(
                        DecimalToUnit(
                          BigInt(
                            info.row.original.borrowAmount * creditMultiplier
                          ),
                          18
                        ),
                        2
                      )}
                      $
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    Collateral Amount :{" "}
                    <span className="font-semibold">
                      {" "}
                      {info.row.original.collateralAmount}{" "} {collateralName}
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
                      {preciseRound(
                        info.row.original.collateralAmount * collateralPrice,
                        2
                      )}
                      ${" "}
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                <p>Value to Repay : <strong>{preciseRound(info.row.original.borrowAmount +info.row.original.borrowAmount *interestRate,2)} CREDIT</strong></p>
                <p>
                  Price sources : <strong> Coingecko API</strong>
                </p>
                </div>
              </div>
            }
            trigger={
              <div className="absolute left-0 top-0 flex h-full w-full items-center">
                <p>
                  {preciseRound(
                    ((info.row.original.borrowAmount * creditMultiplier) /
                      (1e18 *
                        Number(
                          collateralPrice * info.row.original.collateralAmount
                        ))) *
                      100,
                    2
                  )}
                  %
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
      id: "partialRepay",
      header: "Repay",
      cell: (info: any) => {
        return <TableCell original={info.row.original} />;
      },
    },
  ]; // eslint-disable-next-line
  const [data, setData] = React.useState(() =>
    defaultData.filter(
      (loan) => loan.status !== "closed" && loan.callTime === 0
    )
  );
  useEffect(() => {
    setData(
      defaultData.filter(
        (loan) => loan.status !== "closed" && loan.callTime === 0
      )
    );
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

  function updateStepName(oldName: string, newName: string) {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.name === oldName ? { ...step, name: newName } : step
      )
    );
  }
  

  async function partialRepay(loanId: string) {
    const inputValue = Number(inputRefs.current[loanId].current?.value);

    if (inputValue <= 0 || inputValue === null || inputValue === undefined) {
      setLoading(false);
      return toastError("Please enter a value");
    }
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      );
    };

    try {
      setShowModal(true);
      updateStepStatus("Approve", "In Progress");
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
        updateStepStatus("Approve", "Error");
        return;
      }
      updateStepStatus("Approve", "Success");
    } catch (e) {
      console.log(e);
      updateStepStatus("Approve", "Error");
      return;
    }

    try {
      updateStepStatus("Partial Repay", "In Progress");
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
        updateStepStatus("Partial Repay", "Success");
      } else {
        updateStepStatus("Partial Repay", "Error");
      }
    } catch (e) {
      updateStepStatus("Partial Repay", "Error");
      console.log(e);
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
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      );
    };
    updateStepName("Partial Repay", "Repay");
    try {
      setShowModal(true);
      updateStepStatus("Approve", "In Progress");
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
        updateStepStatus("Approve", "Error");
        return;
      }
      updateStepStatus("Approve", "Success");
    } catch (e) {
      console.log(e);
      updateStepStatus("Approve", "Error");
      return;
    }
    try {
      updateStepStatus("Repay", "In Progress");
      const { hash } = await writeContract({
        address: smartContractAddress,
        abi: termAbi,
        functionName: "repay",
        args: [loanId],
      });

      const checkRepay = await waitForTransaction({
        hash: hash,
      });

      if (checkRepay.status != "success") {
        updateStepStatus("Repay", "Error");
      } 
        updateStepStatus("Repay", "Success");
      
    } catch (e) {
      console.log(e);
      updateStepStatus("Repay", "Error");
    }
  }

  return (
    <Card extra={"w-full h-full px-6 pb-6 sm:overflow-x-auto"}>
         {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}

      <div className="relative flex items-center justify-between pt-4">
        <div className="text-xl font-bold text-navy-700 dark:text-white">
          My Active Loans
        </div>
      </div>
      {!isConnected ? (
        <div className="flex flex-grow items-center justify-center font-semibold text-gray-500 ">
          <p>You need to be connected to see your active loans</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-grow items-center justify-center font-semibold text-gray-500 ">
          {" "}
          <p>You do not have active loans on this term yet</p>
        </div>
      ) : (
        <div className="mt-8 overflow-auto xl:overflow-auto">
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
                            className="relative min-w-[75px] border-white/0 py-3   pr-4 lg:min-w-[69px]  xl:min-w-[90px] 3xl:min-w-[150px]"
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

export default Myloans;
