import React, { useEffect, useState } from "react";
import {
  Address,
  readContract,
  waitForTransaction,
  writeContract,
} from "@wagmi/core";
import { toastError, toastRocket } from "toast";
import { creditAbi, surplusGuildMinterAbi } from "guildAbi";
import {
  DecimalToUnit,
  UnitToDecimal,
  formatCurrencyValue,
  preciseRound,
} from "utils";
import DefaultSpinner from "components/spinner";
import SpinnerLoader from "components/spinner";
import TooltipHorizon from "components/tooltip";
import { useAccount } from "wagmi";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { Step } from "components/stepLoader/stepType";
import StepModal from "components/stepLoader";

function Stake({
  allocatedCredit,
  textButton,
  availableCredit,
  termAddress,
  gaugeWeight,
  totalWeight,
  creditTotalSupply,
  ratioGuildCredit,
  reload,
}: {
  allocatedCredit: number;
  textButton: string;
  availableCredit: number;
  termAddress: string;
  gaugeWeight: number;
  totalWeight: number;
  creditTotalSupply: number;
  ratioGuildCredit: number;
  reload: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [value, setValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [stakeRatio, setStakeRatio] = useState<number>(0);
  const { address, isConnected } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const createSteps = (): Step[] => {
    const baseSteps = [
      {
        name: textButton == "stake" ? "Stake" : "Unstake",
        status: "Not Started",
      },
    ];

    if (textButton === "stake") {
      baseSteps.splice(0, 0, { name: "Approve", status: "Not Started" });
    }

    return baseSteps;
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
    content: `bg-transparent w-full   rounded-2xl px-4 text-black dark:text-white`,
    formHeader: `px-2 flex items-center justify-between font-semibold text-xl`,
    transferPropContainer: `border-[#41444F] bg-transparent my-3 rounded-2xl p-4 text-xl border dark:border-white hover:border-[#41444F]  flex justify-between items-center`,
    transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-2xl  `,
    currencySelector: `flex w-2/4 justify-end `,
    currencySelectorContent: ` w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
    currencySelectorIcon: `flex items-center`,
    currencySelectorTicker: `mx-2`,
    currencySelectorArrow: `text-lg`,
    confirmButton: ` w-full bg-purple my-2 rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border border-purple hover:border-[#234169]  ${
      (allocatedCredit == 0 && textButton === "Unstake") ||
      ((value > availableCredit || value <= 0) && textButton === "stake")
        ? "bg-gray-400  text-gray-700 !cursor-default"
        : "bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500  text-white"
    }  `,
  };

  useEffect(() => {
    async function getStakeRatio() {
      const ratio = await readContract({
        address: import.meta.env.VITE_SURPLUS_GUILD_MINTER_ADDRESS as Address,
        abi: surplusGuildMinterAbi,
        functionName: "stakeRatio",
        args: [address, termAddress],
      });
      setStakeRatio(DecimalToUnit(ratio as bigint, 18));
    }

    getStakeRatio();
  }, [value]);

  async function handlestake(): Promise<void> {
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      );
    };

    if (textButton === "stake") {
      if (isConnected == false) {
        toastError("Please connect your wallet");
        setLoading(false);
        return;
      }
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
        setShowModal(true);
        updateStepStatus("Approve", "In Progress");
        try {
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
            updateStepStatus("Approve", "Error");
            return;
          }
        } catch (e) {
          console.log(e);
          updateStepStatus("Approve", "Error");
          return;
        }
        updateStepStatus("Approve", "Success");
        updateStepStatus("Stake", "In Progress");
        try {
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
            updateStepStatus("Stake", "Error");
            return;
          }
        } catch (e) {
          console.log(e);
          updateStepStatus("Stake", "Error");
          return;
        }
        updateStepStatus("Stake", "Success");
        reload(true);
      }
    } else if (textButton === "Unstake") {
      if ((value as number) > allocatedCredit) {
        toastError("Not enough CREDIT allocated");
        setLoading(false);
        return;
      } else {
        setShowModal(true);
        updateStepStatus("Unstake", "In Progress");
        try {
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
            updateStepStatus("Unstake", "Error");
            return;
          }
        } catch (e) {
          console.log(e);
          updateStepStatus("Unstake", "Error");
          return;
        }
        updateStepStatus("Unstake", "Success");
        reload(true);
      }
    }
  }

  function getDebtCeileingIncrease(): string {
    let guildAmount = value * ratioGuildCredit;
    const percentBefore = gaugeWeight / totalWeight;
    const percentAfter = (gaugeWeight + guildAmount) / totalWeight;
    const debCeilingBefore = creditTotalSupply * percentBefore * 1.2;
    const debCeilingAfter = creditTotalSupply * percentAfter * 1.2;
    const debtCeilingIncrease = debCeilingAfter - debCeilingBefore;
    return formatCurrencyValue(Number(preciseRound(debtCeilingIncrease, 2)));
  }

  function getDebtCeileingDecrease(): string {
    let guildAmount = allocatedCredit * ratioGuildCredit;
    const percentBefore = gaugeWeight / totalWeight;
    const percentAfter = (gaugeWeight + guildAmount) / totalWeight;
    const debCeilingBefore = creditTotalSupply * percentBefore * 1.2;
    const debCeilingAfter = creditTotalSupply * percentAfter * 1.2;
    const debtCeilingIncrease = debCeilingAfter - debCeilingBefore;
    return formatCurrencyValue(Number(preciseRound(debtCeilingIncrease, 2)));
  }
  return (
    <>
     {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
      <div className={style.content}>
        <div className={style.formHeader}></div>
        <div className="my-2 -mt-1 grid grid-cols-5 gap-y-1  ">
          <div className="col-span-3">
            <TooltipHorizon
              extra=""
              trigger={
                <div className="flex space-x-1 ">
                  <p>
                    Your CREDIT staked on this term :{" "}
                    <span className="font-semibold ">
                      {allocatedCredit != undefined ? preciseRound(allocatedCredit, 2) : "?"}
                    </span>{" "}
                  </p>
                  <AiOutlineQuestionCircle color="gray" />
                </div>
              }
              content={
                <div className="">
                  <p>
                    Equivalent to{" "}
                    <span className="font-semibold ">
                      {preciseRound(allocatedCredit * stakeRatio, 2)}
                    </span>{" "}
                    GUILD staked.
                  </p>
                </div>
              }
              placement="right"
            ></TooltipHorizon>
          </div>
          <div className="col-span-2">
            <TooltipHorizon
              extra=""
              trigger={
                <div className="flex space-x-1 ">
                  <p className="">
                    GUILD / CREDIT ratio :{" "}
                    <span className="font-semibold">{preciseRound(ratioGuildCredit, 2)}</span>{" "}
                  </p>
                  <AiOutlineQuestionCircle color="gray" />
                </div>
              }
              content={
                <div className="w-[15rem] p-2">
                  <p>
                    When you stake <span className="font-semibold">CREDIT</span>,
                    you provide first-loss capital on this term, and in
                    exchange an amount of{" "}
                    <span className="font-semibold">GUILD</span> will be minted
                    to vote for this term.
                  </p>
                </div>
              }
              placement="right"
            ></TooltipHorizon>
          </div>

          <p className="col-span-5">
            Your CREDIT balance :{" "}
            <span className="font-semibold ">
              {availableCredit != undefined ? preciseRound(availableCredit, 2) : "?"}
            </span>{" "}
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
              {textButton === "stake" ? <p>CREDIT to stake</p> : <p> </p>}
            </div>
          </div>
        ) : (
          <></>
        )}
        {textButton === "stake" ? (
          <>
            <p>
              Your CREDIT stake will allow {getDebtCeileingIncrease()} more
              CREDIT to be borrowed from this term
            </p>
          </>
        ) : (
          <><p>
         Unstaking your CREDIT will reduce the available borrowing amount by {getDebtCeileingDecrease()}CREDIT for this term.
        </p></>
        )}

        <button
          onClick={handlestake}
          disabled={
            (allocatedCredit == 0 && textButton === "Unstake") ||
            (value > availableCredit && textButton === "stake")
              ? true
              : false
          }
          className={`${style.confirmButton} `}
        >
          {textButton === "stake" ? "Stake" : "Unstake"}
        </button>
      </div>
    </>
  );
}

export default Stake;
