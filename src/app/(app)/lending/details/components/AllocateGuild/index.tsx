import React, { Dispatch, SetStateAction, useEffect, useState } from "react"
import {
  Address,
  readContract,
  waitForTransaction,
  writeContract,
} from "@wagmi/core"
import { GuildABI } from "lib/contracts"
import {
  DecimalToUnit,
  UnitToDecimal,
  formatCurrencyValue,
  preciseRound,
} from "utils/utils-old"
import { toastError, toastRocket } from "components/toast"
import { useAccount } from "wagmi"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import { ContractFunctionExecutionError } from "viem"

function AllocateGuild({
  textButton,
  allocatedGuild,
  guildBalance,
  smartContractAddress,
  gaugeWeight,
  totalWeight,
  creditTotalSupply,
  guildAvailableToStake,
  reload,
}: {
  textButton: string
  allocatedGuild: number
  guildBalance: number
  smartContractAddress: string
  currentDebt: number
  availableDebt: number
  gaugeWeight: number
  totalWeight: number
  creditTotalSupply: number
  guildAvailableToStake: number
  reload: Dispatch<SetStateAction<boolean>>
}) {
  const [value, setValue] = useState<number | undefined>()
  const [loading, setLoading] = useState<boolean>(false)
  const { address, isConnected, isDisconnected } = useAccount()
  const [showModal, setShowModal] = useState(false)
  const createSteps = (): Step[] => {
    const baseSteps = [
      {
        name: textButton == "Increment" ? "Stake" : "Unstake",
        status: "Not Started",
      },
    ]

    return baseSteps
  }
  const [steps, setSteps] = useState<Step[]>(createSteps())
  const style = {
    wrapper: `w-screen flex  items-center justify-center mt-14 `,
    content: `bg-transparent w-full px-4 text-gray-700 dark:text-gray-200`,
    formHeader: `px-2 flex items-center justify-between font-semibold text-xl`,
    transferPropContainer: `bg-transparent my-3 rounded-2xl p-4 text-xl border dark:border-white border-[#41444F] hover:border-[#41444F]  flex justify-between items-center`,
    transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-2xl   `,
    currencySelector: `flex w-2/4 justify-end `,
    currencySelectorContent: `w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
    currencySelectorIcon: `flex items-center`,
    currencySelectorTicker: `mx-2`,
    currencySelectorArrow: `text-lg`,
    confirmButton: `mt-4 mb-2 rounded-md py-4 px-8 text-lg font-semibold flex items-center justify-center cursor-pointer w-full disabled:bg-gray-300 disabled:text-gray-700 disabled:cursor-not-allowed text-white bg-brand-500 hover:bg-brand-400 dark:disabled:bg-navy-900 dark:disabled:text-navy-400 transition-all ease-in-out duration-150`,
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as unknown as number)
    }
  }

  async function handleVote(): Promise<void> {
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      )
    }

    if (value == 0) {
      toastError("Please enter a value")
      return
    }
    if (isConnected == false) {
      toastError("Please connect your wallet")
      setLoading(false)
      return
    }
    if (textButton === "Increment") {
      if ((value as number) > guildBalance - guildAvailableToStake) {
        setLoading(false)
        toastError("Not enough guild")
        return
      } else {
        try {
          setShowModal(true)
          updateStepStatus("Stake", "In Progress")
          const { hash } = await writeContract({
            address: process.env.NEXT_PUBLIC_GUILD_ADDRESS,
            abi: GuildABI,
            functionName: "incrementGauge",
            args: [smartContractAddress, UnitToDecimal(value, 18)],
          })
          const checkAllocate = await waitForTransaction({
            hash: hash,
          })
          if (checkAllocate.status != "success") {
            updateStepStatus("Stake", "Error")
            return
          }
        } catch (e) {
          if (e instanceof ContractFunctionExecutionError) {
            console.log(e.shortMessage, "error")
            console.log(typeof e)
            updateStepStatus(
              "Stake",
              `Error : ${
                e.shortMessage.split(":")[1] + e.shortMessage.split(":")[2]
              }`
            )
            return
          } else {
            updateStepStatus("Stake", "Error")
            return
          }
        }
        updateStepStatus("Stake", "Success")
        reload(true)
      }
    } else if (textButton === "Decrement") {
      if ((value as number) > allocatedGuild) {
        toastError("Not enough GUILD allocated")
        return
      } else {
        setShowModal(true)
        updateStepStatus("Unstake", "In Progress")
        try {
          const { hash } = await writeContract({
            address: process.env.NEXT_PUBLIC_GUILD_ADDRESS,
            abi: GuildABI,
            functionName: "decrementGauge",
            args: [smartContractAddress, UnitToDecimal(value, 18)],
          })
          const checkUnstack = await waitForTransaction({
            hash: hash,
          })
          if (checkUnstack.status != "success") {
            updateStepStatus("Unstake", "Error")
            return
          }
          updateStepStatus("Unstake", "Success")
          reload(true)
        } catch (e) {
          if (e instanceof ContractFunctionExecutionError) {
            console.log(e.shortMessage, "error")
            console.log(typeof e)
            updateStepStatus(
              "Unstake",
              `Error : ${
                e.shortMessage.split(":")[1] + e.shortMessage.split(":")[2]
              }`
            )
            return
          } else {
            console.log(e)
            updateStepStatus("Unstake", "Error")
            return
          }
        }
      }
    }
  }

  function getDebtCeileing(): string {
    if (!value) return "0"
    const percentBefore = gaugeWeight / totalWeight
    const percentAfter = (gaugeWeight + Number(value)) / totalWeight
    const debCeilingBefore = creditTotalSupply * percentBefore * 2
    const debCeilingAfter = creditTotalSupply * percentAfter * 2
    const debtCeilingIncrease = debCeilingAfter - debCeilingBefore
    return formatCurrencyValue(Number(preciseRound(debtCeilingIncrease, 2)))
  }

  return (
    <div className={style.content}>
      {showModal && (
        <StepModal
          steps={steps}
          close={setShowModal}
          initialStep={createSteps}
          setSteps={setSteps}
        />
      )}
      {/* <div className={style.formHeader}></div> */}
      <div className="grid grid-cols-2">
        <p className=" col-span-2">
          Your GUILD staked on this term :{" "}
          <span className="font-semibold">
            {allocatedGuild != undefined
              ? preciseRound(allocatedGuild, 2)
              : "?"}
          </span>{" "}
        </p>
        <p className=" col-span-2">
          Your GUILD available to stake :{" "}
          {guildBalance != undefined ? (
            <>
              <span className="font-semibold">
                {preciseRound(guildBalance - guildAvailableToStake, 2)}
              </span>{" "}
              /{" "}
              <span className="font-semibold">
                {preciseRound(guildBalance, 2)}
              </span>{" "}
            </>
          ) : (
            <span className="font-semibold">?</span>
          )}
        </p>
      </div>
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
            {textButton === "Increment" ? (
              <p> GUILD to stake</p>
            ) : (
              <p> GUILD to unstake</p>
            )}
          </span>
        </div>
      </div>
      <div className="mt-4">
        {textButton === "Increment" ? (
          <>
            <p>
              Your GUILD stake will allow{" "}
              <span className="font-bold">{getDebtCeileing()} more CREDIT</span>{" "}
              to be borrowed from this term{" "}
            </p>
          </>
        ) : (
          <>
            <p>
              Your GUILD unstake will decrease the borrow capacity on this term
              by <span className="font-bold">{getDebtCeileing()} CREDIT</span>
            </p>
          </>
        )}
      </div>
      <button
        onClick={handleVote}
        className={style.confirmButton}
        disabled={
          (value > guildBalance - guildAvailableToStake &&
            textButton == "Increment") ||
          (value > allocatedGuild && textButton == "Decrement") ||
          !value
            ? true
            : false
        }
      >
        {textButton === "Increment" ? "Stake" : "Unstake"}
      </button>
    </div>
  )
}

export default AllocateGuild
