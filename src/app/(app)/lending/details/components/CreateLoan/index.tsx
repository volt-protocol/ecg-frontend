import { readContract, waitForTransaction, writeContract } from "@wagmi/core"
import StepModal from "components/stepLoader"
import { Step } from "components/stepLoader/stepType"
import {
  TermABI,
  CreditABI,
  UsdcABI,
  ProfitManagerABI,
  profitManagerContract,
  creditContract,
} from "lib/contracts"
import React, { useEffect, useState } from "react"
import { toastError } from "components/toast"
import { UnitToDecimal } from "utils/utils-old"
import { Abi, Address, formatUnits, parseEther, parseUnits } from "viem"
import { erc20ABI, useAccount, useContractReads } from "wagmi"
import moment from "moment"
import { formatCurrencyValue, formatDecimal } from "utils/numbers"
import { AlertMessage } from "components/message/AlertMessage"
import ButtonPrimary from "components/button/ButtonPrimary"
import { LendingTerms } from "types/lending"
import { getTitleDisabled } from "./helper"
import DefiInputBox from "components/box/DefiInputBox"

function CreateLoan({
  lendingTerm,
  availableDebt,
  creditMultiplier,
  reload,
}: {
  lendingTerm: LendingTerms
  availableDebt: number
  creditMultiplier: bigint
  reload: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [borrowAmount, setBorrowAmount] = useState<string>("")
  const [collateralAmount, setCollateralAmount] = useState<number>(0)
  const [minCollateralAmount, setMinCollateralAmount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const { address, isConnected, isConnecting } = useAccount()
  const [showModal, setShowModal] = useState(false)
  const [preciseBorrowRatio, setPreciseBorrowRatio] = useState<bigint>(BigInt(0))
  const [minToRepay, setMinToRepay] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<moment.Moment | null>(null)

  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: `Approve ${lendingTerm.collateral.name}`, status: "Not Started" },
      { name: "Borrow", status: "Not Started" },
    ]

    // if (lendingTerm.openingFee > 0) {
    //   baseSteps.splice(1, 0, { name: "Approve gUSDC", status: "Not Started" })
    // }

    return baseSteps
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  /* Smart contract reads */
  const { data, isError, isLoading, refetch } = useContractReads({
    contracts: [
      {
        address: lendingTerm.collateral.address as Address,
        abi: erc20ABI as Abi,
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...profitManagerContract,
        functionName: "minBorrow",
      },
    ],
    select: (data) => {
      return {
        collateralBalance: Number(
          formatUnits(data[0].result as bigint, lendingTerm.collateral.decimals)
        ),
        minBorrow: Number(formatUnits(data[1].result as bigint, 18)),
      }
    },
  })
  /* End Smart contract reads */

  useEffect(() => {
    const preciseBorrowRatio = getPreciceBorrowRatio(borrowAmount)
    setPreciseBorrowRatio(preciseBorrowRatio)
    getMinToRepay()
  }, [borrowAmount])

  // setBigIntCollateralAmount(BigInt(UnitToDecimal(borrowAmount,collateralDecimals).toString())/BigInt(1e18 *borrowRatio))
  useEffect(() => {
    const collateralAmount: number = Number(borrowAmount) / lendingTerm.borrowRatio
    setCollateralAmount(collateralAmount)
    setMinCollateralAmount(collateralAmount)
  }, [borrowAmount])

  useEffect(() => {
    const currentDate = moment()
    const newDate = currentDate.add(lendingTerm.maxDelayBetweenPartialRepay, "seconds")
    setPaymentDate(newDate)
  }, [lendingTerm])

  /* Smart contract writes */
  async function borrow() {
    if (isConnected == false) {
      toastError("Please connect your wallet")
      setLoading(false)
      return
    }

    //check ratio
    if (Number(borrowAmount) < data?.minBorrow) {
      toastError(`Borrow amount can't be below than ${data?.minBorrow} `)
      return
    }
    if (Number(borrowAmount) > availableDebt) {
      toastError(`The max borrow amount is ${availableDebt} `)
      return
    }
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }
    setShowModal(true)
    updateStepStatus(`Approve ${lendingTerm.collateral.name}`, "In Progress")
    // approve collateral first

    try {
      const approve = await writeContract({
        address: lendingTerm.collateral.address,
        abi: UsdcABI,
        functionName: "approve",
        args: [
          lendingTerm.address,
          UnitToDecimal(collateralAmount, lendingTerm.collateral.decimals) >
          preciseBorrowRatio
            ? UnitToDecimal(collateralAmount, lendingTerm.collateral.decimals)
            : preciseBorrowRatio,
        ],
      })
      const checkApprove = await waitForTransaction({
        hash: approve.hash,
      })

      if (checkApprove.status != "success") {
        updateStepStatus(`Approve ${lendingTerm.collateral.name}`, "Error")
        setLoading(false)
        return
      }
    } catch (e) {
      console.log(e)
      updateStepStatus(`Approve ${lendingTerm.collateral.name}`, "Error")
      return
    }

    updateStepStatus(`Approve ${lendingTerm.collateral.name}`, "Success")

    // check si il y a un  open fees ==> approve credit
    // if (lendingTerm.openingFee > 0) {
    //   updateStepStatus("Approve gUSDC", "In Progress")
    //   try {
    //     const approveCredit = await writeContract({
    //       ...creditContract,
    //       functionName: "approve",
    //       args: [
    //         lendingTerm.address,
    //         UnitToDecimal(borrowAmount * lendingTerm.openingFee, 18),
    //       ],
    //     })
    //     const checkApproveCredit = await waitForTransaction({
    //       hash: approveCredit.hash,
    //     })

    //     if (checkApproveCredit.status != "success") {
    //       updateStepStatus("Approve gUSDC", "Error")
    //       return
    //     }
    //     updateStepStatus("Approve gUSDC", "Success")
    //   } catch (e) {
    //     console.log(e)
    //     updateStepStatus("Approve gUSDC", "Error")
    //     return
    //   }
    // }

    updateStepStatus("Borrow", "In Progress")
    try {
      const borrow = await writeContract({
        address: lendingTerm.address,
        abi: TermABI,
        functionName: "borrow",
        args: [parseEther(borrowAmount.toString()), preciseBorrowRatio],
      })
      const checkBorrow = await waitForTransaction({
        hash: borrow.hash,
      })

      if (checkBorrow.status === "success") {
        reload(true)
        setBorrowAmount("")
        updateStepStatus("Borrow", "Success")
        return
      } else updateStepStatus("Borrow", "Error")
    } catch (e) {
      console.log(e)
      updateStepStatus("Borrow", "Error")
      return
    }
  }
  /* End Smart contract writes */

  /* Handlers and getters */
  const handleBorrowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setBorrowAmount(inputValue as string)
    }
  }

  const setMax = () => {
    const maxBorrow = data?.collateralBalance * lendingTerm.borrowRatio
    setBorrowAmount(
      maxBorrow < availableDebt
        ? data?.collateralBalance * lendingTerm.borrowRatio
        : availableDebt
    )
  }

  const setAvailable = (): string => {
    const maxBorrow = data?.collateralBalance * lendingTerm.borrowRatio

    return maxBorrow < availableDebt
      ? formatDecimal(data?.collateralBalance * lendingTerm.borrowRatio, 2).toString()
      : formatDecimal(availableDebt, 2).toString()
  }

  function getPreciceBorrowRatio(borrowAmount): bigint {
    const preciseBorrowRatio =
      // BigInt(1) +
      (parseEther(borrowAmount.toString()) * creditMultiplier) /
        parseEther(lendingTerm.maxDebtPerCollateralToken.toString())
    return preciseBorrowRatio
  }

  async function getMinToRepay() {
    setMinToRepay(
      ((lendingTerm.minPartialRepayPercent * Number(borrowAmount)) / 100).toString()
    )
  }
  /* End Handlers and getters */

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
        {/* <div className="mt-4 flex justify-between">
          <div className="">
            Your Balance :{" "}
            <span className="font-bold">{formatDecimal(data?.collateralBalance, 2)}</span>{" "}
            {lendingTerm.collateral.name}
          </div>
          <div className="">
            Available Debt :{" "}
            <span className="font-bold">{formatCurrencyValue(availableDebt)}</span>
          </div>
        </div> */}

        <div>
          <DefiInputBox
            topLabel={"Amount of gUSDC to borrow"}
            currencyLogo="/img/crypto-logos/credit.png"
            currencySymbol='gUSDC'
            placeholder="0"
            pattern="^[0-9]*[.,]?[0-9]*$"
            inputSize="text-2xl sm:text-3xl"
            value={borrowAmount}
            onChange={handleBorrowChange}
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

          <DefiInputBox
            disabled={true}
            topLabel={
              "Amount of" + " " + lendingTerm.collateral.name + " " + "to deposit"
            }
            currencyLogo={lendingTerm.collateral.logo}
            currencySymbol={lendingTerm.collateral.name}
            placeholder="0"
            pattern="^[0-9]*[.,]?[0-9]*$"
            inputSize="text-xl xl:text-3xl"
            value={collateralAmount as number}
            rightLabel={
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Balance: {formatDecimal(data?.collateralBalance, 2)}
                </p>
              </>
            }
          />

          <ButtonPrimary
            variant="lg"
            title="Borrow"
            titleDisabled={getTitleDisabled(
              Number(borrowAmount),
              availableDebt,
              data?.collateralBalance,
              data?.minBorrow
            )}
            extra="w-full mt-4 !rounded-xl"
            onClick={borrow}
            disabled={
              Number(borrowAmount) < data?.minBorrow ||
              Number(borrowAmount) > availableDebt
            }
          />

          {Number(borrowAmount) < data?.minBorrow && (
            <AlertMessage
              type="danger"
              message={
                <p className="">
                  Minimum borrow is{" "}
                  <strong>{formatCurrencyValue(data?.minBorrow)}</strong> gUSDC
                </p>
              }
            />
          )}
          {lendingTerm.openingFee > 0 && Number(borrowAmount) >= data?.minBorrow && (
            <AlertMessage
              type="warning"
              message={
                <p>
                  <span className="font-bold">
                    {" "}
                    {formatDecimal(Number(borrowAmount) * lendingTerm.openingFee, 2)}{" "}
                    gUSDC{" "}
                  </span>{" "}
                  of interest will accrue instantly after opening the loan
                </p>
              }
            />
          )}
          {lendingTerm.maxDelayBetweenPartialRepay > 0 &&
            Number(borrowAmount) >= data?.minBorrow && (
              <AlertMessage
                type="warning"
                message={
                  <p className="">
                    You will have to repay <strong>{minToRepay}</strong> gUSDC by{" "}
                    <strong>{paymentDate?.format("DD/MM/YYYY HH:mm:ss")}</strong> or your
                    loan will be <strong> called</strong>
                  </p>
                }
              />
            )}
        </div>
      </div>
    </>
  )
}

export default CreateLoan
