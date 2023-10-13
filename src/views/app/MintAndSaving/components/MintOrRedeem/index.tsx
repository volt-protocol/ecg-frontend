import { jsx } from "@emotion/react";
import { readContract, waitForTransaction, writeContract } from "@wagmi/core";
import { get } from "api/base";
import SpinnerLoader from "components/spinner";
import { creditAbi, profitManager, psmUsdc, termAbi, usdcAbi } from "guildAbi";
import React, { useEffect, useState } from "react";
import { toastError, toastRocket } from "toast";
import {
  DecimalToUnit,
  UnitToDecimal,
  formatCurrencyValue,
  preciseRound,
  signTransferPermit,
} from "utils";
import { Address } from "viem";
import { useAccount } from "wagmi";

function MintOrRedeem() {
  const [valuetoSend, setValuetoSend] = useState<number>(0);
  const [valueToReceive, setValueToReceive] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<number>();
  const [creditBalance, setCreditBalance] = useState<number>();
  const { address, isConnected, isDisconnected } = useAccount();
  const [conversionRate, setConversionRate] = useState<number>(0);
  const [status, setStatus] = useState<string>("Mint");
  const [usdcAvailableToRedeem, setUsdcAvailableToRedeem] = useState<number>(0);

  // borrow function :
  //borrow amount
  // collateral amount
  async function getUsdcBalance(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_USDC_ADDRESS as Address,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [address],
    });
    console.log(DecimalToUnit(result as bigint, 6), "result");
    setUsdcBalance(DecimalToUnit(result as bigint, 6));
  }
  async function getCreditBalance(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
      abi: creditAbi,
      functionName: "balanceOf",
      args: [address],
    });
    console.log(DecimalToUnit(result as bigint, 18), "result");
    setCreditBalance(DecimalToUnit(result as bigint, 18));
  }

  async function getConversionRate(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_PROFIT_MANAGER_ADDRESS as Address,
      abi: profitManager,
      functionName: "creditMultiplier",
    });
    if (status == "Mint") {
      setConversionRate(DecimalToUnit(result as bigint, 18));
    } else {
      setConversionRate(1 / DecimalToUnit(result as bigint, 18));
    }
  }
  async function getUsdcAvailableToRedeem(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_USDC_ADDRESS as Address,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [import.meta.env.VITE_PSM_USDC_ADDRESS as Address],
    });
    setUsdcAvailableToRedeem(DecimalToUnit(result as bigint, 6));
  }

  useEffect(() => {
    getConversionRate();
    getCreditBalance();
    getUsdcBalance();
    getUsdcAvailableToRedeem();
  }, [creditBalance,isConnected]);

  async function mint() {
    try {
      setLoading(true);

      // approve collateral first
      const approve = await writeContract({
        address: import.meta.env.VITE_USDC_ADDRESS as Address,
        abi: usdcAbi,
        functionName: "approve",
        args: [
          import.meta.env.VITE_PSM_USDC_ADDRESS as Address,
          UnitToDecimal(valuetoSend, 6),
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

      const mint = await writeContract({
        address: import.meta.env.VITE_PSM_USDC_ADDRESS as Address,
        abi: psmUsdc,
        functionName: "mint",
        args: [address, UnitToDecimal(valuetoSend, 6)],
      });
      const checkmint = await waitForTransaction({
        hash: mint.hash,
      });

      if (checkmint.status === "success") {
        toastRocket("Transaction has been successful ");
        getCreditBalance();
        setLoading(false);
        return;
      } else toastError("Error with the mint transaction");
      setLoading(false);
    } catch (e) {
      toastError("Error with the mint transaction");
      setLoading(false);
      console.log(e);
    }
  }
  async function redeem() {
    try {
      setLoading(true);

      // approve collateral first
      const approve = await writeContract({
        address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
        abi: creditAbi,
        functionName: "approve",
        args: [
          import.meta.env.VITE_PSM_USDC_ADDRESS as Address,
          UnitToDecimal(valuetoSend, 18),
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

      const redeem = await writeContract({
        address: import.meta.env.VITE_PSM_USDC_ADDRESS as Address,
        abi: psmUsdc,
        functionName: "redeem",
        args: [address, UnitToDecimal(valuetoSend, 18)],
      });
      const checkredeem = await waitForTransaction({
        hash: redeem.hash,
      });

      if (checkredeem.status === "success") {
        toastRocket("Transaction has been successful ");
        getCreditBalance();
        setLoading(false);
        return;
      } else toastError("Error with the redeem transaction");
      setLoading(false);
    } catch (e) {
      toastError("Error with the redeem transaction");
      setLoading(false);
      console.log(e);
    }
  }

  const style = {
    wrapper: `w-screen flex items-center justify-center mt-14 `,
    content: `bg-transparent w-full   rounded-2xl px-4 text-black dark:text-white`,
    formHeader: `px-2 flex items-center justify-between  text-xl`,
    transferPropContainer: `border-[#41444F] bg-transparent my-3 rounded-2xl p-4 text-xl border dark:border-white hover:border-[#41444F]  flex justify-between items-center`,
    transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-2xl  `,
    currencySelector: `flex w-2/4 justify-end `,
    currencySelectorContent: ` w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
    currencySelectorIcon: `flex items-center`,
    currencySelectorTicker: `mx-2`,
    currencySelectorArrow: `text-lg`,
    confirmButton: `mt-5   rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border  hover:border-[#234169] w-full ${
      (status === "Redeem" && valuetoSend > usdcAvailableToRedeem) ||
      valuetoSend === 0
        ? "bg-gray-400 text-gray-700  cursor-default z-10 "
        : "!text-white bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 "
    }}`,
  };

  const handleBorrowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue) && inputValue != "") {
      setValuetoSend(parseFloat(inputValue));
    } else setValuetoSend(0);
  };
  const handleCollatteralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue) && inputValue != "") {
      setValueToReceive(parseFloat(inputValue));
    } else setValuetoSend(0);
  };

  // setBigIntCollateralAmount(BigInt(UnitToDecimal(valuetoSend,collateralDecimals).toString())/BigInt(1e18 *borrowRatio))
  useEffect(() => {
    if (valuetoSend != 0) {
      const valueToReceive: number = Number(
        preciseRound(valuetoSend * conversionRate, 2)
      );
      setValueToReceive(valueToReceive);

    } else {
      setValueToReceive(0);
    }
  }, [valuetoSend]);
  return (
    <>
      <div className="h-full rounded-xl text-black dark:text-white">
        {loading && (
          <div className="absolute h-screen w-full">
            <SpinnerLoader />
          </div>
        )}
        <h2 className="ml-6 text-start text-xl font-semibold text-black dark:text-white ">
          Mint / Redeem
        </h2>
        <div className=" space-y-6">
          <button
            onClick={() => setStatus("Mint")}
            className={`px-6 border-b-4 border-transparent   hover:border-gray-200  ${
              status == "Mint" ? "text-black dark:text-white" : "text-gray-400"
            } `}
          >
            Mint
          </button>
          <button
            onClick={() => setStatus("Redeem")}
            className={`px-6 border-b-4 border-b-transparent hover:border-gray-200  ${
              status == "Redeem"
                ? "text-black dark:text-white"
                : "text-gray-400"
            } `}
          >
            Redeem
          </button>
        </div>
        <div className=" ml-6 mt-8 grid grid-cols-2  ">
          <div className="">
            Your USDC balance :{" "}
            <span className="font-semibold">{usdcBalance?formatCurrencyValue(usdcBalance):"?"}</span>
          </div>
          <div className="">
            Your CREDIT balance :{" "}
            <span className="font-semibold">{creditBalance?formatCurrencyValue(creditBalance):"?"}</span>
          </div>
          <div className=" col-span-2">
            USDC available to redeem :{" "}
            <span className="font-semibold">
              {formatCurrencyValue(usdcAvailableToRedeem)}
            </span>
          </div>
          <div className="col-span-2">
            Conversion rate :{" "}
            <span className="font-semibold">
              {" "}
              {preciseRound(conversionRate, 2)}
            </span>
            {status == "Mint" ?  " USDC / CREDIT" : " CREDIT / USDC"}
          </div>
        </div>

        <div className={style.content}>
          <div className={style.formHeader}>
            {/* <div>Swap your credits to native tokens </div> */}
            <div></div>
          </div>
          <div className={style.transferPropContainer}>
            <input
              className={style.transferPropInput}
              placeholder="0"
              pattern="^[0-9]*[.,]?[0-9]*$"
              value={valuetoSend}
              onChange={handleBorrowChange}
            />

            <div className="w-full">
              {status == "Mint" ? <div className="flex items-center space-x-2"> <img className="h-8"  src="/usd-coin-usdc-logo.png"/><p>USDC amount</p></div> : <div className="flex items-center space-x-2"><img className="h-8"  src="/vite.svg"/><p>CREDIT amount</p> </div>}
            </div>
          </div>
          <div className={style.transferPropContainer}>
            <input
              onChange={handleCollatteralChange}
              value={valueToReceive as number}
              className={style.transferPropInput}
              placeholder="0"
              pattern="^[0-9]*[.,]?[0-9]*$"
            />
            <div className="w-full">
              {status != "Mint" ?<div className="flex items-center space-x-2"> <img className="h-8"  src="/usd-coin-usdc-logo.png"/><p>USDC amount</p></div> : <div className="flex items-center space-x-2"><img className="h-8"  src="/vite.svg"/><p>CREDIT amount</p> </div>}
            </div>
          </div>
          <button
            onClick={status == "Mint" ? mint : redeem}
            className={style.confirmButton + "text-white"}
            disabled={
              (status === "Redeem" && valuetoSend > usdcAvailableToRedeem) ||
              valuetoSend === 0
                ? true
                : false
            }
          >
            {status == "Mint" ? "Mint" : "Redeem"}
          </button>
        </div>
      </div>
    </>
  );
}

export default MintOrRedeem;
