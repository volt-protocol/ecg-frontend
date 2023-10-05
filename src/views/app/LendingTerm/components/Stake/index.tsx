import React, { useState } from "react";
import { waitForTransaction, writeContract } from "@wagmi/core";
import { toastError, toastRocket } from "toast";
import { creditAbi, surplusGuildMinterAbi } from "guildAbi";
import { UnitToDecimal } from "utils";
import DefaultSpinner from "components/spinner";
import SpinnerLoader from "components/spinner";



function Stake({
  allocatedCredit,
  textButton,
  availableCredit,
  termAddress,
  interestRate,
}: {
  allocatedCredit: number;
  textButton: string;
  availableCredit: number;
  termAddress: string;
  interestRate: number;
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
    confirmButton: ` w-full bg-purple my-2 rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border border-purple hover:border-[#234169]  ${(allocatedCredit ==0 && textButton ==="Unstake") || (value>availableCredit && textButton ==="stake") ? "bg-gray-400  text-gray-700 !cursor-default" :"bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500  text-white"}  `,
  };

  async function handlestake(): Promise<void> {
    try {
      setLoading(true);
      if (textButton === "stake") {
        if (value == 0) {
          toastError("Please enter a value");
          setLoading(false);
          return;
        }
        if ((value as number) > availableCredit) {
          toastError("Not enough CREDIT");
          setLoading(false);
          return;
        } else {
          const approve = await writeContract({
            address: import.meta.env.VITE_CREDIT_ADDRESS,
            abi: creditAbi,
            functionName: "approve",
            args: [
              import.meta.env.VITE_SURPLUS_GUILD_MINTER_ADDRESS,
              UnitToDecimal(value, 18),
            ],
          });

          const checkApprove = await waitForTransaction({
            hash: approve.hash,
          });

          if (checkApprove.status != "success") {
            toastError("Approve transaction failed");
            setLoading(false);
            return;
          }
          const { hash } = await writeContract({
            address: import.meta.env.VITE_SURPLUS_GUILD_MINTER_ADDRESS,
            abi: surplusGuildMinterAbi,
            functionName: "stake",
            args: [termAddress, UnitToDecimal(value, 18)],
          });

          const checkStake = await waitForTransaction({
            hash: hash,
          });

          if (checkStake.status != "success") {
            toastError("Stake transaction failed");
            setLoading(false);
            return;
          }

          toastRocket(`Stake transaction successful`);
          setLoading(false);
        }
      } else if (textButton === "Unstake") {
        if ((value as number) > allocatedCredit) {
          toastError("Not enough CREDIT allocated");
          setLoading(false);
          return;
        } else {
          const { hash } = await writeContract({
            address: import.meta.env.VITE_SURPLUS_GUILD_MINTER_ADDRESS,
            abi: surplusGuildMinterAbi,
            functionName: "unstake",
            args: [termAddress],
          });

          const checkUnstake = await waitForTransaction({
            hash: hash,
          });

          if (checkUnstake.status != "success") {
            toastError("Unstake transaction failed");
            setLoading(false);
            return;
          }

          toastRocket(`Unstake transaction successful`);
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
            Your CREDIT staked:{" "}
            <span className="text-xl">{allocatedCredit}</span>{" "}
          </p>
          <p className="font-semibold col-span-2">
            CREDIT in your wallet :{" "}
            <span className="text-xl">{availableCredit}</span>{" "}
          </p>
          {/* <p className="font-semibold">
            Current interest rate:{" "}
            <span className="text-xl">{interestRate * 100 + "%"}</span>{" "}
          </p> */}
        </div>
        {textButton === "stake" ? (
          <div className={style.transferPropContainer}>
            <input
              onChange={handleInputChange}
              value={value as number}
              className={style.transferPropInput}
              placeholder="0"
              pattern="^[0-9]*[.,]?[0-9]*$"
            />
            <div className="w-full justify-end text-xl">
              {textButton === "stake" ? (
                <p>CREDIT to stake</p>
              ) : (
                <p> </p>
              )}
            </div>
          </div>
        ) : (
          <></>
        )}
        {textButton === "stake" ? (
          <>
            {/* <p>Estimated credits {value * interestRate} yearly</p>
            <p>Estimated guilds per year</p> */}
          </>
        ) : (
          <></>
        )}
        <button onClick={handlestake} disabled={(allocatedCredit==0 && textButton ==="Unstake") ||(value>availableCredit && textButton ==="stake") ?true:false} className={`${style.confirmButton} `}>
          {textButton === "stake" ? "Stake" : "Unstake"}
        </button>
      </div>
    </>
  );
}

export default Stake;
