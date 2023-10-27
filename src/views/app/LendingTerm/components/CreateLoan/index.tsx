import { readContract, waitForTransaction, writeContract } from "@wagmi/core";
import SpinnerLoader from "components/spinner";
import StepModal from "components/stepLoader";
import { Step } from "components/stepLoader/stepType";
import { creditAbi, profitManager, termAbi, usdcAbi } from "guildAbi";
import React, { useEffect, useState } from "react";
import { MdOutlineError } from "react-icons/md";
import { toastError, toastRocket } from "toast";
import {
  DecimalToUnit,
  UnitToDecimal,
  addOneToLastDecimalPlace,
  formatCurrencyValue,
  preciseCeil,
  preciseRound,
  secondsToAppropriateUnit,
  signTransferPermit,
} from "utils";
import { Address } from "viem";
import { useAccount } from "wagmi";
import moment from 'moment';
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
  maxDelayBetweenPartialRepay,
  reload
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
  maxDelayBetweenPartialRepay: number;
  reload: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [borrowAmount, setBorrowAmount] = useState<number>(0);
  const [collateralAmount, setCollateralAmount] = useState<number>(0);
  const [minCollateralAmount, setMinCollateralAmount] = useState<number>(0);
  const [permitMessage, setPermitMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [collateralAmountAvailable, setCollateralAmountAvailable] =
    useState<number>(0);
  const { address, isConnected, isDisconnected } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [preciseBorrowRatio, setPreciseBorrowRatio] = useState<bigint>(
    BigInt(0)
  );
  const [minToRepay, setMinToRepay] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<moment.Moment | null>(null);
  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: `Approve ${name}`, status: "Not Started" },
      { name: "Borrow", status: "Not Started" },
    ];

    if (openingFee > 0) {
      baseSteps.splice(1, 0, { name: "Approve CREDIT", status: "Not Started" });
    }

    return baseSteps;
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());

  useEffect(() => {
    async function getCollateralAmountAvailable(): Promise<void> {
      const result = await readContract({
        address: collateralAddress as Address,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setCollateralAmountAvailable(
        DecimalToUnit(result as bigint, collateralDecimals)
      );
    }
    getCollateralAmountAvailable();
  }, [isConnected]);

  async function borrow() {
    if (isConnected == false) {
      toastError("Please connect your wallet");
      setLoading(false);
      return;
    }

    //check ratio
    if (borrowAmount < minBorrow) {
      toastError(`Borrow amount can't be below than ${minBorrow} `);
      return;
    }
    if (borrowAmount > availableDebt) {
      toastError(`The max borrow amount is ${availableDebt} `);
      return;
    }
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      );
    };
    setShowModal(true);
    updateStepStatus(`Approve ${name}`, "In Progress");
    // approve collateral first
    try {
      const approve = await writeContract({
        address: collateralAddress,
        abi: usdcAbi,
        functionName: "approve",
        args: [contractAddress, UnitToDecimal(collateralAmount,collateralDecimals)>preciseBorrowRatio?UnitToDecimal(collateralAmount,collateralDecimals):preciseBorrowRatio],
      });
      const checkApprove = await waitForTransaction({
        hash: approve.hash,
      });

      if (checkApprove.status != "success") {
        updateStepStatus(`Approve ${name}`, "Error");
        setLoading(false);
        return;
      }
    } catch (e) {
      console.log(e);
      updateStepStatus(`Approve ${name}`, "Error");
      return;
    }

    updateStepStatus(`Approve ${name}`, "Success");

    // check si il y a un  open fees ==> approve credit
    if (openingFee > 0) {
      updateStepStatus("Approve CREDIT", "In Progress");
      try {
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
          updateStepStatus("Approve CREDIT", "Error");
          return;
        }
        updateStepStatus("Approve CREDIT", "Success");
      } catch (e) {
        console.log(e);
        updateStepStatus("Approve CREDIT", "Error");
        return;
      }
    }

    updateStepStatus("Borrow", "In Progress");
    try {
      const borrow = await writeContract({
        address: contractAddress,
        abi: termAbi,
        functionName: "borrow",
        args: [UnitToDecimal(borrowAmount, 18), preciseBorrowRatio],
      });
      const checkBorrow = await waitForTransaction({
        hash: borrow.hash,
      });

      if (checkBorrow.status === "success") {
        reload(true);
        updateStepStatus("Borrow", "Success");
        return;
      } else updateStepStatus("Borrow", "Error");
    } catch (e) {
      console.log(e);
      updateStepStatus("Borrow", "Error");
      return;
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
    confirmButton: `mt-2 mb-2  rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border  hover:border-[#234169] w-full ${
      borrowAmount < minBorrow
        ? "bg-gray-400 text-gray-700  cursor-default z-10 "
        : "!text-white bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 "
    }}`,
  };

  const handleBorrowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*\.?\d*$/.test(inputValue) && inputValue != "") {
      setBorrowAmount(parseFloat(inputValue));
    } else setBorrowAmount(0);
  };
  const handleCollatteralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*\.?\d*$/.test(inputValue) && inputValue != "") {
      setCollateralAmount(parseFloat(inputValue));
    } else setBorrowAmount(0);
  };

  async function getPrecicseBorrowRatio() {
    const borrowRatio = await readContract({
      address: contractAddress as Address,
      abi: termAbi,
      functionName: "maxDebtPerCollateralToken",
    });

    const creditMultiplier = await readContract({
      address: import.meta.env.VITE_PROFIT_MANAGER_ADDRESS as Address,
      abi: profitManager,
      functionName: "creditMultiplier",
    });
    const preciseBorrowRatio =
      BigInt(1) +
      (BigInt(borrowAmount) * BigInt(1e18) * (creditMultiplier as bigint)) /
        (borrowRatio as bigint);
    setPreciseBorrowRatio(preciseBorrowRatio);
  }

    async function getMinToRepay() {
      const minToRepay = await readContract({
        address: contractAddress as Address,
        abi: termAbi,
        functionName: "minPartialRepayPercent",
      });
      setMinToRepay(preciseRound(DecimalToUnit(minToRepay as bigint,18)*borrowAmount,2));
    }

  useEffect(() => {
    getPrecicseBorrowRatio();
    getMinToRepay();
  }, [borrowAmount]);

  // setBigIntCollateralAmount(BigInt(UnitToDecimal(borrowAmount,collateralDecimals).toString())/BigInt(1e18 *borrowRatio))
  useEffect(() => {
    const collateralAmount: number = Number(
      preciseRound(borrowAmount / borrowRatio, collateralDecimals)
    );
    setCollateralAmount(collateralAmount);
    setMinCollateralAmount(collateralAmount);
  }, [borrowAmount]);

  useEffect(() => {
    const currentDate = moment();
    const newDate = currentDate.add(maxDelayBetweenPartialRepay, 'seconds');
    setPaymentDate(newDate);
}, [maxDelayBetweenPartialRepay]);
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

      <div className="h-full rounded-xl text-black dark:text-white">
        <h2 className="ml-6 mt-4 text-start text-xl font-semibold text-navy-700 dark:text-white">
          New Loan
        </h2>
        <div className="ml-6 mt-8 grid grid-cols-2">
          <div className="">
            Your Balance :{" "}
            <span className="font-semibold">
              {preciseRound(collateralAmountAvailable, 2)}
            </span>
            {" "}{name}
          </div>
          <div className="">
            Available Debt :{" "}
            <span className="font-semibold">
              {formatCurrencyValue(availableDebt)}
            </span>
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
          <button
            onClick={borrow}
            className={style.confirmButton + "text-white"}
            disabled={borrowAmount < minBorrow ? true : false}
          >
            Borrow
          </button>
          {openingFee > 0 && (
            <div className="my-2 flex items-center ">
              <MdOutlineError className="me-1 text-amber-500 dark:text-amber-300" />
              <p>
                You will have to pay{" "}
                <span className="font-semibold">
                  {" "}
                  {preciseRound(borrowAmount * openingFee, 2)} CREDIT{" "}
                </span>{" "}
                to open this loan
              </p>
            </div>
          )}
           {maxDelayBetweenPartialRepay > 0 && (
            <div className="my-2 flex items-start ">
              <MdOutlineError className="mt-1.5 mr-0.5 text-amber-500 dark:text-amber-300" />
              <p>
              You will have to repay <strong>{minToRepay}</strong> CREDIT by <strong>{paymentDate?.format('DD/MM/YYYY HH:mm:ss')}</strong>  or your loan will be <strong> called</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CreateLoan;
