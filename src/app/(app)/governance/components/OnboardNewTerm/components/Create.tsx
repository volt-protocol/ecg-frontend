import DropdownSelect from "components/select/DropdownSelect"
import StepModal from "components/stepLoader"
import { use, useEffect, useState } from "react"
import ButtonPrimary from "components/button/ButtonPrimary"
import { useForm, SubmitHandler } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import { ErrorMessage } from "components/message/ErrorMessage"
import clsx from "clsx"
import { waitForTransaction, writeContract, readContract } from "@wagmi/core"
import { lendingTermV1Implementation, onboardGovernorGuildContract } from "lib/contracts"
import { toastError } from "components/toast"
import { Step } from "components/stepLoader/stepType"
import { Address, parseEther } from "viem"
import { SECONDS_IN_YEAR } from "utils/constants"
import { erc20ABI, readContracts } from "wagmi"
import { MdCabin, MdCheck, MdCheckCircle, MdClose } from "react-icons/md"
import { formatNumberDecimal } from "utils/numbers"
import { getToken } from "./helper"

//Define form schema
const schema = yup
  .object({
    openingFee: yup.number().integer().max(10).required(),
    interestRate: yup.number().positive().max(100).required(),
    borrowRatio: yup.number().positive().required(),
    hardCap: yup.number().positive().required(),
  })
  .required()

export interface CreateTermForm {
  collateralToken: Address
  openingFee: number
  interestRate: number
  borrowRatio: number
  periodicPayments: "None" | "Weekly" | "Monthly" | "Quarterly" | "Yearly"
  hardCap: number
}

export default function Create() {
  const [showModal, setShowModal] = useState<boolean>(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("None")
  const { register, handleSubmit, watch, reset, formState } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
  })
  // const watchCollateralToken = watch("collateralToken")
  const watchBorrowRatio = watch("borrowRatio")
  const watchInterestRate = watch("interestRate")
  const [collateralToken, setCollateralToken] = useState<{
    symbol: string
    address: Address
    decimals: number
  }>({
    symbol: "USDC",
    address: "0xe9248437489bc542c68ac90e178f6ca3699c3f6b",
    decimals: 6,
  })

  const createSteps = (): Step[] => {
    return [{ name: "Propose Offboarding", status: "Not Started" }]
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  // useEffect(() => {
  //   if (
  //     watchCollateralToken &&
  //     watchCollateralToken.length == 42 &&
  //     watchCollateralToken.match(/^0x[A-Fa-f0-9]+$/i)
  //   ) {
  //     getTokenDetails(watchCollateralToken as Address)
  //   }
  // }, [watchCollateralToken])

  /* Form Validation */
  const onSubmit: SubmitHandler<any> = async (data) => {
    let minPartialRepayPercent
    let maxDelayBetweenPartialRepay
    const interestRate = Number(parseEther((data.interestRate / 100).toString()))

    switch (selectedPeriod) {
      case "None":
        minPartialRepayPercent = 0
        maxDelayBetweenPartialRepay = 0
        break
      case "Weekly":
        minPartialRepayPercent = Math.round(interestRate / 52)
        maxDelayBetweenPartialRepay = 7 * 24 * 3600
        break
      case "Monthly":
        minPartialRepayPercent = Math.round(interestRate / 12)
        maxDelayBetweenPartialRepay = SECONDS_IN_YEAR / 12
        break
      case "Quarterly":
        minPartialRepayPercent = Math.round(interestRate / 4)
        maxDelayBetweenPartialRepay = SECONDS_IN_YEAR / 4
        break
      case "Yearly":
        minPartialRepayPercent = interestRate
        maxDelayBetweenPartialRepay = SECONDS_IN_YEAR
        break
    }

    const args = {
      collateralToken: collateralToken.address,
      maxDebtPerCollateralToken:
        BigInt(parseEther(data.borrowRatio.toString())) *
        BigInt(10 ** (18 - collateralToken.decimals)),
      interestRate: interestRate,
      maxDelayBetweenPartialRepay: maxDelayBetweenPartialRepay,
      minPartialRepayPercent: minPartialRepayPercent,
      openingFee: parseEther((data.openingFee / 100).toString()),
      hardCap: parseEther(data.hardCap.toString()),
    }

    await createTerm(args)
  }

  /* Smart contract Write & Read */
  // const getTokenDetails = async (tokenAddress: Address): Promise<void> => {
  //   try {
  //     const result = await getToken(tokenAddress)
  //     if (result[0].status == "failure" || result[1].status == "failure") {
  //       toastError("Collateral address is not a valid ERC20 token")
  //     }

  //     setCollateralTokenDecimal(result[0].result)
  //     setCollateralTokenSymbol(result[1].result)
  //   } catch (e: any) {
  //     setCollateralTokenDecimal(undefined)
  //     setCollateralTokenSymbol(undefined)
  //     toastError("Collateral address is not a valid ERC20 token")
  //   }
  // }

  const createTerm = async (args: any): Promise<void> => {
    //Init Steps
    setSteps([{ name: "Create New Term", status: "Not Started" }])

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }

    try {
      setShowModal(true)
      updateStepStatus("Create New Term", "In Progress")

      const { hash } = await writeContract({
        ...onboardGovernorGuildContract,
        functionName: "createTerm",
        args: [lendingTermV1Implementation.address, args],
      })

      const tx = await waitForTransaction({
        hash: hash,
      })

      if (tx.status != "success") {
        updateStepStatus("Create New Term", "Error")
        return
      }

      updateStepStatus("Create New Term", "Success")
      reset() // reset form
      //TODO: trigger refetch terms in offboarding page
    } catch (e: any) {
      updateStepStatus("Create New Term", "Error")
      toastError(e.shortMessage)
    }
  }
  /* End Smart contract Write */

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
      <div className="px-1">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label
              htmlFor="collateralToken"
              className="text-md block font-medium leading-6 sm:pt-1.5"
            >
              Collateral Token
              {/* {collateralTokenDecimal && collateralTokenSymbol ? (
                <MdCheckCircle className="ml-1 inline text-green-500" />
              ) : (
                <MdClose className="ml-1 inline text-red-500" />
              )} */}
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              {/* <input
                {...register("collateralToken", {
                  required: true,
                  pattern: /^0x[A-Fa-f0-9]+$/i,
                })}
                type="text"
                name="collateralToken"
                id="collateralToken"
                placeholder="0xe44...7EeB"
                className={clsx(
                  formState.errors.collateralToken
                    ? "ring-red-500"
                    : "focus:ring-brand-400/80",
                  "sm:text-md block w-full rounded-md border-0 px-2 py-1.5 ring-1 ring-inset ring-gray-300 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:ring-2 focus:ring-inset  sm:leading-6"
                )}
              /> */}
              <DropdownSelect
                {...register("collateralToken")}
                options={[
                  {
                    symbol: "USDC",
                    address: "0xe9248437489bc542c68ac90e178f6ca3699c3f6b",
                    decimals: 6,
                  },
                  {
                    symbol: "sDAI",
                    address: "0xeef0ab67262046d5bed00ce9c447e08d92b8da61",
                    decimals: 18,
                  },
                  {
                    symbol: "WBTC",
                    address: "0xcffba3a25c3cc99a05443163c63209972bffd1c1",
                    decimals: 8,
                  },
                ]}
                selectedOption={collateralToken}
                onChange={setCollateralToken}
                getLabel={(item) => {
                  return `${item.symbol} - ${item.address}`
                }}
                extra={"w-full"}
              />
            </div>
          </div>
          <ErrorMessage
            title={formState.errors.collateralToken?.message}
            variant="error"
          />
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label
              htmlFor="openingFee"
              className="text-md block font-medium leading-6 sm:pt-1.5"
            >
              Opening Fee
            </label>
            <div className="relative mt-2 rounded-md sm:col-span-2 sm:mt-0">
              <input
                {...register("openingFee")}
                type="number"
                name="openingFee"
                id="openingFee"
                placeholder="0"
                className={clsx(
                  formState.errors.openingFee
                    ? "ring-red-500"
                    : "focus:ring-brand-400/80",
                  "sm:text-md block w-full rounded-md border-0 py-1.5 pl-2 pr-10 ring-1 ring-inset ring-gray-300 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:ring-2 focus:ring-inset dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-gray-300 sm:leading-6"
                )}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="sm:text-md text-gray-500" id="price-currency">
                  %
                </span>
              </div>
            </div>
          </div>
          <ErrorMessage title={formState.errors.openingFee?.message} variant="error" />
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label
              htmlFor="interestRate"
              className="text-md block font-medium leading-6 sm:pt-1.5"
            >
              Interest Rate
            </label>
            <div className="relative mt-2 rounded-md sm:col-span-2 sm:mt-0">
              <input
                {...register("interestRate")}
                type="number"
                step=".01"
                name="interestRate"
                id="interestRate"
                placeholder="0.00"
                className={clsx(
                  formState.errors.interestRate
                    ? "ring-red-500"
                    : "focus:ring-brand-400/80",
                  "sm:text-md block w-full rounded-md border-0 py-1.5 pl-2 pr-10 ring-1 ring-inset ring-gray-300 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:ring-2 focus:ring-inset dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-gray-300 sm:leading-6"
                )}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="sm:text-md text-gray-500" id="price-currency">
                  %
                </span>
              </div>
            </div>
          </div>
          <ErrorMessage title={formState.errors.interestRate?.message} variant="error" />
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label
              htmlFor="borrowRatio"
              className="text-md block font-medium leading-6 sm:pt-1.5"
            >
              Borrow Ratio
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <input
                {...register("borrowRatio")}
                type="number"
                step=".01"
                name="borrowRatio"
                id="borrowRatio"
                placeholder="0.00"
                className={clsx(
                  formState.errors.borrowRatio
                    ? "ring-red-500"
                    : "focus:ring-brand-400/80",
                  "sm:text-md block w-full rounded-md border-0 py-1.5 pl-2 pr-10 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-gray-300 sm:leading-6"
                )}
              />
            </div>
          </div>
          <ErrorMessage title={formState.errors.borrowRatio?.message} variant="error" />
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label
              htmlFor="periodicPayments"
              className="text-md block font-medium leading-6 sm:pt-1.5"
            >
              Periodic Payments
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <DropdownSelect
                {...register("interestRate")}
                options={["None", "Weekly", "Monthly", "Quarterly", "Yearly"]}
                selectedOption={selectedPeriod}
                onChange={setSelectedPeriod}
                getLabel={(item) => item}
                extra={"w-full"}
              />
            </div>
          </div>
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label
              htmlFor="hardCap"
              className="text-md block font-medium leading-6 sm:pt-1.5"
            >
              Hard Cap
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <input
                {...register("hardCap")}
                type="number"
                name="hardCap"
                id="hardCap"
                placeholder="1000000"
                className={clsx(
                  formState.errors.hardCap ? "ring-red-500" : "focus:ring-brand-400/80",
                  "sm:text-md block w-full rounded-md border-0 py-1.5 pl-2 pr-10 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-gray-300 sm:leading-6"
                )}
              />
            </div>
          </div>
          <ErrorMessage title={formState.errors.hardCap?.message} variant="error" />
          <div className="mt-6 block w-full">
            <ButtonPrimary
              type="submit"
              title={`Create New Term ${collateralToken.symbol}-${
                watchInterestRate ? formatNumberDecimal(watchInterestRate) + "%" : "0.00"
              }-${formatNumberDecimal(watchBorrowRatio)}`}
              extra="w-full"
              disabled={!collateralToken.decimals || !formState.isValid}
            />
          </div>
        </form>
      </div>
    </>
  )
}
