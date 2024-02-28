import React, { useState } from "react"
import { readContract, waitForTransactionReceipt, writeContract } from "@wagmi/core"
import { toastError } from "components/toast"
import { TermABI, CreditABI, SurplusGuildMinterABI } from "lib/contracts"
import { formatCurrencyValue, toLocaleString } from "utils/numbers"
import { TooltipHorizon } from "components/tooltip"
import { useAccount } from "wagmi"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import {
  Abi,
  ContractFunctionExecutionError,
  formatUnits,
  parseEther,
  Address,
} from "viem"
import { QuestionMarkIcon } from "components/tooltip"
import ButtonPrimary from "components/button/ButtonPrimary"
import { formatDecimal } from "utils/numbers"
import { AlertMessage } from "components/message/AlertMessage"
import DefiInputBox from "components/box/DefiInputBox"
import { getTitleDisabledStake, getTitleDisabledUnstake } from "./helper"
import { LendingTerms } from "types/lending"
import { wagmiConfig } from "contexts/Web3Provider"
import { useAppStore } from "store"

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
  const { contractsList } = useAppStore()
  const [value, setValue] = useState<string>("")
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

  async function handlestake(): Promise<void> {
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }

    if (textButton === "Stake") {
      if (isConnected == false) {
        toastError("Please connect your wallet")
        return
      }
      if (Number(value) == 0) {
        toastError("Please enter a value")
        return
      }

      if (Number(value) > creditBalance) {
        toastError("Not enough gUSDC")
        return
      } else {
        setShowModal(true)
        updateStepStatus("Approve", "In Progress")
        try {
          const hash = await writeContract(wagmiConfig, {
            address: contractsList?.creditAddress,
            abi: CreditABI,
            functionName: "approve",
            args: [contractsList.surplusGuildMinterAddress, parseEther(value.toString())],
          })

          const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
            hash: hash,
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
          const hash = await writeContract(wagmiConfig, {
            address: contractsList.surplusGuildMinterAddress,
            abi: SurplusGuildMinterABI,
            functionName: "stake",
            args: [termAddress, parseEther(value.toString())],
          })

          const checkStake = await waitForTransactionReceipt(wagmiConfig, {
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
        return
      } else {
        setShowModal(true)
        updateStepStatus("Unstake", "In Progress")
        try {
          const hash = await writeContract(wagmiConfig, {
            address: contractsList.surplusGuildMinterAddress,
            abi: SurplusGuildMinterABI,
            functionName: "unstake",
            args: [termAddress, parseEther(value.toString())],
          })

          const checkUnstake = await waitForTransactionReceipt(wagmiConfig, {
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

    const data = await readContract(wagmiConfig, {
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
        <div className="mb-2 flex flex-col items-center gap-2">
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
                  Available: {toLocaleString(setAvailable())}
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
            extra="w-full !rounded-xl"
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
                              an amount of <span className="font-semibold">GUILD</span>{" "}
                              will be minted to vote for this term.
                            </p>
                          </div>
                        }
                        placement="top"
                      ></TooltipHorizon>
                    </div>
                    {". "}
                    Your stake will allow{" "}
                    <span className="font-bold">
                      {formatCurrencyValue(Number(formatDecimal(debtDelta, 2)))} more
                      gUSDC
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
      </div>
    </>
  )
}

export default StakeCredit
