import { readContract, waitForTransaction, writeContract } from "@wagmi/core"
import StepModal from "components/stepLoader"
import { Step } from "components/stepLoader/stepType"
import { TermABI, CreditABI, UsdcABI, ProfitManagerABI } from "lib/contracts"
import React, { useEffect, useState } from "react"
import { MdOutlineError, MdWarning } from "react-icons/md"
import { toastError, toastRocket } from "components/toast"
import {
  DecimalToUnit,
  UnitToDecimal,
  formatCurrencyValue,
  preciseRound,
} from "utils/utils-old"
import { Address } from "viem"
import { useAccount } from "wagmi"
import moment from "moment"
import { formatDecimal } from "utils/numbers"
import { getInputStyle } from "./helper"

function CreateLoan({
  name,
  contractAddress,
  collateralAddress,
  collateralDecimals,
  openingFee,
  minBorrow,
  borrowRatio,
  currentDebt,
  availableDebt,
  maxDelayBetweenPartialRepay,
  reload,
}: {
  name: string
  contractAddress: string
  collateralAddress: string
  collateralDecimals: number
  openingFee: number
  minBorrow: number
  borrowRatio: number
  callFee: number
  currentDebt: number
  availableDebt: number
  maxDelayBetweenPartialRepay: number
  reload: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [borrowAmount, setBorrowAmount] = useState<number>(0)
  const [collateralAmount, setCollateralAmount] = useState<number>(0)
  const [minCollateralAmount, setMinCollateralAmount] = useState<number>(0)
  const [permitMessage, setPermitMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [collateralAmountAvailable, setCollateralAmountAvailable] =
    useState<number>(0)
  const { address, isConnected, isConnecting } = useAccount()
  const [showModal, setShowModal] = useState(false)
  const [preciseBorrowRatio, setPreciseBorrowRatio] = useState<bigint>(
    BigInt(0)
  )
  const [minToRepay, setMinToRepay] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<moment.Moment | null>(null)
  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: `Approve ${name}`, status: "Not Started" },
      { name: "Borrow", status: "Not Started" },
    ]

    if (openingFee > 0) {
      baseSteps.splice(1, 0, { name: "Approve CREDIT", status: "Not Started" })
    }

    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())
  const inputStyles = getInputStyle(minBorrow, borrowAmount)

  useEffect(() => {
    async function getCollateralAmountAvailable(): Promise<void> {
      const result = await readContract({
        address: collateralAddress as Address,
        abi: UsdcABI,
        functionName: "balanceOf",
        args: [address],
      })
      setCollateralAmountAvailable(
        DecimalToUnit(result as bigint, collateralDecimals)
      )
    }
    getCollateralAmountAvailable()
  }, [isConnected])

  async function borrow() {
    if (isConnected == false) {
      toastError("Please connect your wallet")
      setLoading(false)
      return
    }

    //check ratio
    if (borrowAmount < minBorrow) {
      toastError(`Borrow amount can't be below than ${minBorrow} `)
      return
    }
    if (borrowAmount > availableDebt) {
      toastError(`The max borrow amount is ${availableDebt} `)
      return
    }
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      )
    }
    setShowModal(true)
    updateStepStatus(`Approve ${name}`, "In Progress")
    // approve collateral first
    try {
      const approve = await writeContract({
        address: collateralAddress,
        abi: UsdcABI,
        functionName: "approve",
        args: [
          contractAddress,
          UnitToDecimal(collateralAmount, collateralDecimals) >
          preciseBorrowRatio
            ? UnitToDecimal(collateralAmount, collateralDecimals)
            : preciseBorrowRatio,
        ],
      })
      const checkApprove = await waitForTransaction({
        hash: approve.hash,
      })

      if (checkApprove.status != "success") {
        updateStepStatus(`Approve ${name}`, "Error")
        setLoading(false)
        return
      }
    } catch (e) {
      console.log(e)
      updateStepStatus(`Approve ${name}`, "Error")
      return
    }

    updateStepStatus(`Approve ${name}`, "Success")

    // check si il y a un  open fees ==> approve credit
    if (openingFee > 0) {
      updateStepStatus("Approve CREDIT", "In Progress")
      try {
        const approveCredit = await writeContract({
          address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS,
          abi: CreditABI,
          functionName: "approve",
          args: [contractAddress, UnitToDecimal(borrowAmount * openingFee, 18)],
        })
        const checkApproveCredit = await waitForTransaction({
          hash: approveCredit.hash,
        })

        if (checkApproveCredit.status != "success") {
          updateStepStatus("Approve CREDIT", "Error")
          return
        }
        updateStepStatus("Approve CREDIT", "Success")
      } catch (e) {
        console.log(e)
        updateStepStatus("Approve CREDIT", "Error")
        return
      }
    }

    updateStepStatus("Borrow", "In Progress")
    try {
      const borrow = await writeContract({
        address: contractAddress,
        abi: TermABI,
        functionName: "borrow",
        args: [UnitToDecimal(borrowAmount, 18), preciseBorrowRatio],
      })
      const checkBorrow = await waitForTransaction({
        hash: borrow.hash,
      })

      if (checkBorrow.status === "success") {
        reload(true)
        updateStepStatus("Borrow", "Success")
        return
      } else updateStepStatus("Borrow", "Error")
    } catch (e) {
      console.log(e)
      updateStepStatus("Borrow", "Error")
      return
    }
  }

  const handleBorrowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*\.?\d*$/.test(inputValue) && inputValue != "") {
      setBorrowAmount(parseFloat(inputValue))
    } else setBorrowAmount(0)
  }
  const handleCollatteralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*\.?\d*$/.test(inputValue) && inputValue != "") {
      setCollateralAmount(parseFloat(inputValue))
    } else setBorrowAmount(0)
  }

  async function getPrecicseBorrowRatio() {
    const borrowRatio = await readContract({
      address: contractAddress as Address,
      abi: TermABI,
      functionName: "maxDebtPerCollateralToken",
    })

    const creditMultiplier = await readContract({
      address: process.env.NEXT_PUBLIC_PROFIT_MANAGER_ADDRESS as Address,
      abi: ProfitManagerABI,
      functionName: "creditMultiplier",
    })
    const preciseBorrowRatio =
      BigInt(1) +
      (BigInt(borrowAmount) * BigInt(1e18) * (creditMultiplier as bigint)) /
        (borrowRatio as bigint)
    setPreciseBorrowRatio(preciseBorrowRatio)
  }

  async function getMinToRepay() {
    const minToRepay = await readContract({
      address: contractAddress as Address,
      abi: TermABI,
      functionName: "minPartialRepayPercent",
    })
    setMinToRepay(
      preciseRound(DecimalToUnit(minToRepay as bigint, 18) * borrowAmount, 2)
    )
  }

  useEffect(() => {
    getPrecicseBorrowRatio()
    getMinToRepay()
  }, [borrowAmount])

  // setBigIntCollateralAmount(BigInt(UnitToDecimal(borrowAmount,collateralDecimals).toString())/BigInt(1e18 *borrowRatio))
  useEffect(() => {
    const collateralAmount: number = Number(
      preciseRound(borrowAmount / borrowRatio, collateralDecimals)
    )
    setCollateralAmount(collateralAmount)
    setMinCollateralAmount(collateralAmount)
  }, [borrowAmount])

  useEffect(() => {
    const currentDate = moment()
    const newDate = currentDate.add(maxDelayBetweenPartialRepay, "seconds")
    setPaymentDate(newDate)
  }, [maxDelayBetweenPartialRepay])

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

      <div className="h-full rounded-md text-gray-700 dark:text-gray-200">
        <div className="mt-4 flex justify-between">
          <div className="">
            Your Balance :{" "}
            <span className="font-bold">
              {formatDecimal(collateralAmountAvailable, 2)}
            </span>{" "}
            {name}
          </div>
          <div className="">
            Available Debt :{" "}
            <span className="font-bold">
              {formatCurrencyValue(availableDebt)}
            </span>
          </div>
        </div>

        <div className={inputStyles.content}>
          <div className="mt-4">
            <label
              htmlFor="price"
              className="block text-sm font-medium leading-6 text-gray-500 dark:text-gray-200"
            >
              Borrow Amount
            </label>
            <div className="relative mt-1 rounded-md">
              <input
                className="block w-full rounded-md border-2 border-gray-300 py-3 pl-7 pr-12 text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 focus:!ring-0 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:text-lg sm:leading-6"
                placeholder="0"
                pattern="^[0-9]*[.,]?[0-9]*$"
                value={borrowAmount}
                onChange={handleBorrowChange}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 dark:text-gray-50 sm:text-lg">
                  CREDIT
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="price"
              className="block text-sm font-medium leading-6 text-gray-500 dark:text-gray-200"
            >
              Collateral amount
            </label>
            <div className="relative mt-1 rounded-md">
              <input
                type="text"
                className="block w-full rounded-md border-0 py-3 pl-7 pr-12 text-gray-500 ring-1 ring-inset ring-gray-300 transition-all duration-150 ease-in-out placeholder:text-gray-400  dark:bg-navy-700 dark:text-gray-50 dark:ring-navy-600 sm:text-lg sm:leading-6"
                onChange={handleCollatteralChange}
                value={collateralAmount as number}
                placeholder="0"
                pattern="^[0-9]*[.,]?[0-9]*$"
                disabled={true}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 dark:text-gray-50 sm:text-lg">
                  {name}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={borrow}
            className={inputStyles.confirmButton}
            disabled={borrowAmount < minBorrow ? true : false}
          >
            Borrow
          </button>
          {openingFee > 0 && (
            <div className="rounded-md my-4 flex text-sm items-center justify-center gap-x-3 bg-amber-100 dark:bg-amber-100/0 px-2.5 py-1.5 text-amber-500/90 dark:text-amber-500">
              <MdWarning className="w-5 h-5"/>
              <p>
                You will have to pay{" "}
                <span className="font-bold">
                  {" "}
                  {preciseRound(borrowAmount * openingFee, 2)} CREDIT{" "}
                </span>{" "}
                to open this loan
              </p>
            </div>
          )}
          {maxDelayBetweenPartialRepay > 0 && (
            <div className="rounded-md my-4 flex text-sm items-center justify-center gap-2 bg-amber-100 dark:bg-amber-100/0 px-2.5 py-1.5 text-amber-500/90 dark:text-amber-500">
              <MdWarning className="w-6 h-6"/>
              <p className="">
                You will have to repay <strong>{minToRepay}</strong> CREDIT by{" "}
                <strong>{paymentDate?.format("DD/MM/YYYY HH:mm:ss")}</strong> or
                your loan will be <strong> called</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default CreateLoan
