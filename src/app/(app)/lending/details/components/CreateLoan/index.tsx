import { readContract, waitForTransactionReceipt, writeContract } from "@wagmi/core"
import StepModal from "components/stepLoader"
import { Step } from "components/stepLoader/stepType"
import {
  ERC20PermitABI,
  TermABI,
  UsdcABI,
  profitManagerContract,
  psmUsdcContract,
  gatewayContract,
  creditContract,
} from "lib/contracts"
import React, { useEffect, useState } from "react"
import { erc20Abi, Abi, Address, formatUnits, parseEther, parseUnits } from "viem"
import moment from "moment"
import { formatCurrencyValue, formatDecimal } from "utils/numbers"
import { AlertMessage } from "components/message/AlertMessage"
import ButtonPrimary from "components/button/ButtonPrimary"
import { LendingTerms } from "types/lending"
import { getTitleDisabled } from "./helper"
import { simpleBorrow } from "./helper/simpleBorrow"
import DefiInputBox from "components/box/DefiInputBox"
import { wagmiConfig } from "contexts/Web3Provider"
import { RangeSlider } from "components/rangeSlider/RangeSlider"
import { useAccount, useReadContracts } from "wagmi"
import { borrowConfig, permitConfig } from "config"
import { signPermit } from "lib/transactions/signPermit"
import { getMulticallsDecoded } from "lib/transactions/getMulticallsDecoded"
import { borrowWithLeverage } from "./helper/borrowWithLeverage"

function CreateLoan({
  lendingTerm,
  availableDebt,
  creditMultiplier,
  usdcBalance,
  gusdcNonces,
  minBorrow,
  reload,
}: {
  lendingTerm: LendingTerms
  availableDebt: number
  creditMultiplier: bigint
  usdcBalance: bigint
  gusdcNonces: bigint
  minBorrow: number
  reload: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const { address, isConnected, isConnecting } = useAccount()
  const [borrowAmount, setBorrowAmount] = useState<bigint>(BigInt(0))
  const [collateralAmount, setCollateralAmount] = useState<string>("")
  const [showModal, setShowModal] = useState(false)
  const [minToRepay, setMinToRepay] = useState<string>("")
  const [withLeverage, setWithLeverage] = useState<boolean>(false)
  const [leverageValue, setLeverageValue] = useState<number>(1)
  const [withOverCollateralization, setWithOverCollateralization] =
    useState<boolean>(true)
  const [overCollateralizationValue, setOverCollateralizationValue] =
    useState<number>(105)
  const [flashLoanBorrowAmount, setFlashLoanBorrowAmount] = useState<bigint>(BigInt(0))
  const [flashLoanCollateralAmount, setFlashLoanCollateralAmount] = useState<bigint>(
    BigInt(0)
  )

  const createSteps = (): Step[] => {
    const baseSteps = [
      permitConfig.find(
        (item) => item.collateralAddress === lendingTerm.collateral.address
      )?.hasPermit
        ? {
            name: `Sign Permit for ${lendingTerm.collateral.symbol}`,
            status: "Not Started",
          }
        : { name: `Approve ${lendingTerm.collateral.symbol}`, status: "Not Started" },
      { name: `Sign Permit for gUSDC`, status: "Not Started" },
      { name: "Multicall", status: "Not Started" },
    ]

    return baseSteps
  }

  function updateStepName(oldName: string, newName: string) {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.name === oldName ? { ...step, name: newName } : step))
    )
  }

  const updateStepStatus = (
    stepName: string,
    status: Step["status"],
    description?: any[]
  ) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.name === stepName ? { ...step, status, description: description } : step
      )
    )
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  /* Smart contract reads */
  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: lendingTerm.collateral.address as Address,
        abi: erc20Abi as Abi,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: lendingTerm.collateral.address as Address,
        abi: ERC20PermitABI as Abi,
        functionName: "nonces",
        args: [address],
      },
    ],
    query: {
      select: (data) => {
        return {
          collateralBalance: formatUnits(
            data[0].result as bigint,
            lendingTerm.collateral.decimals
          ),
          collateralNonces: data[1].result as bigint,
        }
      },
    },
  })
  /* End Smart contract reads */

  useEffect(() => {
    if (borrowAmount) {
      // const preciseCollateralAmnount = getPreciseCollateralAmount(borrowAmount)
      // setPreciseCollateralAmount(preciseCollateralAmnount)
      getMinToRepay()
    }
  }, [borrowAmount])

  /* Calculate borrow amount */
  useEffect(() => {
    const borrowAmount: bigint = calculateBorrowAmount(collateralAmount)
    const flashLoanBorrowAmount: bigint = calculateBorrowAmount(
      (Number(collateralAmount) * (leverageValue - 1)).toString()
    )

    const flashLoanCollateralAmount =
      (parseUnits(collateralAmount, lendingTerm.collateral.decimals) *
        parseUnits((leverageValue - 1).toString(), 1)) /
      BigInt(10)

    console.log("collateralAmount:", collateralAmount)
    console.log("flashLoanCollateralAmount:", flashLoanCollateralAmount)
    console.log("borrowAmount:", borrowAmount)
    console.log("flashLoanBorrowAmount:", flashLoanBorrowAmount)
    console.log("overCollateralizationValue:", overCollateralizationValue)

    setBorrowAmount(borrowAmount)
    setFlashLoanBorrowAmount(flashLoanBorrowAmount)
    setFlashLoanCollateralAmount(flashLoanCollateralAmount)
  }, [collateralAmount, overCollateralizationValue, leverageValue])

  /****** Smart contract writes *******/

  async function borrow() {
    setShowModal(true)
    let signatureCollateral: any
    let signatureGUSDC: any

    /* Set allowance for collateral token */
    if (
      permitConfig.find(
        (item) => item.collateralAddress === lendingTerm.collateral.address
      )?.hasPermit
    ) {
      try {
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "In Progress")

        signatureCollateral = await signPermit({
          contractAddress: lendingTerm.collateral.address,
          erc20Name:lendingTerm.collateral.name,
          ownerAddress: address,
          spenderAddress: gatewayContract.address as Address,
          value: parseUnits(collateralAmount, lendingTerm.collateral.decimals),
          deadline: BigInt(Number(moment().add(10, "seconds"))),
          nonce: data?.collateralNonces,
          chainId: wagmiConfig.chains[0].id,
          permitVersion: "1",
        })

        if (!signatureCollateral) {
          updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
          return
        }
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Success")
      } catch (e) {
        console.log(e)
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
        return
      }
    } else {
      try {
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "In Progress")

        const hash = await writeContract(wagmiConfig, {
          address: lendingTerm.collateral.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [
            gatewayContract.address as Address,
            parseUnits(collateralAmount, lendingTerm.collateral.decimals),
          ],
        })
        const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
          hash: hash,
        })

        if (checkApprove.status != "success") {
          updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
          return
        }
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Success")
      } catch (e) {
        console.log(e)
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
        return
      }
    }

    /* Set allowance for gUSDC token */
    try {
      updateStepStatus(`Sign Permit for gUSDC`, "In Progress")

      signatureGUSDC = await signPermit({
        contractAddress: creditContract.address as Address,
        erc20Name: "Ethereum Credit Guild - gUSDC",
        ownerAddress: address,
        spenderAddress: gatewayContract.address as Address,
        value: borrowAmount,
        deadline: BigInt(Number(moment().add(10, "seconds"))),
        nonce: gusdcNonces,
        chainId: wagmiConfig.chains[0].id,
        permitVersion: "1",
      })

      if (!signatureGUSDC) {
        updateStepStatus(`Sign Permit for gUSDC`, "Error")
        return
      }
      updateStepStatus(`Sign Permit for gUSDC`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus(`Sign Permit for gUSDC`, "Error")
      return
    }

    /* Call gateway.multicall() */
    try {
      const calls = simpleBorrow(
        address,
        lendingTerm,
        borrowAmount,
        parseUnits(collateralAmount, lendingTerm.collateral.decimals),
        signatureCollateral,
        signatureGUSDC
      )

      const callsDescription = getMulticallsDecoded(calls, lendingTerm)
      updateStepStatus(`Multicall`, "In Progress", callsDescription)

      const hash = await writeContract(wagmiConfig, {
        ...gatewayContract,
        functionName: "multicall",
        args: [calls],
      })

      const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (checkBorrow.status === "success") {
        refetch()
        reload(true)
        setBorrowAmount(BigInt(0))
        setCollateralAmount("")
        updateStepStatus("Multicall", "Success")
        return
      } else {
        updateStepStatus("Multicall", "Error")
      }

      updateStepStatus(`Multicall`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Multicall", "Error")
      return
    }
  }

  async function borrowLeverage() {
    setShowModal(true)
    updateStepName("Multicall", "Multicall with Leverage")
    let signatureCollateral: any
    let signatureGUSDC: any
    const debtAmount = borrowAmount + flashLoanBorrowAmount

    /* Set allowance for collateral token */
    if (
      permitConfig.find(
        (item) => item.collateralAddress === lendingTerm.collateral.address
      )?.hasPermit
    ) {
      try {
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "In Progress")

        signatureCollateral = await signPermit({
          contractAddress: lendingTerm.collateral.address,
          erc20Name:lendingTerm.collateral.name,
          ownerAddress: address,
          spenderAddress: gatewayContract.address as Address,
          value: parseUnits(collateralAmount, lendingTerm.collateral.decimals),
          deadline: BigInt(Number(moment().add(10, "seconds"))),
          nonce: data?.collateralNonces,
          chainId: wagmiConfig.chains[0].id,
          permitVersion: "1",
        })

        if (!signatureCollateral) {
          updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
          return
        }
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Success")
      } catch (e) {
        console.log(e)
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
        return
      }
    } else {
      try {
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "In Progress")

        const hash = await writeContract(wagmiConfig, {
          address: lendingTerm.collateral.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [
            gatewayContract.address as Address,
            parseUnits(collateralAmount, lendingTerm.collateral.decimals),
          ],
        })
        const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
          hash: hash,
        })

        if (checkApprove.status != "success") {
          updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
          return
        }
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Success")
      } catch (e) {
        console.log(e)
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
        return
      }
    }

    /* Set allowance for gUSDC token */
    try {
      updateStepStatus(`Sign Permit for gUSDC`, "In Progress")

      signatureGUSDC = await signPermit({
        contractAddress: creditContract.address as Address,
        erc20Name: "Ethereum Credit Guild - gUSDC",
        ownerAddress: address,
        spenderAddress: gatewayContract.address as Address,
        value: debtAmount,
        deadline: BigInt(Number(moment().add(10, "seconds"))),
        nonce: gusdcNonces,
        chainId: wagmiConfig.chains[0].id,
        permitVersion: "1",
      })

      if (!signatureGUSDC) {
        updateStepStatus(`Sign Permit for gUSDC`, "Error")
        return
      }
      updateStepStatus(`Sign Permit for gUSDC`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus(`Sign Permit for gUSDC`, "Error")
      return
    }

    const amountUSDC = await readContract(wagmiConfig, {
      ...psmUsdcContract,
      functionName: "getRedeemAmountOut",
      args: [debtAmount],
    })

    console.log(amountUSDC)

    const deadlineSwap = BigInt(Number(moment().add(3600, "seconds")))

    /* Call gateway.multicall() */
    try {
      const calls = borrowWithLeverage(
        address,
        lendingTerm,
        debtAmount,
        parseUnits(collateralAmount, lendingTerm.collateral.decimals),
        flashLoanCollateralAmount,
        amountUSDC as bigint,
        signatureCollateral,
        signatureGUSDC,
        deadlineSwap
      )

      const callsDescription = getMulticallsDecoded(calls, lendingTerm)
      updateStepStatus(`Multicall with Leverage`, "In Progress", callsDescription)

      const hash = await writeContract(wagmiConfig, {
        ...gatewayContract,
        functionName: "multicallWithBalancerFlashLoan",
        args: [[lendingTerm.collateral.address], [flashLoanCollateralAmount], calls],
      })

      const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (checkBorrow.status === "success") {
        refetch()
        reload(true)
        setBorrowAmount(BigInt(0))
        setCollateralAmount("")
        updateStepStatus("Multicall with Leverage", "Success")
        return
      } else {
        updateStepStatus("Multicall with Leverage", "Error")
      }

      updateStepStatus(`Multicall with Leverage`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Multicall with Leverage", "Error")
      return
    }
  }

  /* End Smart contract writes */

  /* Handlers and getters */
  const calculateBorrowAmount = (collateralAmount: string) => {
    let borrowAmount: bigint =
      overCollateralizationValue != 0
        ? (((parseUnits(collateralAmount, lendingTerm.collateral.decimals) *
            BigInt(10 ** (18 - lendingTerm.collateral.decimals)) *
            parseUnits(lendingTerm.borrowRatio.toString(), 18)) /
            creditMultiplier) *
            parseUnits('1', 18)) /
          parseUnits(Number(overCollateralizationValue / 100).toString(), 18)
        : (parseUnits(collateralAmount, lendingTerm.collateral.decimals) *
            BigInt(10 ** (18 - lendingTerm.collateral.decimals)) *
            parseUnits(lendingTerm.borrowRatio.toString(), 18)) /
          creditMultiplier
    return borrowAmount
  }

  // const calculateBorrowAmount = (collateralAmount: string) => {
  //   let borrowAmount: bigint =
  //     overCollateralizationValue != 0
  //       ? (parseUnits(
  //           (
  //             (parseUnits(collateralAmount, lendingTerm.collateral.decimals) *
  //               BigInt(lendingTerm.borrowRatio)) /
  //             creditMultiplier
  //           ).toString(),
  //           18
  //         ) /
  //           BigInt(Number(overCollateralizationValue))) *
  //         BigInt(100)
  //       : parseUnits(
  //           (
  //             (parseUnits(collateralAmount, lendingTerm.collateral.decimals) *
  //               BigInt(lendingTerm.borrowRatio)) /
  //             creditMultiplier
  //           ).toString(),
  //           18
  //         )
  //   return borrowAmount
  // }

  const handleCollateralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^[0-9]*\.?[0-9]*$/i.test(inputValue)) {
      setCollateralAmount(inputValue as string)
    }
  }

  const setMax = () => {
    //max borrow of gUSDC given the collateral amount in wallet
    const maxBorrow =
      (Number(data?.collateralBalance) * lendingTerm.borrowRatio) /
      Number(formatUnits(creditMultiplier, 18))

    setCollateralAmount(
      maxBorrow < availableDebt
        ? data?.collateralBalance.toString()
        : (
            (availableDebt / lendingTerm.borrowRatio) *
            Number(formatUnits(creditMultiplier, 18))
          ).toString()
    )
  }

  async function getMinToRepay() {
    setMinToRepay(
      (
        (lendingTerm.minPartialRepayPercent * Number(formatUnits(borrowAmount, 18))) /
        100
      ).toString()
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
        <div className="mt-2 flex flex-col gap-2">
          <DefiInputBox
            topLabel={
              "Amount of" + " " + lendingTerm.collateral.symbol + " " + "to deposit"
            }
            currencyLogo={lendingTerm.collateral.logo}
            currencySymbol={lendingTerm.collateral.symbol}
            placeholder="0"
            pattern="[0-9]*\.[0-9]"
            inputSize="text-2xl xl:text-3xl"
            value={collateralAmount}
            onChange={handleCollateralChange}
            rightLabel={
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available: {formatDecimal(Number(data?.collateralBalance), 2)}
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
            topLabel={"Amount of USDC to borrow"}
            currencyLogo="/img/crypto-logos/usdc.png"
            currencySymbol="USDC"
            placeholder="0"
            pattern="[0-9]*\.[0-9]"
            inputSize="text-2xl xl:text-3xl"
            // value={formatUnits(borrowAmount * creditMultiplier, 18)} //display amount borrowed in USDC
            value={formatDecimal(
              Number(formatUnits(borrowAmount + flashLoanBorrowAmount, 18)) *
                Number(formatUnits(creditMultiplier, 18)),
              2
            )}
            rightLabel={
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Balance: {formatDecimal(Number(formatUnits(usdcBalance, 6)), 2)}
                </p>
              </>
            }
          />

          <div className="flex flex-col gap-4 rounded-xl bg-gray-100 py-4 dark:bg-navy-900">
            <div className="w-full px-5">
              <RangeSlider
                withSwitch={true}
                title={`Over-collateralization: ${overCollateralizationValue}%`}
                value={overCollateralizationValue}
                onChange={(value) => setOverCollateralizationValue(value)}
                min={105}
                max={300}
                step={1}
                show={withOverCollateralization}
                setShow={() => {
                  setOverCollateralizationValue(withOverCollateralization ? 0 : 105)
                  setWithOverCollateralization(!withOverCollateralization)
                  setWithLeverage(false)
                  setLeverageValue(1)
                }}
              />
            </div>

            {borrowConfig.find((item) => item.termAddress === lendingTerm.address)
              ?.hasLeverage && (
              <div className="mt w-full px-5">
                <RangeSlider
                  withSwitch={true}
                  title={`Leverage: ${leverageValue}x`}
                  value={leverageValue}
                  onChange={(value) => setLeverageValue(value)}
                  min={1}
                  max={
                    borrowConfig.find((item) => item.termAddress === lendingTerm.address)
                      ?.maxLeverage
                  }
                  step={0.1}
                  show={withLeverage}
                  setShow={() => {
                    setLeverageValue(1)
                    setWithLeverage(!withLeverage)
                    setWithOverCollateralization(false)
                    setOverCollateralizationValue(0)
                  }}
                />
              </div>
            )}
          </div>
          <ButtonPrimary
            variant="lg"
            title="Borrow"
            titleDisabled={getTitleDisabled(
              Number(collateralAmount),
              Number(formatUnits(borrowAmount, 18)),
              Number(data?.collateralBalance),
              availableDebt,
              (Number(data?.collateralBalance) * lendingTerm.borrowRatio) /
                Number(formatUnits(creditMultiplier, 18)),
              minBorrow,
              withLeverage
            )}
            extra="w-full !rounded-xl"
            onClick={withLeverage && leverageValue > 0 ? borrowLeverage : borrow}
            disabled={
              Number(collateralAmount) > Number(data?.collateralBalance) ||
              Number(formatUnits(borrowAmount, 18)) < minBorrow ||
              Number(formatUnits(borrowAmount, 18)) > availableDebt ||
              (!withLeverage &&
                Number(formatUnits(borrowAmount, 18)) >
                  (Number(data?.collateralBalance) * lendingTerm.borrowRatio) /
                    Number(formatUnits(creditMultiplier, 18)))
            }
          />

          {Number(formatUnits(borrowAmount, 18)) < minBorrow && (
            <AlertMessage
              type="danger"
              message={
                <p className="">
                  Minimum borrow is{" "}
                  <strong>
                    {formatCurrencyValue(
                      minBorrow * Number(formatUnits(creditMultiplier, 18))
                    )}
                  </strong>{" "}
                  USDC
                </p>
              }
            />
          )}

          {lendingTerm.openingFee > 0 &&
            Number(formatUnits(borrowAmount, 18)) >= minBorrow && (
              <AlertMessage
                type="warning"
                message={
                  <p>
                    <span className="font-bold">
                      {" "}
                      {formatDecimal(
                        Number(formatUnits(borrowAmount, 18)) * lendingTerm.openingFee,
                        2
                      )}{" "}
                      gUSDC{" "}
                    </span>{" "}
                    of interest will accrue instantly after opening the loan
                  </p>
                }
              />
            )}
          {lendingTerm.maxDelayBetweenPartialRepay > 0 &&
            Number(formatUnits(borrowAmount, 18)) >= minBorrow && (
              <AlertMessage
                type="warning"
                message={
                  <p className="">
                    You will have to repay <strong>{minToRepay}</strong> gUSDC by{" "}
                    <strong>
                      {moment()
                        .add(lendingTerm.maxDelayBetweenPartialRepay, "seconds")
                        .format("DD/MM/YYYY HH:mm:ss")}
                    </strong>{" "}
                    or your loan will be <strong> called</strong>
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
