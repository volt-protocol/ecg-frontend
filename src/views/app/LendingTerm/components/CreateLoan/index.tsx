import { waitForTransaction, writeContract } from "@wagmi/core";
import { creditAbi, termAbi, usdcAbi } from "guildAbi";
import React, { useEffect, useState } from "react";
import { toastError, toastRocket } from "toast";
import { UnitToDecimal, signTransferPermit } from "utils";
import { keccak256 } from "viem";
import { useSignMessage } from "wagmi";

function CreateLoan({
  owner,
  contractAddress,
  collateralAddress,
  collateralDecimals,
  openingFee,
  minBorrow,
  borrowRatio,
  callFee,
  interestRate,
  availableDebt,
}: {
  owner: string;
  contractAddress: string;
  collateralAddress: string;
  collateralDecimals: number;
  openingFee: number;
  minBorrow: number;
  borrowRatio: number;
  callFee: number;
  interestRate: number;
  availableDebt: number;
}) {
  const [borrowAmount, setBorrowAmount] = useState<number>(0);
  const [collateralAmount, setCollateralAmount] = useState<number>(0);
  const [minCollateralAmount, setMinCollateralAmount] = useState<number>(0);
  const [permitMessage, setPermitMessage] = useState("");
  

  // borrow function :
  //borrow amount
  // collateral amount

  async function borrow() {
    //check ratio
    if (collateralAmount < minCollateralAmount) {
      toastError(
        `Collateral amount can't be below than ${minCollateralAmount} `
      );
      return;
    }
    if (borrowAmount > availableDebt) {
      toastError(
        `the max borrow amount is ${availableDebt} `
      );
      return;
    }
    // approve collateral first
    const approve = await writeContract({
      address: collateralAddress,
      abi: usdcAbi,
      functionName: "approve",
      args: [contractAddress, UnitToDecimal(collateralAmount, collateralDecimals)],
    });

    const checkApprove = await waitForTransaction({
      hash: approve.hash,
    });

    if (checkApprove.status != "success") {
      toastError("Approve transaction failed");
      return;
    }

    // check si il y a un  open fees ==> approve credit
    console.log(openingFee,"openingFee")
    if (openingFee > 0) {
      const approveCredit = await writeContract({
        address: process.env.REACT_APP_CREDIT_ADDRESS,
        abi: creditAbi,
        functionName: "approve",
        args: [contractAddress, UnitToDecimal(collateralAmount * openingFee, 18)],
      });
      const checkApproveCredit = await waitForTransaction({
        hash: approveCredit.hash,
      });

      if (checkApproveCredit.status != "success") {
        toastError("You don't have enough credit");
        return;
      }
    }
      // appeller la function
      const borrow = await writeContract({
        address: contractAddress,
        abi: termAbi,
        functionName: "borrow",
        args: [UnitToDecimal(borrowAmount,18), UnitToDecimal(collateralAmount ,18)],
      });
      const checkBorrow = await waitForTransaction({
        hash: borrow.hash,
      });

      if (checkBorrow.status === "success") {
        toastRocket('transaction has been successfull ')
        return;
      }
      else
      toastError("erreur with the borrow transaction")
  }


  const style = {
    wrapper: `w-screen flex items-center justify-center mt-14 `,
    content: `w-full  rounded-2xl p-4 text-white`,
    formHeader: `px-2 flex items-center justify-between font-semibold text-xl`,
    transferPropContainer: `bg-transparent my-3 rounded-2xl p-4 text-xl border border-white hover:border-[#41444F]  flex justify-between items-center`,
    transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-2xl `,
    currencySelector: `flex w-2/4 justify-end `,
    currencySelectorContent: `w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
    currencySelectorIcon: `flex items-center`,
    currencySelectorTicker: `mx-2`,
    currencySelectorArrow: `text-lg`,
    confirmButton: `bg-purple my-2 rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border border-purple hover:border-[#234169]`,
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

  useEffect(() => {
    setCollateralAmount(borrowAmount + borrowAmount * (1 - borrowRatio) + borrowAmount*callFee);
    setMinCollateralAmount(borrowAmount + borrowAmount * (1 - borrowRatio) + borrowAmount*callFee);
  }, [borrowAmount]);
  return (
    <>
      <div className="rounded-xl bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 text-white">
        <h2 className="mt-6 text-center text-3xl font-bold">New Loan</h2>
        <div className="mt-14 grid grid-cols-2  font-semibold ml-6 ">
          <div className="flex">Available Debt : {Math.round(availableDebt)}</div>
          <div className="flex">Open Fees : {openingFee}</div>
          <div className="flex">Min Borrow : {minBorrow}</div>
          <div className="flex">Borrow Ratio : {borrowRatio}</div>
          <div className="flex">Call Fee: {callFee}</div>
          <div className="flex">Interest Rate : {interestRate}</div>
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
          <div onClick={borrow} className={style.confirmButton}>
            Borrow
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateLoan;
