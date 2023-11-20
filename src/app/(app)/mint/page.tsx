"use client"

import Disconnected from "components/error/disconnected"
import React, { useEffect, useState } from "react"
import Card from "components/card"
import { Address, useAccount } from "wagmi"
import { CreditABI, ProfitManagerABI } from "lib/contracts"
import { readContract, waitForTransaction, writeContract } from "@wagmi/core"
import { DecimalToUnit } from "utils/utils-old"
import { formatDecimal } from "utils/numbers"
import { toastError, toastRocket } from "components/toast"
import SpinnerLoader from "components/spinner"
import MintOrRedeem from "./components/MintOrRedeem"
import { ToggleSwitch } from "flowbite-react"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import clsx from "clsx"
import { Switch } from "@headlessui/react"

function MintAndSaving() {
  const [creditAvailable, setCreditAvailable] = React.useState(undefined)
  const { address, isConnected, isDisconnected } = useAccount()
  const [reload, setReload] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState(false)
  const [profitSharing, setProfitSharing] = React.useState({
    creditSplit: "",
    guildSplit: "",
    surplusBufferSplit: "",
  })
  const [isRebasing, setIsRebasing] = React.useState(undefined)
  const [showModal, setShowModal] = useState(false)
  const createSteps = (): Step[] => {
    const baseSteps = [{ name: "Rebasing", status: "Not Started" }]
    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  async function Rebasing(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
      abi: CreditABI,
      functionName: "isRebasing",
      args: [address],
    })
    setIsRebasing(result as boolean)
  }

  useEffect(() => {
    async function getCreditAvailable(): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
        abi: CreditABI,
        functionName: "balanceOf",
        args: [address],
      })
      setCreditAvailable(DecimalToUnit(result as bigint, 18))
    }
    if (isConnected) {
      getCreditAvailable()
      Rebasing()
      setReload(false)
    } else {
      setIsRebasing(false)
    }
  }, [isConnected, reload])

  useEffect(() => {
    async function getProfitSharing(): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_PROFIT_MANAGER_ADDRESS as Address,
        abi: ProfitManagerABI,
        functionName: "getProfitSharingConfig",
      })

      if (Array.isArray(result) && result.length >= 3) {
        setProfitSharing({
          creditSplit: formatDecimal(
            DecimalToUnit(result[0] as bigint, 18) * 100,
            2
          ),
          guildSplit: formatDecimal(
            DecimalToUnit(result[1] as bigint, 18) * 100,
            2
          ),
          surplusBufferSplit: formatDecimal(
            DecimalToUnit(result[2] as bigint, 18) * 100,
            2
          ),
        })
      } else {
        throw new Error("Invalid profit sharing config")
      }
    }
    getProfitSharing()
  }, [isConnected])

  async function saving(rebaseMode: string): Promise<void> {
    if (!isConnected) {
      toastError("Please connect your wallet")
      return
    }
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      )
    }
    try {
      setShowModal(true)
      updateStepStatus("Rebasing", "In Progress")
      const { hash } = await writeContract({
        address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
        abi: CreditABI,
        functionName: rebaseMode,
      })
      const checkStartSaving = await waitForTransaction({
        hash: hash,
      })
      if (checkStartSaving.status != "success") {
        updateStepStatus("Rebasing", "Error")
        return
      }
      updateStepStatus("Rebasing", "Success")
      setReload(true)
    } catch (error) {
      updateStepStatus("Rebasing", "Error")
      console.log(error)
    }
  }

  if (!isConnected) {
    return <Disconnected />
  }

  return (
    <div className="space-y-10">
      {showModal && (
        <StepModal
          steps={steps}
          close={setShowModal}
          initialStep={createSteps}
          setSteps={setSteps}
        />
      )}

      <div className=" mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card
          title="CREDIT Saving"
          extra="w-full h-full sm:overflow-auto px-6 py-4"
          rightText={
            <Switch
              checked={isRebasing}
              onChange={function () {
                {
                  isRebasing ? saving("exitRebase") : saving("enterRebase")
                }
              }}
              className={clsx(
                isRebasing ? "bg-brand-500" : "bg-gray-200",
                "border-transparent relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out"
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  isRebasing ? "translate-x-5" : "translate-x-0",
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                )}
              />
            </Switch>
          }
        >
          <div className="h-full rounded-md text-gray-700 dark:text-gray-200">
            <div className="mt-4 flex flex-col gap-4">
              <p>
                If you elect to receive the savings rate, the CREDIT balance of
                your wallet will automatically rebase up when the protocol earn
                fees. The protocol profit sharing can be updated by governance,
                and is configured as follow :
              </p>
              <p>
                <span className="font-semibold ">
                  {profitSharing.creditSplit}
                </span>
                % to CREDIT savers (through rebase), <br></br>{" "}
                <span className="font-semibold">
                  {profitSharing.surplusBufferSplit}
                </span>
                % to the Surplus Buffer, a first-loss capital reserve shared
                among all terms, <br></br>{" "}
                <span className="font-semibold">
                  {profitSharing.guildSplit}
                </span>
                % to GUILD token holders who stake their tokens to increase the
                debt ceiling of terms,
              </p>
              <p>
                Your current CREDIT Balance :
                <span className="font-semibold">
                  {" "}
                  {creditAvailable === undefined
                    ? "?"
                    : formatDecimal(creditAvailable, 2)}
                </span>
              </p>
              <p>
                Your current rebasing status :{" "}
                <span className="font-semibold">
                  {isRebasing === undefined ? "?" : isRebasing ? "Yes" : "No"}
                </span>
              </p>
            </div>
          </div>
        </Card>
        <Card
          extra="order-1 w-full h-full sm:overflow-auto px-6 py-4"
          title="Mint / Redeem"
        >
          <MintOrRedeem />
        </Card>
      </div>
    </div>
  )
}

export default MintAndSaving
