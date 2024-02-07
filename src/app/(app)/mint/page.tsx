"use client"

import Disconnected from "components/error/disconnected"
import React, { useEffect, useState } from "react"
import Card from "components/card"
import { useAccount, useReadContracts } from "wagmi"
import {
  CreditABI,
  ProfitManagerABI,
  creditContract,
  profitManagerContract,
  psmUsdcContract,
  usdcContract,
} from "lib/contracts"
import { waitForTransactionReceipt, writeContract } from "@wagmi/core"
import { formatDecimal } from "utils/numbers"
import { toastError } from "components/toast"
import MintOrRedeem from "./components/MintOrRedeem"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import clsx from "clsx"
import { Switch } from "@headlessui/react"
import { formatUnits, Address } from "viem"
import { wagmiConfig } from "contexts/Web3Provider"

function MintAndSaving() {
  const { address, isConnected } = useAccount()
  const [reload, setReload] = React.useState<boolean>(false)
  const [showModal, setShowModal] = useState(false)

  const createSteps = (): Step[] => {
    const baseSteps = [{ name: "Rebasing", status: "Not Started" }]
    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  /* Smart contract reads */
  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        ...usdcContract,
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...creditContract,
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...profitManagerContract,
        functionName: "creditMultiplier",
      },
      {
        ...usdcContract,
        functionName: "balanceOf",
        args: [psmUsdcContract.address as Address],
      },
      {
        ...creditContract,
        functionName: "isRebasing",
        args: [address as Address],
      },
      {
        ...profitManagerContract,
        functionName: "getProfitSharingConfig",
      },
    ],
    query: {
      select: (data) => {
        return {
          usdcBalance: Number(formatUnits(data[0].result as bigint, 6)),
          creditBalance: Number(formatUnits(data[1].result as bigint, 18)),
          conversionRate: Number(formatUnits(data[2].result as bigint, 18)),
          usdcAvailableToRedeem: Number(formatUnits(data[3].result as bigint, 6)),
          isRebasing: data[4].result as boolean,
          creditSplit: formatDecimal(
            Number(formatUnits(data[5].result[1] as bigint, 18)) * 100,
            2
          ),
          guildSplit: formatDecimal(
            Number(formatUnits(data[5].result[2] as bigint, 18)) * 100,
            2
          ),
          surplusBufferSplit: formatDecimal(
            Number(formatUnits(data[5].result[0] as bigint, 18)) * 100,
            2
          ),
        }
      },
    },
  })

  useEffect(() => {
    if (reload) {
      refetch()
      setReload(false)
    }
  }, [reload])

  async function saving(rebaseMode: string): Promise<void> {
    if (!isConnected) {
      toastError("Please connect your wallet")
      return
    }
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }

    try {
      setShowModal(true)
      updateStepStatus("Rebasing", "In Progress")

      const hash = await writeContract(wagmiConfig, {
        ...creditContract,
        functionName: rebaseMode,
      })

      const checkStartSaving = await waitForTransactionReceipt(wagmiConfig, {
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

  if (data) {
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
            title="gUSDC Saving"
            extra="w-full h-full sm:overflow-auto px-6 py-4"
            rightText={
              <Switch
                checked={data.isRebasing}
                onChange={function () {
                  {
                    data.isRebasing ? saving("exitRebase") : saving("enterRebase")
                  }
                }}
                className={clsx(
                  data.isRebasing ? "bg-brand-500" : "bg-gray-200",
                  "border-transparent relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out"
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    data.isRebasing ? "translate-x-5" : "translate-x-0",
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  )}
                />
              </Switch>
            }
          >
            <div className="h-full rounded-md text-gray-700 dark:text-gray-200">
              <div className="mt-4 flex flex-col gap-4">
                <p>
                  If you elect to receive the savings rate, the gUSDC balance of your
                  wallet will automatically rebase up when the protocol earn fees. The
                  protocol profit sharing can be updated by governance, and is configured
                  as follow :
                </p>
                <p>
                  <span className="font-semibold ">{data.creditSplit}</span>% to gUSDC
                  savers (through rebase), <br></br>{" "}
                  <span className="font-semibold">{data.surplusBufferSplit}</span>% to the
                  Surplus Buffer, a first-loss capital reserve shared among all terms,{" "}
                  <br></br> <span className="font-semibold">{data.guildSplit}</span>% to
                  GUILD token holders who stake their tokens to increase the debt ceiling
                  of terms,
                </p>
                <p>
                  Your current gUSDC Balance :
                  <span className="font-semibold">
                    {" "}
                    {data.creditBalance === undefined
                      ? "-"
                      : formatDecimal(data.creditBalance, 2)}
                  </span>
                </p>
                <p>
                  Your current rebasing status :{" "}
                  <span className="font-semibold">
                    {data.isRebasing === undefined ? "-" : data.isRebasing ? "Yes" : "No"}
                  </span>
                </p>
              </div>
            </div>
          </Card>
          <Card extra="order-1 w-full h-full sm:overflow-auto px-6 py-4">
            <MintOrRedeem
              reloadMintRedeem={setReload}
              usdcBalance={data.usdcBalance}
              creditBalance={data.creditBalance}
              conversionRate={data.conversionRate}
              usdcAvailableToRedeem={data.usdcAvailableToRedeem}
              isRebasing={data.isRebasing}
            />
          </Card>
        </div>
      </div>
    )
  }
}

export default MintAndSaving
