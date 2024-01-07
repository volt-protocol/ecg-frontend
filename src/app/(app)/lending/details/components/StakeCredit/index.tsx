import React, { useEffect, useState } from "react"
import { Address, readContract, waitForTransaction, writeContract } from "@wagmi/core"
import { toastError } from "components/toast"
import {
  CreditABI,
  SurplusGuildMinterABI,
  TermABI,
  creditContract,
  surplusGuildMinterContract,
} from "lib/contracts"
import { DecimalToUnit, UnitToDecimal, formatCurrencyValue } from "utils/utils-old"
import { TooltipHorizon } from "components/tooltip"
import { useAccount } from "wagmi"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import { Abi, ContractFunctionExecutionError, formatUnits, parseEther } from "viem"
import { QuestionMarkIcon } from "components/tooltip"
import ButtonPrimary from "components/button/ButtonPrimary"
import { formatDecimal } from "utils/numbers"
import { AlertMessage } from "components/message/AlertMessage"
import DefiInputBox from "components/box/DefiInputBox"
import { getTitleDisabledStake, getTitleDisabledUnstake } from "./helper"
import { LendingTerms } from "types/lending"

function StakeCredit({
  debtCeiling,
  lendingTerm,
  creditAllocated,
  textButton,
  creditBalance,
  termAddress,
  ratioGuildCredit,
  reload,
}: {
  debtCeiling: number
  lendingTerm: LendingTerms
  creditAllocated: bigint
  textButton: "Stake" | "Unstake"
  creditBalance: bigint
  termAddress: string
  ratioGuildCredit: number
  reload: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [value, setValue] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const { address, isConnected } = useAccount()
  const [showModal, setShowModal] = useState<boolean>(false)
  const [debtDelta, setDebtDelta] = useState(0)

  const createSteps = (): Step[] => {
    const baseSteps = [
      {
        name: textButton,
        status: "Not Started",
      },
    ]

    if (textButton === "Stake") {
      baseSteps.splice(0, 0, { name: "Approve", status: "Not Started" })
    }

    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as string)

      await getDebtCeilingDelta(inputValue)
    }
  }

  // useEffect(() => {
  //   async function getStakeRatio() {
  //     const ratio = await readContract({
  //       ...surplusGuildMinterContract,
  //       functionName: "stakeRatio",
  //       args: [address, termAddress],
  //     })
  //     setStakeRatio(DecimalToUnit(ratio as bigint, 18))
  //   }

  //   getStakeRatio()
  // }, [value])

  async function handlestake(): Promise<void> {
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }

    if (textButton === "Stake") {
      if (isConnected == false) {
        toastError("Please connect your wallet")
        setLoading(false)
        return
      }
      if (Number(value) == 0) {
        toastError("Please enter a value")
        setLoading(false)
        return
      }

      if (Number(value) > creditBalance) {
        toastError("Not enough gUSDC")
        setLoading(false)
        return
      } else {
        setShowModal(true)
        updateStepStatus("Approve", "In Progress")
        try {
          const approve = await writeContract({
            ...creditContract,
            functionName: "approve",
            args: [surplusGuildMinterContract.address, parseEther(value.toString())],
          })

          const checkApprove = await waitForTransaction({
            hash: approve.hash,
          })

          if (checkApprove.status != "success") {
            updateStepStatus("Approve", "Error")
            return
          }
        } catch (e) {
          if (e instanceof ContractFunctionExecutionError) {
            console.log(e.shortMessage, "error")
            console.log(typeof e)
            updateStepStatus(
              "Approve",
              e.shortMessage.split(":")[1] + e.shortMessage.split(":")[2]
            )
            return
          } else {
            updateStepStatus("Approve", "Error")
            return
          }
        }
        updateStepStatus("Approve", "Success")
        updateStepStatus("Stake", "In Progress")

        try {
          const { hash } = await writeContract({
            ...surplusGuildMinterContract,
            functionName: "stake",
            args: [termAddress, parseEther(value.toString())],
          })

          const checkStake = await waitForTransaction({
            hash: hash,
          })

          if (checkStake.status != "success") {
            updateStepStatus("Stake", "Error")
            return
          }
        } catch (e) {
          if (e instanceof ContractFunctionExecutionError) {
            console.log(e.shortMessage, "error")
            console.log(typeof e)
            updateStepStatus(
              "Stake",
              `Error : ${e.shortMessage.split(":")[1] + e.shortMessage.split(":")[2]}`
            )
            return
          } else {
            updateStepStatus("Stake", "Error")
            return
          }
        }
        updateStepStatus("Stake", "Success")
        setValue("")
        reload(true)
      }
    } else if (textButton === "Unstake") {
      if (Number(value) > creditAllocated) {
        toastError("Not enough gUSDC allocated")
        setLoading(false)
        return
      } else {
        setShowModal(true)
        updateStepStatus("Unstake", "In Progress")
        try {
          const { hash } = await writeContract({
            ...surplusGuildMinterContract,
            functionName: "unstake",
            args: [termAddress, parseEther(value.toString())],
          })

          const checkUnstake = await waitForTransaction({
            hash: hash,
          })

          if (checkUnstake.status != "success") {
            updateStepStatus("Unstake", "Error")
            return
          }
        } catch (e) {
          if (e instanceof ContractFunctionExecutionError) {
            console.log(e.shortMessage, "error")
            console.log(typeof e)
            updateStepStatus(
              "Unstake",
              `Error : ${e.shortMessage.split(":")[1] + e.shortMessage.split(":")[2]}`
            )
            return
          }
        }
        updateStepStatus("Unstake", "Success")
        setValue("")
        reload(true)
      }
    }
  }

  async function getDebtCeilingDelta(value) {
    if (
      (Number(value) > Number(formatUnits(creditBalance, 18)) &&
        textButton === "Stake") ||
      (Number(value) > Number(formatUnits(creditAllocated, 18)) &&
        textButton === "Unstake")
    ) {
      setDebtDelta(0)
      return
    }

    let amount: bigint

    if (textButton == "Stake") {
      amount = parseEther((Number(value) * ratioGuildCredit).toString())
    } else {
      amount = -parseEther((Number(value) * ratioGuildCredit).toString())
    }

    const data = await readContract({
      address: lendingTerm.address as Address,
      abi: TermABI as Abi,
      functionName: "debtCeiling",
      args: [amount],
    })

    setDebtDelta(Math.abs(Number(formatUnits(data as bigint, 18)) - debtCeiling))
  }

  const setMax = async () => {
    if (textButton == "Stake") {
      setValue(formatUnits(creditBalance, 18))
      await getDebtCeilingDelta(formatUnits(creditBalance, 18))
    } else {
      setValue(formatUnits(creditAllocated, 18))
      await getDebtCeilingDelta(formatUnits(creditAllocated, 18))
    }
  }

  const setAvailable = (): string => {
    return textButton == "Stake"
      ? formatDecimal(Number(formatUnits(creditBalance, 18)), 2)
      : formatDecimal(Number(formatUnits(creditAllocated, 18)), 2)
  }

  if (creditAllocated == undefined || creditBalance == undefined) return null

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
      <div>
        <div className="grid grid-cols-5 gap-x-1 gap-y-1">
          <div className="col-span-2"></div>

          {/* <p className="font-semibold">
            Current interest rate:{" "}
            <span className="text-xl">{interestRate * 100 + "%"}</span>{" "}
          </p> */}
        </div>
        {/* {textButton === "Stake" ? (
          <div className="relative mt-4 rounded-md">
            <input
              onChange={handleInputChange}
              value={value as number}
              className="block w-full rounded-md border-2 border-gray-300 py-3 pl-7 pr-12 text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 focus:!ring-0 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:text-lg sm:leading-6"
              placeholder="0"
              pattern="^[0-9]*[.,]?[0-9]*$"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 dark:text-gray-50 sm:text-lg">
                {textButton === "Stake" ? "gUSDC to stake" : ""}
              </span>
            </div>
          </div>
        ) : (
          <></>
        )} */}
        <DefiInputBox
          topLabel={"Amount of gUSDC to " + textButton.toLowerCase()}
          currencyLogo="/img/crypto-logos/credit.png"
          currencySymbol="gUSDC"
          placeholder="0"
          pattern="^[0-9]*[.,]?[0-9]*$"
          inputSize="text-xl xl:text-3xl"
          value={value}
          onChange={handleInputChange}
          rightLabel={
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Available: {setAvailable()}
              </p>
              <button
                className="text-sm font-medium text-brand-500 hover:text-brand-400"
                onClick={(e) => setMax()}
              >
                Max
              </button>
            </>
          }
        />

        <ButtonPrimary
          variant="lg"
          title={textButton}
          titleDisabled={
            textButton == "Stake"
              ? getTitleDisabledStake(value, creditBalance)
              : getTitleDisabledUnstake(value, creditAllocated)
          }
          extra="w-full mt-2 !rounded-xl"
          onClick={handlestake}
          disabled={
            (Number(value) > Number(formatUnits(creditBalance, 18)) &&
              textButton === "Stake") ||
            (Number(value) > Number(formatUnits(creditAllocated, 18)) &&
              textButton === "Unstake") ||
            Number(value) <= 0 ||
            !value
          }
        />
        <AlertMessage
          type="info"
          message={
            textButton === "Stake" ? (
              <>
                <div>
                  The GUILD / gUSDC ratio is{" "}
                  <div className="inline-flex items-center">
                    <span className="mr-1 font-bold">
                      {formatDecimal(ratioGuildCredit, 2)}
                    </span>
                    <TooltipHorizon
                      extra=""
                      trigger={
                        <div className="inline-block">
                          <QuestionMarkIcon />
                        </div>
                      }
                      content={
                        <div className="w-[15rem] p-2">
                          <p>
                            When you stake <span className="font-semibold">gUSDC</span>,
                            you provide first-loss capital on this term, and in exchange
                            an amount of <span className="font-semibold">GUILD</span> will
                            be minted to vote for this term.
                          </p>
                        </div>
                      }
                      placement="top"
                    ></TooltipHorizon>
                  </div>
                  {". "}
                  Your stake will allow{" "}
                  <span className="font-bold">
                    {formatCurrencyValue(Number(formatDecimal(debtDelta, 2)))} more gUSDC
                  </span>{" "}
                  to be borrowed.
                </div>
              </>
            ) : (
              <>
                <p>
                  Your unstake will decrease the borrow capacity on this term by{" "}
                  <span className="font-bold">
                    {formatCurrencyValue(Number(formatDecimal(debtDelta, 2)))}{" "}
                  </span>{" "}
                  gUSDC
                </p>
              </>
            )
          }
        />
      </div>
    </>
  )
}

export default StakeCredit
