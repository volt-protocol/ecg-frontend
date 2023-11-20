import { jsx } from "@emotion/react"
import { readContract, waitForTransaction, writeContract } from "@wagmi/core"
import StepModal from "components/stepLoader"
import { Step } from "components/stepLoader/stepType"
import { PsmUsdcABI, CreditABI, ProfitManagerABI, UsdcABI } from "lib/contracts"

import React, { useEffect, useState } from "react"
import {
  BsArrowDown,
  BsArrowDownLeft,
  BsArrowUpLeft,
  BsArrowUpRight,
} from "react-icons/bs"
import { style } from "./helper"
import {
  DecimalToUnit,
  UnitToDecimal,
  formatCurrencyValue,
  preciseRound,
  signTransferPermit,
} from "utils/utils-old"
import { Address } from "viem"
import { useAccount } from "wagmi"

function MintOrRedeem() {
  const [valuetoSend, setValuetoSend] = useState<number>(0)
  const [valueToReceive, setValueToReceive] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState<number>()
  const [creditBalance, setCreditBalance] = useState<number>()
  const { address, isConnected, isDisconnected } = useAccount()
  const [conversionRate, setConversionRate] = useState<number>(0)
  const [status, setStatus] = useState<string>("Mint")
  const [usdcAvailableToRedeem, setUsdcAvailableToRedeem] = useState<number>(0)
  const [showModal, setShowModal] = useState(false)
  const [reload, setReload] = useState(false)
  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: "Approve", status: "Not Started" },
      { name: "Mint", status: "Not Started" },
    ]

    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  async function getUsdcBalance(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_USDC_ADDRESS as Address,
      abi: UsdcABI,
      functionName: "balanceOf",
      args: [address],
    })
    console.log(DecimalToUnit(result as bigint, 6), "result")
    setUsdcBalance(DecimalToUnit(result as bigint, 6))
  }
  async function getCreditBalance(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
      abi: CreditABI,
      functionName: "balanceOf",
      args: [address],
    })
    console.log(DecimalToUnit(result as bigint, 18), "result")
    setCreditBalance(DecimalToUnit(result as bigint, 18))
  }

  async function getConversionRate(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_PROFIT_MANAGER_ADDRESS as Address,
      abi: ProfitManagerABI,
      functionName: "creditMultiplier",
    })
    if (status == "Mint") {
      setConversionRate(DecimalToUnit(result as bigint, 18))
    } else {
      setConversionRate(1 / DecimalToUnit(result as bigint, 18))
    }
  }
  async function getUsdcAvailableToRedeem(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_USDC_ADDRESS as Address,
      abi: UsdcABI,
      functionName: "balanceOf",
      args: [process.env.NEXT_PUBLIC_PSM_USDC_ADDRESS as Address],
    })
    setUsdcAvailableToRedeem(DecimalToUnit(result as bigint, 6))
  }

  useEffect(() => {
    getConversionRate()
    getUsdcAvailableToRedeem()
    if (isConnected) {
      getCreditBalance()
      getUsdcBalance()
      setReload(false)
    } else {
      setCreditBalance(undefined)
      setUsdcBalance(undefined)
    }
  }, [creditBalance, isConnected, reload, status])

  const updateStepStatus = (stepName: string, status: Step["status"]) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.name === stepName ? { ...step, status } : step
      )
    )
  }
  function updateStepName(oldName: string, newName: string) {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.name === oldName ? { ...step, name: newName } : step
      )
    )
  }

  async function mint() {
    setShowModal(true)
    try {
      updateStepStatus("Approve", "In Progress")
      // approve collateral first
      const approve = await writeContract({
        address: process.env.NEXT_PUBLIC_USDC_ADDRESS as Address,
        abi: UsdcABI,
        functionName: "approve",
        args: [
          process.env.NEXT_PUBLIC_PSM_USDC_ADDRESS as Address,
          UnitToDecimal(valuetoSend, 6),
        ],
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
        address: process.env.NEXT_PUBLIC_PSM_USDC_ADDRESS as Address,
        abi: PsmUsdcABI,
        functionName: "mint",
        args: [address, UnitToDecimal(valuetoSend, 6)],
      })
      const checkmint = await waitForTransaction({
        hash: mint.hash,
      })

      if (checkmint.status === "success") {
        updateStepStatus("Mint", "Success")
        setReload(true)
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
        address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
        abi: CreditABI,
        functionName: "approve",
        args: [
          process.env.NEXT_PUBLIC_PSM_USDC_ADDRESS as Address,
          UnitToDecimal(valuetoSend, 18),
        ],
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
        address: process.env.NEXT_PUBLIC_PSM_USDC_ADDRESS as Address,
        abi: PsmUsdcABI,
        functionName: "redeem",
        args: [address, UnitToDecimal(valuetoSend, 18)],
      })
      const checkredeem = await waitForTransaction({
        hash: redeem.hash,
      })

      if (checkredeem.status === "success") {
        setReload(true)
        updateStepStatus("Redeem", "Success")
        return
      } else updateStepStatus("Redeem", "Error")
    } catch (e) {
      updateStepStatus("Redeem", "Error")
      console.log(e)
    }
  }

  const handleBorrowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue) && inputValue != "") {
      setValuetoSend(parseFloat(inputValue))
    } else setValuetoSend(0)
  }

  const handleCollatteralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue) && inputValue != "") {
      setValueToReceive(parseFloat(inputValue))
    } else setValuetoSend(0)
  }

  // setBigIntCollateralAmount(BigInt(UnitToDecimal(valuetoSend,collateralDecimals).toString())/BigInt(1e18 *borrowRatio))
  useEffect(() => {
    if (valuetoSend != 0) {
      const valueToReceive: number = Number(
        preciseRound(valuetoSend / conversionRate, 2)
      )
      setValueToReceive(valueToReceive)
    } else {
      setValueToReceive(0)
    }
  }, [valuetoSend, conversionRate])
  
  return (
    <>
      <div className="mt-4 h-full rounded-xl text-gray-700 dark:text-gray-200">
        {showModal && (
          <StepModal
            steps={steps}
            close={setShowModal}
            initialStep={createSteps}
            setSteps={setSteps}
          />
        )}
        <div>
          <button
            onClick={() => setStatus("Mint")}
            className={`border-transparent border-b-4 px-6   hover:border-gray-200  ${
              status == "Mint" ? "text-black dark:text-white" : "text-gray-400"
            } `}
          >
            <div className="flex  w-full items-center space-x-2">
              {" "}
              <BsArrowUpRight />
              <p> Mint</p>
            </div>
          </button>
          <button
            onClick={() => setStatus("Redeem")}
            className={`border-b-transparent border-b-4 px-6 hover:border-gray-200  ${
              status == "Redeem"
                ? "text-black dark:text-white"
                : "text-gray-400"
            } `}
          >
            <div className="flex  w-full items-center space-x-2">
              <BsArrowDownLeft />
              <p> Redeem</p>
            </div>
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2  ">
          <div className="">
            Your Balance :{" "}
            <span className="font-semibold">
              {usdcBalance ? formatCurrencyValue(usdcBalance) : 0}
            </span>{" "}
            USDC
          </div>
          <div className="">
            Redeemable :{" "}
            <span className="font-semibold">
              {formatCurrencyValue(usdcAvailableToRedeem)}
            </span>{" "}
            USDC
          </div>
          <div className="">
            Your Balance :{" "}
            <span className="font-semibold">
              {creditBalance ? formatCurrencyValue(creditBalance) : 0}
            </span>{" "}
            CREDIT
          </div>
          <div className="">
            Rate :{" "}
            <span className="font-semibold">
              {" "}
              {preciseRound(conversionRate, 2)}
            </span>
            {status == "Mint" ? " USDC / CREDIT" : " CREDIT / USDC"}
          </div>
        </div>

        <div className={style.content}>
          <div className={style.formHeader}>
            {/* <div>Swap your credits to native tokens </div> */}
            <div></div>
          </div>
          <div className="relative mt-4 rounded-md">
            <input
              className="block w-full rounded-md border-2 border-gray-300 py-3 pl-7 pr-12 text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 focus:!ring-0 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:text-lg sm:leading-6"
              placeholder="0"
              pattern="^[0-9]*[.,]?[0-9]*$"
              value={valuetoSend}
              onChange={handleBorrowChange}
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 dark:text-gray-50 sm:text-lg">
                {status == "Mint" ? (
                  <div className="flex items-center space-x-2">
                    {" "}
                    <img className="h-8" src="img/usd-coin-usdc-logo.png" />
                    <p>USDC amount</p>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <img className="h-8" src="img/vite.svg" />
                    <p>CREDIT amount</p>{" "}
                  </div>
                )}
              </span>
            </div>
            <div className="w-full"></div>
          </div>
          <div className="relative mt-4 rounded-md">
            <input
              onChange={handleCollatteralChange}
              value={valueToReceive as number}
              className="block w-full rounded-md border-0 py-3 pl-7 pr-12 text-gray-500 ring-1 ring-inset ring-gray-300 transition-all duration-150 ease-in-out placeholder:text-gray-400  dark:bg-navy-700 dark:text-gray-50 dark:ring-navy-600 sm:text-lg sm:leading-6"
              placeholder="0"
              pattern="^[0-9]*[.,]?[0-9]*$"
              disabled={true}
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              {status != "Mint" ? (
                <div className="flex items-center space-x-2">
                  {" "}
                  <img className="h-8" src="img/usd-coin-usdc-logo.png" />
                  <p>USDC amount</p>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <img className="h-8" src="img/vite.svg" />
                  <p>CREDIT amount</p>{" "}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={status == "Mint" ? mint : redeem}
            className={style.confirmButton + "text-white"}
            disabled={
              (status === "Redeem" && valuetoSend > usdcAvailableToRedeem) ||
              !valuetoSend
                ? true
                : false
            }
          >
            {status == "Mint" ? "Mint" : "Redeem"}
          </button>
        </div>
      </div>
    </>
  )
}

export default MintOrRedeem
