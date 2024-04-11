"use client"

import Disconnected from "components/error/disconnected"
import React, { useEffect, useState } from "react"
import Card from "components/card"
import { useAccount, useReadContracts } from "wagmi"
import { toLocaleString } from "utils/numbers"
import { ProfitManagerABI, CreditABI } from "lib/contracts"
import { waitForTransactionReceipt, writeContract } from "@wagmi/core"
import { formatDecimal } from "utils/numbers"
import { toastError } from "components/toast"
import MintOrRedeem from "./components/MintOrRedeem"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import clsx from "clsx"
import { Switch } from "@headlessui/react"
import { formatUnits, Address, erc20Abi } from "viem"
import { wagmiConfig } from "contexts/Web3Provider"
import { useAppStore } from "store"
import Spinner from "components/spinner"
import { marketsConfig } from "config"
import Image from "next/image"

function MintAndSaving() {
  const { appMarketId, contractsList, coinDetails } = useAppStore()
  const { address, isConnected } = useAccount()
  const [reload, setReload] = React.useState<boolean>(false)
  const [showModal, setShowModal] = useState(false)

  const createSteps = (): Step[] => {
    const baseSteps = [{ name: "Rebasing", status: "Not Started" }]
    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  const profitManagerAddress = contractsList?.marketContracts[appMarketId].profitManagerAddress;
  const creditAddress = contractsList?.marketContracts[appMarketId].creditAddress;
  const pegTokenAddress = contractsList?.marketContracts[appMarketId].pegTokenAddress;
  const psmAddress = contractsList?.marketContracts[appMarketId].psmAddress;

  const pegToken = coinDetails.find((item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase());
  const creditTokenSymbol = 'g' + pegToken.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  const pegTokenLogo = marketsConfig.find((item) => item.marketId == appMarketId).logo;
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);

  /* Smart contract reads */
  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: pegTokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: "creditMultiplier",
      },
      {
        address: pegTokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [ psmAddress ],
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: "isRebasing",
        args: [address as Address],
      },
      {
        address: profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: "getProfitSharingConfig",
      },
    ],
    query: {
      select: (data) => {
        return {
          pegTokenBalance: data[0].result as bigint,
          creditTokenBalance: data[1].result as bigint,
          creditMultiplier: data[2].result as bigint,
          pegTokenPSMBalance: data[3].result as bigint,
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
        address: contractsList?.marketContracts[appMarketId].creditAddress,
        abi: CreditABI,
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

  if (isLoading) return <Spinner />

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
            title="Saving Rate"
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
                  If you elect to receive the savings rate, the <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" style={{'borderRadius':'50%','border':'2px solid #3e6b7d'}} /> <strong>{creditTokenSymbol}</strong> balance of your wallet will automatically rebase up when the protocol earn fees. The protocol profit sharing can be updated by governance, and is currently configured as follow :
                </p>
                <ul className="list-disc list-inside">
                  <li className="list-item">
                    <span className="font-semibold ">{data.creditSplit}</span>% to <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" style={{'borderRadius':'50%','border':'2px solid #3e6b7d'}} /> <strong>{creditTokenSymbol}</strong> savers,
                  </li>
                  <li className="list-item">
                      <span className="font-semibold">{data.guildSplit}</span>% to <Image className="inline-block" src="/img/crypto-logos/guild.png" width={20} height={20} alt="logo" /> <strong>GUILD</strong> stakers,
                  </li>
                  <li className="list-item">
                    <span className="font-semibold">{data.surplusBufferSplit}</span>% to the Surplus Buffer.
                  </li>
                </ul>
                <p>
                  The Surplus Buffer is a first-loss capital reserve shared among all terms of a market.
                </p>
                <p className="text-gray-400">
                  You might not want to subscribe to the savings rate if your only intent is to borrow <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" style={{'borderRadius':'50%','border':'2px solid #3e6b7d'}} /> {creditTokenSymbol} then redeem them for <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" /> {pegToken.symbol} (leveraging up on collateral tokens and shorting <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" /> {pegToken.symbol}), as being a rebasing address (and delegating voting power to be able to veto) will increase the gas cost of doing <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" style={{'borderRadius':'50%','border':'2px solid #3e6b7d'}} /> {creditTokenSymbol} token transfers to/from lending terms and PSM.
                </p>
                <p className="text-gray-400">
                  The <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" style={{'borderRadius':'50%','border':'2px solid #3e6b7d'}} /> {creditTokenSymbol} tokens are not intended to be very liquid on-chain, they act as a receipt token for lending in this ECG market, and can be redeemed in the PSM to inherit the liquidity of the peg token, <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" /> {pegToken.symbol}, when there is liquidity. Loans can be called to increase PSM liquidity.
                </p>
              </div>
            </div>
          </Card>
          <Card extra="order-1 w-full h-full sm:overflow-auto px-6 py-4">
            <MintOrRedeem
              reloadMintRedeem={setReload}
              pegTokenBalance={data.pegTokenBalance}
              pegTokenPSMBalance={data.pegTokenPSMBalance}
              creditTokenBalance={data.creditTokenBalance}
              creditMultiplier={data.creditMultiplier}
              isRebasing={data.isRebasing}
            />
          </Card>
        </div>
      </div>
    )
  }
}

export default MintAndSaving
