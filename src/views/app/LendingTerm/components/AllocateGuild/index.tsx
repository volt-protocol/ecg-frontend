import React, { useEffect, useState } from "react";
import { Address, readContract, waitForTransaction, writeContract } from "@wagmi/core";
import { guildAbi } from "guildAbi";
import { DecimalToUnit, UnitToDecimal, formatCurrencyValue, preciseRound } from "utils";
import { toastError, toastRocket } from "toast";
import SpinnerLoader from "components/spinner";
import { useAccount } from "wagmi";



function AllocateGuild({
  textButton,
  allocatedGuild,
  availableGuild,
  smartContractAddress,
  currentDebt,
  availableDebt,
  gaugeWeight,
  totalWeight,
  creditTotalSupply,
}: {
  textButton: string;
  allocatedGuild: number;
  availableGuild: number;
  smartContractAddress: string;
  currentDebt: number;
  availableDebt: number;
  gaugeWeight: number;
  totalWeight: number;
  creditTotalSupply: number;
}) {
  const [value, setValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
 

  const { address, isConnected, isDisconnected } = useAccount();

  const style = {
    wrapper: `w-screen flex  items-center justify-center mt-14 `,
    content: `bg-transparent w-full   rounded-2xl px-4 text-black dark:text-white`,
    formHeader: `px-2 flex items-center justify-between font-semibold text-xl`,
    transferPropContainer: `bg-transparent my-3 rounded-2xl p-4 text-xl border dark:border-white border-[#41444F] hover:border-[#41444F]  flex justify-between items-center`,
    transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-2xl   `,
    currencySelector: `flex w-2/4 justify-end `,
    currencySelectorContent: `w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
    currencySelectorIcon: `flex items-center`,
    currencySelectorTicker: `mx-2`,
    currencySelectorArrow: `text-lg`,
    confirmButton: ` w-full bg-purple my-2 rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border border-purple hover:border-[#234169] ${((value> availableGuild || value<=0)&& textButton=="Increment") || ((value > allocatedGuild || value <=0) && textButton=='Decrement') ? "bg-gray-400  text-gray-700 !cursor-default" :"bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500  text-white"}  `,
  };

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
         toastError("Not enough guild");
         return ;
        } else {
          const { hash } = await writeContract({
            address: import.meta.env.VITE_GUILD_ADDRESS,
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
          toastRocket(`Your GUILD have been staked`);
          setLoading(false);
        }
      } else if (textButton === "Decrement") {
        if ((value as number) > allocatedGuild) {
          toastError("Not enough GUILD allocated");
          setLoading(false);
          return;
        } else {
          const { hash } = await writeContract({
            address: import.meta.env.VITE_GUILD_ADDRESS,
            abi: guildAbi,
            functionName: "decrementGauge",
            args: [smartContractAddress, UnitToDecimal(value, 18)],
          });
          const checkUnstack = await waitForTransaction({
            hash: hash,
          });
          if (checkUnstack.status != "success") {
            toastError("Unstake transaction failed");
            setLoading(false);
            return;
          }
          toastRocket(`Your GUILD have been unstaked`);
          setLoading(false);
        }
      }
    } catch (e) {
      toastError("Transaction failed");
      console.log(e);
      setLoading(false);
    }
  }

  


 function getDebtCeileingIncrease():string {
  const percentBefore = gaugeWeight/totalWeight;
  const percentAfter = (gaugeWeight+Number(value))/(totalWeight);
  const debCeilingBefore = creditTotalSupply*percentBefore *1.2;
  const debCeilingAfter = creditTotalSupply*percentAfter *1.2;
  const debtCeilingIncrease = debCeilingAfter - debCeilingBefore;
  return formatCurrencyValue(Number(preciseRound(debtCeilingIncrease,2)));

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
        <p className=" col-span-2">
          Your current GUILD staked :{" "}
          <span className="font-semibold">{allocatedGuild}</span>{" "}
        </p>
        <p className=" col-span-2">
          Your available GUILD :{" "}
          <span className="font-semibold">{availableGuild}</span>{" "}
        </p>
      </div>
      <div className={style.transferPropContainer}>
        <input
          
          onChange={handleInputChange}
          value={value as number}
          className={style.transferPropInput   }
          placeholder="0"
          pattern="^[0-9]*[.,]?[0-9]*$"
        />
        <div className="w-full justify-end text-xl">
          {textButton === "Increment" ? (
            <p> GUILD to stake</p>
          ) : (
            <p> GUILD to unstake</p>
          )}
        </div>
      </div>
      {textButton === "Increment" ? (
        <>
        
          <p>Your GUILD stake will allow {getDebtCeileingIncrease()} more CREDIT to be borrowed from this term </p>
        </>
      ) : (
        <>
          <p>Your GUILD unstake will decrease the borrow capacity on this term by {value} CREDIT</p>
        </>
      )}
      <button onClick={handleVote} className={style.confirmButton} disabled={(value> availableGuild && textButton=="Increment")||(value>allocatedGuild && textButton=='Decrement') || value<=0? true:false } >
        {textButton === "Increment" ? "Stake" : "Unstake"}
      </button>
    </div>
  );
}

export default AllocateGuild;
