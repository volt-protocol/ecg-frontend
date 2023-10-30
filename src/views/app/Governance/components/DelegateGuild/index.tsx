import React, { useEffect, useState } from "react";
import {
  Address,
  readContract,
  waitForTransaction,
  writeContract,
} from "@wagmi/core";
import { toastError, toastRocket } from "toast";
import { creditAbi, guildAbi, surplusGuildMinterAbi } from "guildAbi";
import { DecimalToUnit, UnitToDecimal, preciseRound } from "utils";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { Step } from "components/stepLoader/stepType";
import StepModal from "components/stepLoader";
import { Delegatee } from "../..";
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
function DelegateGuild({
  notUsed,
  reloadGuild,
  balance,
  guildReceived,
  userAddress,
  isConnected,
}: {
  notUsed: number;
  reloadGuild: React.Dispatch<React.SetStateAction<boolean>>;
  balance: number;
  guildReceived: number;
  userAddress: string;
  isConnected: boolean;
}) {
  const [value, setValue] = useState<number>();
  const [showModal, setShowModal] = useState(false);
  const [addressValue, setAddressValue] = useState<string>("");
  const [delegatees, setDelegatees] = useState<Delegatee[]>([]);
  const createSteps = (actionType?: "Delegate" | "Undelegate"): Step[] => {
    if (actionType === "Delegate") {
      return [{ name: "Delegate GUILD", status: "Not Started" }];
    } else {
      return [{ name: "Undelegate GUILD", status: "Not Started" }];
    }
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as unknown as number);
    }
  };

  const style = {
    wrapper: `w-screen flex items-center justify-center mt-14 `,
    content: `bg-transparent w-full   rounded-2xl  text-black dark:text-white`,
    formHeader: `px-2 flex items-center justify-between font-semibold text-xl`,
    transferPropContainer: `border-[#41444F] bg-transparent my-3 rounded-2xl p-4 text-xl border dark:border-white hover:border-[#41444F]  flex justify-between items-center`,
    transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-2xl  `,
    currencySelector: `flex w-2/4 justify-end `,
    currencySelectorContent: ` w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
    currencySelectorIcon: `flex items-center`,
    currencySelectorTicker: `mx-2`,
    currencySelectorArrow: `text-lg`,
    confirmButton: ` w-full bg-purple my-2 rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border border-purple hover:border-[#234169]  ${
      value > notUsed ||
      value <= 0 ||
      value == undefined ||
      isAddress(addressValue) === false
        ? "bg-gray-400  text-gray-700 !cursor-default"
        : "bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500  text-white"
    }  `,
  };

  async function getDelegatee(): Promise<string[]> {
    const result = await readContract({
      address: import.meta.env.VITE_GUILD_ADDRESS as Address,
      abi: guildAbi,
      functionName: "delegates",
      args: [userAddress],
    });
    console.log(result, "result");
    return result as string[];
  }

  useEffect(() => {
    const tempDelegatees: Delegatee[] = [];
    async function getDelegateeAndVotes(delegatee: string): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_GUILD_ADDRESS as Address,
        abi: guildAbi,
        functionName: "delegatesVotesCount",
        args: [userAddress, delegatee],
      });
      tempDelegatees.push({
        address: delegatee,
        votes: DecimalToUnit(result as bigint, 18),
      });
      setDelegatees(tempDelegatees);
    }
    if (isConnected) {
      setDelegatees([]);
      getDelegatee().then((result) => {
        result.forEach((delegatee) => {
          getDelegateeAndVotes(delegatee);
        });
      });
    }
  }, [isConnected, notUsed]);

  // faire une fonction qui permet de check si c'est une addresse ethereum valide
  function isAddress(address: string): boolean {
    return /^(0x)?[0-9a-f]{40}$/i.test(address);
  }

  async function handledelegate(): Promise<void> {
    if (value > notUsed) {
      toastError("You can't delegate more than your available GUILD");
      return;
    }
    if (value <= 0) {
      toastError("You can't delegate 0 GUILD");
      return;
    }
    if (addressValue === "") {
      toastError("You must enter an address");
      return;
    }
    if (!isAddress(addressValue)) {
      toastError("You must enter a valid address");
      return;
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
      setSteps(createSteps("Delegate"));
      updateStepStatus("Delegate GUILD", "In Progress");
      const { hash } = await writeContract({
        address: import.meta.env.VITE_GUILD_ADDRESS,
        abi: guildAbi,
        functionName: "incrementDelegation",
        args: [addressValue, UnitToDecimal(value, 18)],
      });

      const checkdelegate = await waitForTransaction({
        hash: hash,
      });

      if (checkdelegate.status != "success") {
        updateStepStatus("Delegate GUILD", "Error");

        return;
      }

      updateStepStatus("Delegate GUILD", "Success");
      reloadGuild(true);
    } catch (e) {
      console.log(e);
      updateStepStatus("Delegate GUILD", "Error");
      toastError("Transaction failed");
    }
  }
  async function Undelegate(address: string, amount: number): Promise<void> {
    setSteps(createSteps("Undelegate"));

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      );
    };
    try {
      setShowModal(true);
      updateStepStatus("Undelegate GUILD", "In Progress");
      const { hash } = await writeContract({
        address: import.meta.env.VITE_GUILD_ADDRESS,
        abi: guildAbi,
        functionName: "undelegate",
        args: [address, UnitToDecimal(amount, 18)],
      });

      const checkdelegate = await waitForTransaction({
        hash: hash,
      });

      if (checkdelegate.status != "success") {
        updateStepStatus("Undelegate GUILD", "Error");

        return;
      }

      updateStepStatus("Undelegate GUILD", "Success");
      reloadGuild(true);
    } catch (e) {
      console.log(e);
      updateStepStatus("Undelegate GUILD", "Error");
      toastError("Transaction failed");
    }
  }
  const columnHelper = createColumnHelper<Delegatee>();
  const columns = [
    columnHelper.accessor("address", {
      id: "delegatee",
      header: "Delegatee",
      cell: (info) => (
        <Link
          className="hover:text-blue-700"
          target="__blank"
          to={`https://sepolia.etherscan.io/address/${info.getValue()}`}
        >
          {info.getValue().slice(0, 4) + "..." + info.getValue().slice(-4)}{" "}
        </Link>
      ),
    }),
    columnHelper.accessor("votes", {
      id: "votes",
      header: "CREDIT Delegated",
      cell: (info) => <p>{info.getValue()}</p>,
    }),
    {
      id: "action",
      header: "Undelegate",
      cell: (info: any) => (
        <button
          onClick={() =>
            Undelegate(info.row.original.address, info.row.original.votes)
          }
          className="text-red-500"
        >
          <FaTimes />
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: delegatees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });
  return (
    <>
      {showModal && (
        <StepModal
          steps={steps}
          close={setShowModal}
          initialStep={createSteps}
          setSteps={setSteps}
        />
      )}
      <div className={style.content}>
        <div className={style.formHeader}></div>
        <div className="my-2 -mt-1 grid grid-cols-2 gap-y-1">
          <p>
            Your GUILD balance :{" "}
            <span className="font-semibold">
              {balance != undefined ? preciseRound(balance, 2) : "?"}
            </span>
          </p>
          <p className="col-span-2">
            Your GUILD available to delegate :{" "}
            {notUsed != undefined ? (
              <>
                <span className="font-semibold">
                  {preciseRound(notUsed, 2)}
                </span>{" "}
                /{" "}
                <span className="font-semibold">
                  {preciseRound(balance, 2)}
                </span>
              </>
            ) : (
              <span className="font-semibold">?</span>
            )}
          </p>
          <p>
            Your GUILD voting weight:{" "}
            <span className="font-semibold">
              {guildReceived != undefined
                ? preciseRound(guildReceived + notUsed, 2)
                : "?"}
            </span>
          </p>
        </div>
        <div className={style.transferPropContainer}>
          <input
            onChange={(e) => setAddressValue(e.target.value as string)}
            value={addressValue as string}
            className={style.transferPropInput}
            placeholder="0x75298410"
          />
          <div className="w-full justify-end text-lg">
            <p>Address to Delegate GUILD</p>
          </div>
        </div>
        <div className={style.transferPropContainer}>
          <input
            onChange={handleInputChange}
            value={value as number}
            className={style.transferPropInput}
            placeholder="0"
            pattern="^[0-9]*[.,]?[0-9]*$"
          />
          <div className="w-full justify-end text-xl">
            <p>GUILD to delegate</p>
          </div>
        </div>
        <button
          onClick={handledelegate}
          disabled={
            value > notUsed ||
            value <= 0 ||
            value == undefined ||
            isAddress(addressValue) === false
              ? true
              : false
          }
          className={`${style.confirmButton} `}
        >
          Delegate GUILD
        </button>
      </div>
      <div>
        <table className="w-full ">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="!border-px !border-gray-400">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pr-4 pt-4 text-start"
                  >
                    <div
                      className={`text-gray-black flex items-center  text-xs ${
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
                        asc: <FaSortDown />,
                        desc: <FaSortUp />,
                        null: <FaSort />,
                      }[header.column.getIsSorted() as string] ?? <FaSort />}
                      {/* Icons for sorting indication */}
                      {/* {
                       
                        header.column.toggleSorting ? (
                          <FaSortDown />
                        ) : (
                          <FaSortUp />
                        )
                      } */}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {!isConnected ? (
            <div className="flex flex-grow items-center justify-center p-10 font-semibold text-gray-500">
              <p className="absolute left-1/2 -translate-x-1/2 transform text-center">
                You have to connect your wallet to see your delegatees
              </p>
            </div>
          ) : delegatees.length === 0 ? (
            <div className="flex flex-grow items-center justify-center p-10 font-semibold text-gray-500">
              <p className="absolute left-1/2 -translate-x-1/2 transform">
                You didn't delegate GUILD
              </p>
            </div>
          ) : (
            <>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="border-whit e/0 relative min-w-[85px] py-3 pr-4 lg:min-w-[90px] xl:min-w-[95px] 3xl:min-w-[150px]"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>
    </>
  );
}

export default DelegateGuild;
