import { waitForTransactionReceipt, writeContract } from "@wagmi/core"
import StepModal from "components/stepLoader"
import { Step } from "components/stepLoader/stepType"
import { PsmUsdcABI, CreditABI } from "lib/contracts"
import React, { useEffect, useState } from "react"
import { Address, erc20Abi, parseUnits } from "viem"
import { useAccount } from "wagmi"
import { Switch, Tab } from "@headlessui/react"
import clsx from "clsx"
import DefiInputBox from "components/box/DefiInputBox"
import { formatDecimal, toLocaleString } from "utils/numbers"
import ButtonPrimary from "components/button/ButtonPrimary"
import { getTitleDisabled } from "./helper"
import { AlertMessage } from "components/message/AlertMessage"
import { wagmiConfig } from "contexts/Web3Provider"
import { useAppStore } from "store"

function MintOrRedeem({
  reloadMintRedeem,
  usdcBalance,
  creditBalance,
  conversionRate,
  usdcAvailableToRedeem,
  isRebasing,
}: {
  reloadMintRedeem: React.Dispatch<React.SetStateAction<boolean>>
  usdcBalance: number
  creditBalance: number
  conversionRate: number
  usdcAvailableToRedeem: number
  isRebasing: boolean
}) {
  const { contractsList } = useAppStore()
  const { address } = useAccount()
  const [showModal, setShowModal] = useState(false)
  const [value, setValue] = useState<string>("")
  const [show, setShow] = useState<boolean>(false)

  useEffect(() => {
    setShow(!isRebasing)
  }, [isRebasing])

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
      const hash = await writeContract(wagmiConfig, {
        address: contractsList.usdcAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [contractsList.psmUsdcAddress as Address, parseUnits(value.toString(), 6)],
      })

      const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
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
      const hash = await writeContract(wagmiConfig, {
        address: contractsList.psmUsdcAddress,
        abi: PsmUsdcABI,
        functionName: "mint",
        args: [address, parseUnits(value.toString(), 6)],
      })
      const checkmint = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
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

  async function mintAndEnterRebase() {
    setShowModal(true)
    try {
      updateStepStatus("Approve", "In Progress")
      updateStepName("Mint", "Mint and Enter Rebase")

      // approve collateral first
      const hash = await writeContract(wagmiConfig, {
        address: contractsList.usdcAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [contractsList.psmUsdcAddress as Address, parseUnits(value.toString(), 6)],
      })

      const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
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
      updateStepStatus("Mint and Enter Rebase", "In Progress")
      const hash = await writeContract(wagmiConfig, {
        address: contractsList.psmUsdcAddress,
        abi: PsmUsdcABI,
        functionName: "mintAndEnterRebase",
        args: [parseUnits(value.toString(), 6)],
      })
      const checkmint = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (checkmint.status === "success") {
        updateStepStatus("Mint and Enter Rebase", "Success")
        reloadMintRedeem(true)
        setValue("")
        return
      } else updateStepStatus("Mint and Enter Rebase", "Error")
    } catch (e) {
      updateStepStatus("Mint and Enter Rebase", "Error")
      console.log(e)
    }
  }

  async function redeem() {
    try {
      setShowModal(true)
      updateStepStatus("Approve", "In Progress")
      updateStepName("Mint", "Redeem")

      // approve collateral first
      const hash = await writeContract(wagmiConfig, {
        address: contractsList?.creditAddress,
        abi: CreditABI,
        functionName: "approve",
        args: [contractsList.psmUsdcAddress as Address, parseUnits(value.toString(), 18)],
      })

      const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
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
      const hash = await writeContract(wagmiConfig, {
        address: contractsList.psmUsdcAddress,
        abi: PsmUsdcABI,
        functionName: "redeem",
        args: [address, parseUnits(value.toString(), 18)],
      })
      const checkredeem = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
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
              <div className="flex flex-col items-center gap-2">
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
                        Available:{" "}
                        {usdcBalance ? toLocaleString(formatDecimal(usdcBalance, 2)) : 0}
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
                <div className="flex w-full flex-col rounded-xl bg-gray-100 py-4 dark:bg-navy-900">
                  <div className="sm:w-ha flex w-full items-center justify-between px-5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enter Saving Rate
                    </label>
                    <Switch
                      disabled={isRebasing}
                      checked={show}
                      onChange={setShow}
                      className={clsx(
                        show ? "bg-brand-500" : "bg-gray-200",
                        isRebasing ? "cursor-not-allowed" : "cursor-pointer",
                        "border-transparent relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          show ? "translate-x-5" : "translate-x-0",
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        )}
                      />
                    </Switch>
                  </div>
                </div>
                <ButtonPrimary
                  variant="lg"
                  title={show ? "Mint and Enter Rebase" : "Mint"}
                  titleDisabled={getTitleDisabled("Mint", Number(value), usdcBalance)}
                  extra="w-full !rounded-xl"
                  onClick={show ? mintAndEnterRebase : mint}
                  disabled={Number(value) > usdcBalance || Number(value) <= 0 || !value}
                />
                <AlertMessage
                  type="info"
                  message={
                    <>
                      <p>
                        You will receive{" "}
                        <span className="font-bold">
                          {toLocaleString(
                            formatDecimal(Number(value) / conversionRate, 2)
                          )}{" "}
                          gUSDC
                        </span>
                      </p>
                    </>
                  }
                />
              </div>
            </Tab.Panel>
            <Tab.Panel key="redeem" className={"px-3 py-1"}>
              <div className="flex flex-col items-center gap-2">
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
                        Available:{" "}
                        {creditBalance
                          ? toLocaleString(formatDecimal(creditBalance, 2))
                          : 0}
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
                  extra="w-full !rounded-xl"
                  onClick={redeem}
                  disabled={
                    Number(value) > usdcAvailableToRedeem || !value ? true : false
                  }
                />
                <AlertMessage
                  type="info"
                  message={
                    <>
                      <p>
                        You will receive{" "}
                        <span className="font-bold">
                          {toLocaleString(
                            formatDecimal(Number(value) * 1 * conversionRate, 2)
                          )}{" "}
                          USDC
                        </span>
                      </p>
                    </>
                  }
                />
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </>
  )
}

export default MintOrRedeem
