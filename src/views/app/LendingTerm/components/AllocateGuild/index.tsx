import React, { useState } from "react";
import { waitForTransaction, writeContract } from "@wagmi/core";
import { guildAbi } from "guildAbi";
import { UnitToDecimal } from "utils";
import { toastError, toastRocket } from "toast";
import SpinnerLoader from "components/spinner";

const style = {
  wrapper: `w-screen flex  items-center justify-center mt-14 `,
  content: `bg-transparent w-full   rounded-2xl px-4 text-white`,
  formHeader: `px-2 flex items-center justify-between font-semibold text-xl`,
  transferPropContainer: `bg-transparent my-3 rounded-2xl p-4 text-xl border border-white hover:border-[#41444F]  flex justify-between items-center`,
  transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-2xl  `,
  currencySelector: `flex w-2/4 justify-end `,
  currencySelectorContent: `w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
  currencySelectorIcon: `flex items-center`,
  currencySelectorTicker: `mx-2`,
  currencySelectorArrow: `text-lg`,
  confirmButton: `bg-purple my-2 rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border border-purple hover:border-[#234169]`,
};

function AllocateGuild({
  textButton,
  allocatedGuild,
  availableGuild,
  smartContractAddress,
}: {
  textButton: string;
  allocatedGuild: number;
  availableGuild: number;
  smartContractAddress: string;
}) {
  const [value, setValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as unknown as number);
    }
  };

  async function handleVote(): Promise<void> {
    try {
      if (value == 0) {
        toastError("Please enter a value");
        return;
      }
      setLoading(true);
      if (textButton === "Increment") {
        if ((value as number) > availableGuild) {
          setLoading(false);
         toastError("not enough guild");
         return ;
        } else {
          const { hash } = await writeContract({
            address: process.env.REACT_APP_GUILD_ADDRESS,
            abi: guildAbi,
            functionName: "incrementGauge",
            args: [smartContractAddress, UnitToDecimal(value, 18)],
          });
          const checkAllocate = await waitForTransaction({
            hash: hash,
          });
          if (checkAllocate.status != "success") {
            toastError("Allocate transaction failed");
            setLoading(false);
            return;
          }
          toastRocket(`Your guilds have been stacked`);
          setLoading(false);
        }
      } else if (textButton === "Decrement") {
        if ((value as number) > allocatedGuild) {
          toastError("not enough guild allocated");
          setLoading(false);
          return;
        } else {
          const { hash } = await writeContract({
            address: process.env.REACT_APP_GUILD_ADDRESS,
            abi: guildAbi,
            functionName: "decrementGauge",
            args: [smartContractAddress, UnitToDecimal(value, 18)],
          });
          const checkUnstack = await waitForTransaction({
            hash: hash,
          });
          if (checkUnstack.status != "success") {
            toastError("Unstack transaction failed");
            setLoading(false);
            return;
          }
          toastRocket(`Your guilds have been unstacked`);
          setLoading(false);
        }
      }
    } catch (e) {
      toastError("transaction failed");
      console.log(e);
      setLoading(false);
    }
  }

  return (
    <div className={style.content}>
      {loading && (
        <div className="absolute h-screen w-full">
          <SpinnerLoader />
        </div>
      )}
      <div className={style.formHeader}></div>
      <div className="my-2 grid grid-cols-2">
        <p className="font-semibold">
          Your current guilds stacked :{" "}
          <span className="text-xl">{allocatedGuild}</span>{" "}
        </p>
        <p className="font-semibold">
          Your available guilds :{" "}
          <span className="text-xl">{availableGuild}</span>{" "}
        </p>
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
          {textButton === "Increment" ? (
            <p> Guilds you want to stack</p>
          ) : (
            <p> Guild you want to unstack</p>
          )}
        </div>
      </div>
      {textButton === "Increment" ? (
        <>
          <p>Your guilds will increase the buffer cap by {value}</p>
          <p>Estimated credit/guild yearly</p>
        </>
      ) : (
        <>
          <p>Your guilds will decrease the buffer cap by {value}</p>
          <br />
        </>
      )}
      <div onClick={handleVote} className={style.confirmButton}>
        {textButton === "Increment" ? "Stake" : "Unstake"}
      </div>
    </div>
  );
}

export default AllocateGuild;
