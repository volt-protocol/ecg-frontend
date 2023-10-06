import { readContract, waitForTransaction, writeContract } from "@wagmi/core";
import SpinnerLoader from "components/spinner";
import { creditAbi, termAbi, usdcAbi } from "guildAbi";
import React, { useEffect, useState } from "react";
import { toastError, toastRocket } from "toast";
import { DecimalToUnit, UnitToDecimal, formatCurrencyValue, preciseRound, signTransferPermit } from "utils";
import { Address } from "viem";
import { useAccount } from "wagmi";

function CreateLoan({
  name,
  contractAddress,
  collateralAddress,
  collateralDecimals,
  openingFee,
  minBorrow,
  borrowRatio,
  currentDebt,
  availableDebt,
}: {
  name: string;
  contractAddress: string;
  collateralAddress: string;
  collateralDecimals: number;
  openingFee: number;
  minBorrow: number;
  borrowRatio: number;
  callFee: number;
  currentDebt: number;
  availableDebt: number;
}) {
  const [borrowAmount, setBorrowAmount] = useState<number>(0);
  const [collateralAmount, setCollateralAmount] = useState<number>(0);
  const [minCollateralAmount, setMinCollateralAmount] = useState<number>(0);
  // const [bigIntCollateralAmount, setBigIntCollateralAmount] = useState<BigInt>(BigInt(0));
  const [permitMessage, setPermitMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [collateralAmountAvailable, setCollateralAmountAvailable] = useState<number>(0);
  const { address, isConnected, isDisconnected } = useAccount();

  // borrow function :
  //borrow amount
  // collateral amount

  useEffect(() => {
    async function getCollateralAmountAvailable(): Promise<void> {
      const result = await readContract({
        address: collateralAddress as Address,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [address],
      });
      console.log(DecimalToUnit(result as bigint, collateralDecimals),"result");
      setCollateralAmountAvailable(DecimalToUnit(result as bigint, collateralDecimals));
    }
    getCollateralAmountAvailable();
  } , []);

  async function borrow() {
    try {
      //check ratio
      if (borrowAmount < minBorrow) {
        toastError(
          `Borrow amount can't be below than ${minBorrow} `
        );
        return;
      }
      if (borrowAmount > availableDebt) {
        toastError(`The max borrow amount is ${availableDebt} `);
        return;
      }

      if(borrowAmount < minBorrow){
        toastError(`The min borrow amount is ${minBorrow} `);
        return;
      }

      setLoading(true);

      // approve collateral first
      const approve = await writeContract({
        address: collateralAddress,
        abi: usdcAbi,
        functionName: "approve",
        args: [
          contractAddress,
          UnitToDecimal(collateralAmount, collateralDecimals),
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

      // check si il y a un  open fees ==> approve credit
      if (openingFee > 0) {
        const approveCredit = await writeContract({
          address: import.meta.env.VITE_CREDIT_ADDRESS,
          abi: creditAbi,
          functionName: "approve",
          args: [contractAddress, UnitToDecimal(borrowAmount * openingFee, 18)],
        });
        const checkApproveCredit = await waitForTransaction({
          hash: approveCredit.hash,
        });

        if (checkApproveCredit.status != "success") {
          toastError("You don't have enough CREDIT");
          setLoading(false);
          return;
        }
      }

      const borrow = await writeContract({
        address: contractAddress,
        abi: termAbi,
        functionName: "borrow",
        args: [
          UnitToDecimal(borrowAmount, 18),
          UnitToDecimal(collateralAmount, collateralDecimals),
        ],
      });
      const checkBorrow = await waitForTransaction({
        hash: borrow.hash,
      });

      if (checkBorrow.status === "success") {
        toastRocket("Transaction has been successful ");
        setLoading(false);
        return;
      } else toastError("Error with the borrow transaction");
      setLoading(false);
    } catch (e) {
      toastError("Error with the borrow transaction");
      setLoading(false);
      console.log(e);
    }
  }

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
    confirmButton: `mt-5   rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border  hover:border-[#234169] w-full ${borrowAmount < minBorrow && borrowAmount !=0 ? "bg-gray-400 text-gray-700  cursor-default z-10 " : "!text-white bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 "}}`,
  };
  

  const handleBorrowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue) && inputValue != "") {
      setBorrowAmount(parseFloat(inputValue));
    } else setBorrowAmount(0);
  };
  const handleCollatteralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue) && inputValue != "") {
      setCollateralAmount(parseFloat(inputValue));
    } else setBorrowAmount(0);
  };

  // setBigIntCollateralAmount(BigInt(UnitToDecimal(borrowAmount,collateralDecimals).toString())/BigInt(1e18 *borrowRatio))
  useEffect(() => {
    const collateralAmount: number = Number(preciseRound(
      borrowAmount / borrowRatio,
      collateralDecimals
    ));
    setCollateralAmount(collateralAmount);
    setMinCollateralAmount(collateralAmount);
  }, [borrowAmount]);
  return (
    <>
      <div className="rounded-xl h-full text-black dark:text-white">
        {loading && (
            <div className="absolute h-screen w-full">
              <SpinnerLoader />
            </div>
   
        )}
        <h2 className="mt-6 text-center text-3xl font-bold ">New Loan</h2>
        <div className="ml-6 mt-8 grid  grid-cols-2 font-semibold ">
        <div className="flex">Current Debt : {formatCurrencyValue(currentDebt)}</div>
          <div className="flex">
            Available Debt : {formatCurrencyValue(availableDebt)}
          </div>
          <div className="flex">Open Fee : {preciseRound(openingFee *100,2)} %</div>
          <div className="flex">Min Borrow : {minBorrow}</div>
          <div className="col-span-2">Borrow Ratio : {preciseRound(borrowRatio,2)} CREDIT / {name}</div>
        </div>
        
        <div className={style.content}>
          
          <div className={style.formHeader}>
          <div className="col-span-2">Your {name} Balance : {preciseRound(collateralAmountAvailable,2)} {name}</div>
            {/* <div>Swap your credits to native tokens </div> */}
            <div></div>
          </div>
          <div className={style.transferPropContainer}>
            <input
              className={style.transferPropInput}
              placeholder="0"
              pattern="^[0-9]*[.,]?[0-9]*$"
              value={borrowAmount}
              onChange={handleBorrowChange}
            />

            <div className="w-full">Borrow amount</div>
          </div>
          <div className={style.transferPropContainer}>
            <input
              onChange={handleCollatteralChange}
              value={collateralAmount as number}
              className={style.transferPropInput}
              placeholder="0"
              pattern="^[0-9]*[.,]?[0-9]*$"
            />
            <div className="w-full">Collateral amount</div>
          </div>
          <button onClick={borrow} className={style.confirmButton + "text-white"} disabled={borrowAmount < minBorrow ? true : false}>
            Borrow
          </button>
        </div>
      </div>
    </>
  );
}

export default CreateLoan;
