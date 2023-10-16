import React, { useState } from "react";
import { waitForTransaction, writeContract } from "@wagmi/core";
import { toastError, toastRocket } from "toast";
import { creditAbi, guildAbi, surplusGuildMinterAbi } from "guildAbi";
import { UnitToDecimal, preciseRound } from "utils";
import DefaultSpinner from "components/spinner";
import SpinnerLoader from "components/spinner";



function Delegate({
  used,
  textButton,
  balance,

}: {
  used: number;
  textButton: string;
  balance: number;

}) {
  const [value, setValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [walletAddressToDelegate, setWalletAddressToDelegate] = useState<string>("");
  const [addressValue, setAddressValue] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as unknown as number);
    }
  };

  const style = {
    wrapper: `w-screen flex items-center justify-center mt-14 `,
    content: `bg-transparent w-full   rounded-2xl px-4 text-black dark:text-white`,
    formHeader: `px-2 flex items-center justify-between font-semibold text-xl`,
    transferPropContainer: `border-[#41444F] bg-transparent my-3 rounded-2xl p-4 text-xl border dark:border-white hover:border-[#41444F]  flex justify-between items-center`,
    transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-2xl  `,
    currencySelector: `flex w-2/4 justify-end `,
    currencySelectorContent: ` w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
    currencySelectorIcon: `flex items-center`,
    currencySelectorTicker: `mx-2`,
    currencySelectorArrow: `text-lg`,
    confirmButton: ` w-full bg-purple my-2 rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border border-purple hover:border-[#234169]  ${(balance-used<=0 && textButton ==="Delegate") ||(value>used && textButton ==="Undelegate") ? "bg-gray-400  text-gray-700 !cursor-default" :"bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500  text-white"}  `,
  };

  async function handledelegate(): Promise<void> {
    try {
      setLoading(true);
      if (textButton === "delegate") {
    
          const { hash } = await writeContract({
            address: import.meta.env.VITE_GUILD_ADDRESS,
            abi: guildAbi,
            functionName: "delegate",
            args: [addressValue],
          });

          const checkdelegate = await waitForTransaction({
            hash: hash,
          });

          if (checkdelegate.status != "success") {
            toastError("delegate transaction failed");
            setLoading(false);
            return;
          }

          toastRocket(`delegate transaction successful`);
          setLoading(false);
        }else if (textButton === "UnDelegate") {
        if ((value as number) > used) {
          toastError("Not enough CREDIT allocated");
          setLoading(false);
          return;
        } else {
          const { hash } = await writeContract({
            address: import.meta.env.VITE_GUILD_ADDRESS,
            abi: guildAbi,
            functionName: "unDelegate",
            args: [addressValue, UnitToDecimal(value, 18)],
          });

          const checkUnDelegate = await waitForTransaction({
            hash: hash,
          });

          if (checkUnDelegate.status != "success") {
            toastError("UnDelegate transaction failed");
            setLoading(false);
            return;
          }

          toastRocket(`UnDelegate transaction successful`);
          setLoading(false);
        }
      }
    } catch (e) {
      console.log(e);
      toastError("Transaction failed");
      setLoading(false);
    }
  }
  return (
    <>
      {loading && (
        <div className="absolute h-screen w-full">
          <SpinnerLoader />
        </div>
      )}
      <div className={style.content}>
        <div className={style.formHeader}></div>
        <div className="my-2 grid grid-cols-2 -mt-1 gap-y-1">
          <p className="font-semibold col-span-2">
            Your GUILD balance:{" "}
            <span className="font-semibold">{balance!=undefined?preciseRound(balance,2):"?"}</span>{" "}
          </p>
          <p className="font-semibold col-span-2">
          Your GUILD available to delegate :{" "}
          {used!=undefined?(
          <>
          <span className="font-semibold">{preciseRound(balance-used,2)}</span>{" "}/
          <span className="font-semibold">{preciseRound(balance,2)}</span>{" "}
          </> ):<span className="font-semibold">?</span>}
          </p>
        </div>
        <div className={style.transferPropContainer}>
            <input
              onChange={(e)=>setAddressValue(e.target.value as string)}
              value={addressValue as string}
              className={style.transferPropInput}
              placeholder="0x75298410"
            />
            <div className="w-full justify-end text-lg">
                <p>Address to {textButton==="UnDelegate"?"Undelegate":"Delegate"} GUILD</p>
            </div>
          </div>
        {textButton === "UnDelegate" ? (
          <div className={style.transferPropContainer}>
            <input
              onChange={handleInputChange}
              value={value as number}
              className={style.transferPropInput}
              placeholder="0"
              pattern="^[0-9]*[.,]?[0-9]*$"
            />
            <div className="w-full justify-end text-lg">
              {textButton === "UnDelegate" ? (
                <p>GUILD to unDelegate</p>
              ) : (
                <p> </p>
              )}
            </div>
          </div>
        ) : (
          <></>
        )}
        <button onClick={handledelegate} disabled={(balance-used<=0 && textButton ==="Delegate") ||(value>used && textButton ==="Undelegate") ?true:false} className={`${style.confirmButton} `}>
          {textButton === "delegate" ? "delegate" : "UnDelegate"}
        </button>
      </div>
    </>
  );
}

export default Delegate;
