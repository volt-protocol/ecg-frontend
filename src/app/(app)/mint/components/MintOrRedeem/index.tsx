import { jsx } from "@emotion/react"
import { readContract, waitForTransaction, writeContract } from "@wagmi/core"
import StepModal from "components/stepLoader"
import { Step } from "components/stepLoader/stepType"
import {
  CreditABI,
  ProfitManagerABI,
  UsdcABI,
  psmUsdcContract,
  creditContract,
  profitManagerContract,
  usdcContract,
} from "lib/contracts"

import React, { useEffect, useState } from "react"
import { Address, parseUnits } from "viem"
import { useAccount } from "wagmi"
import { Tab } from "@headlessui/react"
import clsx from "clsx"
import DefiInputBox from "components/box/DefiInputBox"
import { formatDecimal } from "utils/numbers"
import ButtonPrimary from "components/button/ButtonPrimary"
import { getTitleDisabled } from "./helper"
import { AlertMessage } from "components/message/AlertMessage"

function MintOrRedeem({
  reloadMintRedeem,
  usdcBalance,
  creditBalance,
  conversionRate,
  usdcAvailableToRedeem,
}: {
  reloadMintRedeem: React.Dispatch<React.SetStateAction<boolean>>
  usdcBalance: number
  creditBalance: number
  conversionRate: number
  usdcAvailableToRedeem: number
}) {
  const { address } = useAccount()
  const [showModal, setShowModal] = useState(false)
  const [value, setValue] = useState<string>("")

  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: "Approve", status: "Not Started" },
      { name: "Mint", status: "Not Started" },
    ]

    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  const updateStepStatus = (stepName: string, status: Step["status"]) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
    )
  }
  function updateStepName(oldName: string, newName: string) {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.name === oldName ? { ...step, name: newName } : step))
    )
  }

  /* Smart contract writes */
  async function mint() {
    setShowModal(true)
    try {
      updateStepStatus("Approve", "In Progress")
      // approve collateral first
      const approve = await writeContract({
        ...usdcContract,
        functionName: "approve",
        args: [psmUsdcContract.address as Address, parseUnits(value.toString(), 6)],
      })

      const checkApprove = await waitForTransaction({
        hash: approve.hash,
      })

      if (checkApprove.status != "success") {
        updateStepStatus("Approve", "Error")
        return
      }
      updateStepStatus("Approve", "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Approve", "Error")
      return
    }
    try {
      updateStepStatus("Mint", "In Progress")
      const mint = await writeContract({
        ...psmUsdcContract,
        functionName: "mint",
        args: [address, parseUnits(value.toString(), 6)],
      })
      const checkmint = await waitForTransaction({
        hash: mint.hash,
      })

      if (checkmint.status === "success") {
        updateStepStatus("Mint", "Success")
        reloadMintRedeem(true)
        setValue("")
        return
      } else updateStepStatus("Mint", "Error")
    } catch (e) {
      updateStepStatus("Mint", "Error")
      console.log(e)
    }
  }

  async function redeem() {
    try {
      setShowModal(true)
      updateStepStatus("Approve", "In Progress")
      updateStepName("Mint", "Redeem")

      // approve collateral first
      const approve = await writeContract({
        ...creditContract,
        functionName: "approve",
        args: [psmUsdcContract.address as Address, parseUnits(value.toString(), 18)],
      })

      const checkApprove = await waitForTransaction({
        hash: approve.hash,
      })

      if (checkApprove.status != "success") {
        updateStepStatus("Approve", "Error")
        return
      }
      updateStepStatus("Approve", "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Approve", "Error")
      return
    }
    try {
      updateStepStatus("Redeem", "In Progress")
      const redeem = await writeContract({
        ...psmUsdcContract,
        functionName: "redeem",
        args: [address, parseUnits(value.toString(), 18)],
      })
      const checkredeem = await waitForTransaction({
        hash: redeem.hash,
      })

      if (checkredeem.status === "success") {
        reloadMintRedeem(true)
        setValue("")
        updateStepStatus("Redeem", "Success")
        return
      } else updateStepStatus("Redeem", "Error")
    } catch (e) {
      updateStepStatus("Redeem", "Error")
      console.log(e)
    }
  }
  /* End Smart contract writes */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as string)
    }
  }

  return (
    <>
      <div>
        {showModal && (
          <StepModal
            steps={steps}
            close={setShowModal}
            initialStep={createSteps}
            setSteps={setSteps}
          />
        )}

        <Tab.Group
          onChange={(index) => {
            setValue("")
          }}
        >
          <Tab.List className="flex space-x-1 rounded-md bg-brand-100/50 p-1 dark:bg-navy-700">
            <Tab
              key="mint"
              className={({ selected }) =>
                clsx(
                  "w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base",
                  selected
                    ? "bg-white font-semibold text-brand-500 dark:bg-navy-600/70"
                    : "font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50"
                )
              }
            >
              Mint
            </Tab>
            <Tab
              key="redeem"
              className={({ selected }) =>
                clsx(
                  "w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base",
                  selected
                    ? "bg-white font-semibold text-brand-500 dark:bg-navy-600/70"
                    : "font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50"
                )
              }
            >
              Redeem
            </Tab>
          </Tab.List>
          <Tab.Panels className="mt-2">
            <Tab.Panel key="mint" className={"px-3 py-1"}>
              <DefiInputBox
                topLabel="Mint gUSDC with USDC"
                currencyLogo="/img/crypto-logos/usdc.png"
                currencySymbol="USDC"
                placeholder="0"
                pattern="^[0-9]*[.,]?[0-9]*$"
                inputSize="text-2xl sm:text-3xl"
                value={value}
                onChange={handleInputChange}
                rightLabel={
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Available: {usdcBalance ? formatDecimal(usdcBalance, 2) : 0}
                    </p>
                    <button
                      className="text-sm font-medium text-brand-500 hover:text-brand-400"
                      onClick={(e) => setValue(usdcBalance.toString())}
                    >
                      Max
                    </button>
                  </>
                }
              />
              <ButtonPrimary
                variant="lg"
                title={"Mint"}
                titleDisabled={getTitleDisabled("Mint", Number(value), usdcBalance)}
                extra="w-full mt-2 !rounded-xl"
                onClick={mint}
                disabled={Number(value) > usdcBalance || Number(value) <= 0 || !value}
              />
              <AlertMessage
                type="info"
                message={
                  <>
                    <p>
                      You will receive{" "}
                      <span className="font-bold">
                        {formatDecimal(Number(value) * conversionRate, 2)} gUSDC
                      </span>
                    </p>
                  </>
                }
              />
            </Tab.Panel>
            <Tab.Panel key="redeem" className={"px-3 py-1"}>
              <DefiInputBox
                topLabel="Redeem USDC with gUSDC"
                currencyLogo="/img/crypto-logos/credit.png"
                currencySymbol="gUSDC"
                placeholder="0"
                pattern="^[0-9]*[.,]?[0-9]*$"
                inputSize="text-2xl sm:text-3xl"
                value={value}
                onChange={handleInputChange}
                rightLabel={
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Available: {creditBalance ? formatDecimal(creditBalance, 2) : 0}
                    </p>
                    <button
                      className="text-sm font-medium text-brand-500 hover:text-brand-400"
                      onClick={(e) => setValue(creditBalance.toString())}
                    >
                      Max
                    </button>
                  </>
                }
              />
              <ButtonPrimary
                variant="lg"
                title={"Redeem"}
                titleDisabled={getTitleDisabled(
                  "Redeem",
                  Number(value),
                  usdcAvailableToRedeem
                )}
                extra="w-full mt-2 !rounded-xl"
                onClick={redeem}
                disabled={Number(value) > usdcAvailableToRedeem || !value ? true : false}
              />
              <AlertMessage
                type="info"
                message={
                  <>
                    <p>
                      You will receive{" "}
                      <span className="font-bold">
                        {formatDecimal((Number(value) * 1) / conversionRate, 2)} USDC
                      </span>
                    </p>
                  </>
                }
              />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </>
  )
}

export default MintOrRedeem
