import React, { useEffect, useState } from "react"
import Image from "next/image"
import {
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  createColumnHelper,
  getPaginationRowModel,
} from "@tanstack/react-table"
import { readContract, waitForTransactionReceipt, writeContract } from "@wagmi/core"
import {
  TermABI,
  gatewayContract,
  ERC20PermitABI,
  creditContract,
  uniswapRouterContract,
  usdcContract,
  psmUsdcContract,
} from "lib/contracts"
import { secondsToAppropriateUnit } from "utils/date"
import { LendingTerms, loanObj } from "types/lending"
import { useAccount, useReadContracts } from "wagmi"
import { Step } from "components/stepLoader/stepType"
import { MdOutlineError } from "react-icons/md"
import { formatDecimal, gUsdcToUsdc, usdcToGUsdc, toLocaleString } from "utils/numbers"
import { Abi, Address, erc20Abi, formatUnits, parseUnits } from "viem"
import clsx from "clsx"
import ModalRepay from "./ModalRepay"
import StepModal from "components/stepLoader"
import Spinner from "components/spinner"
import { wagmiConfig } from "contexts/Web3Provider"
import { ItemIdBadge } from "components/badge/ItemIdBadge"
import { signPermit } from "lib/transactions/signPermit"
import moment from "moment"
import { simpleRepay } from "./helper/simpleRepay"
import { getMulticallsDecoded } from "lib/transactions/getMulticallsDecoded"
import { HOURS_IN_YEAR } from "utils/constants"
import { permitConfig } from "config"
import { getAllowCollateralTokenCall } from "./helper/repayWithLeverage"
import { CurrencyTypes } from "components/switch/ToggleCredit"
import CustomTable from "components/table/CustomTable"

function Myloans({
  lendingTerm,
  isLoadingEventLoans,
  tableData,
  collateralPrice,
  creditMultiplier,
  pegPrice,
  usdcBalance,
  creditBalance,
  usdcNonces,
  reload,
  minBorrow,
  currencyType,
}: {
  lendingTerm: LendingTerms
  isLoadingEventLoans: boolean
  tableData: loanObj[]
  collateralPrice: number
  creditMultiplier: bigint
  pegPrice: number
  usdcBalance: bigint
  creditBalance: bigint
  usdcNonces: bigint
  minBorrow: bigint
  reload: React.Dispatch<React.SetStateAction<boolean>>
  currencyType: CurrencyTypes
}) {
  const { address } = useAccount()
  const [showModal, setShowModal] = useState(false)
  const [tableDataWithDebts, setTableDataWithDebts] = useState<loanObj[]>([])
  const [repays, setRepays] = React.useState<Record<string, number>>({})
  const [open, setOpen] = useState<boolean>(false)
  const [selectedRow, setSelectedRow] = useState<loanObj>()

  const [data, setData] = React.useState(() =>
    tableDataWithDebts.filter(
      (loan) =>
        // loan.status !== "closed" &&
        loan.callTime === 0 &&
        loan.borrowAmount + loan.loanDebt !== BigInt(0) &&
        loan.borrower === address
    )
  )

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

  const [steps, setSteps] = useState<Step[]>([])

  /* Smart contract reads */
  const {
    data: contractData,
    isError,
    isLoading,
    refetch,
  } = useReadContracts({
    contracts: [
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
          collateralNonces: data[0].result as bigint,
        }
      },
    },
  })
  /* End Smart contract reads */

  useEffect(() => {
    const fetchLoanDebts = async () => {
      const debts = await Promise.all(tableData.map((loan) => getLoanDebt(loan.id)))
      const newTableData = tableData.map((loan, index) => ({
        ...loan,
        loanDebt: debts[index],
      }))
      setTableDataWithDebts(newTableData)
    }

    const fetchRepays = async () => {
      const newRepays: Record<string, number> = {}
      for (let loan of tableData) {
        const loanDetails = await getLoan(loan.id)
        newRepays[loan.id] = loanDetails.lastPartialRepay
      }
      setRepays(newRepays)
    }

    fetchRepays()
    fetchLoanDebts()
  }, [tableData, reload])

  async function getLoanDebt(loanId: string): Promise<bigint> {
    const result = await readContract(wagmiConfig, {
      address: lendingTerm.address as Address,
      abi: TermABI,
      functionName: "getLoanDebt",
      args: [loanId],
    })

    return result as bigint
  }

  async function getLoan(id: string): Promise<any> {
    const response = await readContract(wagmiConfig, {
      address: lendingTerm.address as Address,
      abi: TermABI,
      functionName: "getLoan",
      args: [id],
    })
    return response
  }

  useEffect(() => {
    setData(
      tableDataWithDebts.filter(
        (loan) =>
          // loan.status !== "closed" &&
          loan.callTime === 0 &&
          loan.borrowAmount + loan.loanDebt !== BigInt(0) &&
          loan.borrower === address
      )
    )
  }, [tableDataWithDebts])

  /* Smart contract writes */
  async function partialRepay(loanId: string, value: string) {
    setOpen(false)
    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: `Approve gUSDC`, status: "Not Started" },
        { name: "Partial Repay", status: "Not Started" },
      ]
      return baseSteps
    }
    setSteps(createSteps())
    setShowModal(true)

    const debtToRepay = parseUnits(value, 18)

    try {
      updateStepStatus("Approve gUSDC", "In Progress")

      const hash = await writeContract(wagmiConfig, {
        ...creditContract,
        functionName: "approve",
        args: [lendingTerm.address, debtToRepay],
      })

      const data = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (data.status != "success") {
        updateStepStatus("Approve gUSDC", "Error")
        return
      }
      updateStepStatus("Approve gUSDC", "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Approve gUSDC", "Error")
      return
    }

    try {
      updateStepStatus("Partial Repay", "In Progress")
      const hash = await writeContract(wagmiConfig, {
        address: lendingTerm.address,
        abi: TermABI,
        functionName: "partialRepay",
        args: [loanId, debtToRepay],
      })

      const checkRepay = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (checkRepay.status != "success") {
        updateStepStatus("Partial Repay", "Error")
      }
      updateStepStatus("Partial Repay", "Success")
      reload(true)
    } catch (e) {
      console.log(e)
      updateStepStatus("Partial Repay", "Error")
    }
  }

  async function repay(loanId: string) {
    setOpen(false)

    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: `Approve gUSDC`, status: "Not Started" },
        { name: "Repay", status: "Not Started" },
      ]
      return baseSteps
    }
    setSteps(createSteps())
    setShowModal(true)

    try {
      updateStepStatus("Approve gUSDC", "In Progress")
      const debtToRepay = tableDataWithDebts.find((item) => item.id == loanId).loanDebt
      const hourlyFees =
        (parseUnits(lendingTerm.interestRate.toString(), 2) * debtToRepay) /
        BigInt(100) /
        BigInt(HOURS_IN_YEAR)

      const hash = await writeContract(wagmiConfig, {
        ...creditContract,
        functionName: "approve",
        args: [lendingTerm.address, debtToRepay + hourlyFees],
      })

      const data = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (data.status != "success") {
        updateStepStatus("Approve gUSDC", "Error")
        return
      }
      updateStepStatus("Approve gUSDC", "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Approve gUSDC", "Error")
      return
    }

    try {
      updateStepStatus("Repay", "In Progress")
      const hash = await writeContract(wagmiConfig, {
        address: lendingTerm.address,
        abi: TermABI,
        functionName: "repay",
        args: [loanId],
      })

      const checkRepay = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (checkRepay.status != "success") {
        updateStepStatus("Repay", "Error")
      }
      updateStepStatus("Repay", "Success")
      reload(true)
    } catch (e) {
      console.log(e)
      updateStepStatus("Repay", "Error")
    }
  }

  async function partialRepayGateway(loanId: string, value: string) {
    setOpen(false)

    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: "Sign Permit for USDC", status: "Not Started" },
        { name: "Partial Repay", status: "Not Started" },
      ]
      return baseSteps
    }

    setSteps(createSteps())
    let signatureUSDC: any

    const usdcAmount = parseUnits(value, 6)
    const debtToRepay = usdcToGUsdc(
      usdcAmount,
      tableDataWithDebts.find((item) => item.id == loanId)
        .borrowCreditMultiplier as bigint
    )

    setShowModal(true)

    /* Sign permit on USDC for Gateway*/
    try {
      updateStepStatus(`Sign Permit for USDC`, "In Progress")

      signatureUSDC = await signPermit({
        contractAddress: usdcContract.address,
        erc20Name: "ECG Testnet USDC",
        ownerAddress: address,
        spenderAddress: gatewayContract.address as Address,
        value: usdcAmount,
        deadline: BigInt(Number(moment().add(10, "seconds"))),
        nonce: usdcNonces,
        chainId: wagmiConfig.chains[0].id,
        permitVersion: "1",
      })

      if (!signatureUSDC) {
        updateStepStatus(`Sign Permit for USDC`, "Error")
        return
      }
      updateStepStatus(`Sign Permit for USDC`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus(`Sign Permit for USDC`, "Error")
      return
    }

    /* Call gateway.multicall() */
    try {
      //build multicall
      const calls = simpleRepay(
        "partial",
        lendingTerm,
        loanId,
        usdcAmount,
        debtToRepay,
        signatureUSDC
      )

      //get description of calls in multicall
      const callsDescription = getMulticallsDecoded(calls, lendingTerm)
      updateStepStatus(`Partial Repay`, "In Progress", callsDescription)

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
        updateStepStatus("Partial Repay", "Success")
        return
      } else {
        updateStepStatus("Partial Repay", "Error")
      }

      updateStepStatus(`Partial Repay`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Partial Repay", "Error")
      return
    }
  }

  // async function partialRepayGatewayLeverage(
  //   loanId: string,
  //   value: string,
  //   flashloanValue: string
  // ) {
  //   setOpen(false)
  //   const createSteps = (): Step[] => {
  //     const baseSteps = [
  //       permitConfig.find(
  //         (item) => item.collateralAddress === lendingTerm.collateral.address
  //       )?.hasPermit
  //         ? {
  //             name: `Sign Permit for ${lendingTerm.collateral.symbol}`,
  //             status: "Not Started",
  //           }
  //         : { name: `Approve ${lendingTerm.collateral.symbol}`, status: "Not Started" },
  //       { name: "Sign Permit for USDC", status: "Not Started" },
  //       { name: "Partial Repay with Leverage", status: "Not Started" },
  //     ]
  //     return baseSteps
  //   }
  //   setSteps(createSteps())

  //   let signatureUSDC: any
  //   let signatureCollateral: any

  //   const usdcAmount = parseUnits(value, 6)
  //   const usdcAmountFlashloan = parseUnits(flashloanValue, 6)
  //   const debtToRepay = usdcToGUsdc(
  //     usdcAmount + usdcAmountFlashloan,
  //     tableDataWithDebts.find((item) => item.id == loanId)
  //       .borrowCreditMultiplier as bigint
  //   )
  //   const flashloanCollateralAmount = calculateCollateralAmount(
  //     usdcToGUsdc(
  //       usdcAmountFlashloan,
  //       tableDataWithDebts.find((item) => item.id == loanId)
  //         .borrowCreditMultiplier as bigint
  //     )
  //   )
  //   const collateralAmount = calculateCollateralAmount(debtToRepay)
  //   console.log("usdcAmount", usdcAmount)
  //   console.log("usdcAmountFlashloan", usdcAmountFlashloan)
  //   console.log("debtToRepay", debtToRepay)
  //   console.log("flashloanCollateralAmount", flashloanCollateralAmount)
  //   console.log("collateralAmount", collateralAmount)

  //   setShowModal(true)

  //   /* Set allowance for collateral token */
  //   if (
  //     permitConfig.find(
  //       (item) => item.collateralAddress === lendingTerm.collateral.address
  //     )?.hasPermit
  //   ) {
  //     try {
  //       updateStepStatus(
  //         `Sign Permit for ${lendingTerm.collateral.symbol}`,
  //         "In Progress"
  //       )

  //       signatureCollateral = await signPermit({
  //         contractAddress: lendingTerm.collateral.address,
  //         erc20Name: lendingTerm.collateral.name,
  //         ownerAddress: address,
  //         spenderAddress: gatewayContract.address as Address,
  //         value: collateralAmount,
  //         deadline: BigInt(Number(moment().add(10, "seconds"))),
  //         nonce: contractData?.collateralNonces,
  //         chainId: wagmiConfig.chains[0].id,
  //         permitVersion: "1",
  //       })

  //       if (!signatureCollateral) {
  //         updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
  //         return
  //       }
  //       updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Success")
  //     } catch (e) {
  //       console.log(e)
  //       updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
  //       return
  //     }
  //   } else {
  //     try {
  //       updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "In Progress")

  //       const hash = await writeContract(wagmiConfig, {
  //         address: lendingTerm.collateral.address,
  //         abi: erc20Abi,
  //         functionName: "approve",
  //         args: [gatewayContract.address as Address, collateralAmount],
  //       })
  //       const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
  //         hash: hash,
  //       })

  //       if (checkApprove.status != "success") {
  //         updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
  //         return
  //       }
  //       updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Success")
  //     } catch (e) {
  //       console.log(e)
  //       updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
  //       return
  //     }
  //   }

  //   /* Sign permit on USDC for Gateway*/
  //   try {
  //     updateStepStatus(`Sign Permit for USDC`, "In Progress")

  //     signatureUSDC = await signPermit({
  //       contractAddress: usdcContract.address,
  //       erc20Name: "ECG Testnet USDC",
  //       ownerAddress: address,
  //       spenderAddress: gatewayContract.address as Address,
  //       value: usdcAmount,
  //       deadline: BigInt(Number(moment().add(10, "seconds"))),
  //       nonce: usdcNonces,
  //       chainId: wagmiConfig.chains[0].id,
  //       permitVersion: "1",
  //     })

  //     if (!signatureUSDC) {
  //       updateStepStatus(`Sign Permit for USDC`, "Error")
  //       return
  //     }
  //     updateStepStatus(`Sign Permit for USDC`, "Success")
  //   } catch (e) {
  //     console.log(e)
  //     updateStepStatus(`Sign Permit for USDC`, "Error")
  //     return
  //   }

  //   const deadlineSwap = BigInt(Number(moment().add(3600, "seconds")))
  //   console.log(
  //     "repayMode",
  //     debtToRepay >= tableDataWithDebts.find((item) => item.id == loanId).loanDebt
  //       ? "full"
  //       : "partial"
  //   )

  //   /* Call gateway.multicall() */
  //   try {
  //     //build multicall
  //     const calls = repayWithLeverage(
  //       debtToRepay >= tableDataWithDebts.find((item) => item.id == loanId).loanDebt
  //         ? "full"
  //         : "partial",
  //       lendingTerm,
  //       loanId,
  //       debtToRepay, //in gUSDC
  //       usdcAmount, //in USDC
  //       collateralAmount, // eg: sDAI
  //       flashloanCollateralAmount, // eg: sDAI
  //       usdcAmountFlashloan,
  //       signatureCollateral,
  //       signatureUSDC,
  //       deadlineSwap
  //     )

  //     //get description of calls in multicall
  //     const callsDescription = getMulticallsDecoded(calls, lendingTerm)
  //     updateStepStatus(`Partial Repay with Leverage`, "In Progress", callsDescription)

  //     const hash = await writeContract(wagmiConfig, {
  //       ...gatewayContract,
  //       functionName: "multicallWithBalancerFlashLoan",
  //       args: [[lendingTerm.collateral.address], [flashloanCollateralAmount], calls],
  //     })

  //     const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
  //       hash: hash,
  //     })

  //     if (checkBorrow.status === "success") {
  //       refetch()
  //       reload(true)
  //       updateStepStatus("Partial Repay with Leverage", "Success")
  //       return
  //     } else {
  //       updateStepStatus("Partial Repay with Leverage", "Error")
  //     }

  //     updateStepStatus(`Partial Repay with Leverage`, "Success")
  //   } catch (e) {
  //     console.log(e)
  //     updateStepStatus("Partial Repay with Leverage", "Error")
  //     return
  //   }
  // }

  async function partialRepayGatewayLeverage(
    loanId: string,
    value: string,
    flashloanValue: string
  ) {
    setOpen(false)
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
        { name: "Sign Permit for USDC", status: "Not Started" },
        { name: "Partial Repay with Leverage", status: "Not Started" },
      ]
      return baseSteps
    }
    setSteps(createSteps())

    let signatureUSDC: any
    let signatureCollateral: any

    const usdcAmount = parseUnits(value, 6)
    const usdcAmountFlashloan = parseUnits(flashloanValue, 6)
    const debtToRepay = usdcToGUsdc(
      usdcAmount + usdcAmountFlashloan,
      tableDataWithDebts.find((item) => item.id == loanId)
        .borrowCreditMultiplier as bigint
    )
    const flashloanCollateralAmount = calculateCollateralAmount(
      usdcToGUsdc(
        usdcAmountFlashloan,
        tableDataWithDebts.find((item) => item.id == loanId)
          .borrowCreditMultiplier as bigint
      )
    )
    const collateralAmount = calculateCollateralAmount(debtToRepay)
    console.log("usdcAmount", usdcAmount)
    console.log("usdcAmountFlashloan", usdcAmountFlashloan)
    console.log("debtToRepay", debtToRepay)
    console.log("flashloanCollateralAmount", flashloanCollateralAmount)
    console.log("collateralAmount", collateralAmount)

    setShowModal(true)

    /* Set allowance for collateral token */
    if (
      permitConfig.find(
        (item) => item.collateralAddress === lendingTerm.collateral.address
      )?.hasPermit
    ) {
      try {
        updateStepStatus(
          `Sign Permit for ${lendingTerm.collateral.symbol}`,
          "In Progress"
        )

        signatureCollateral = await signPermit({
          contractAddress: lendingTerm.collateral.address,
          erc20Name: lendingTerm.collateral.name,
          ownerAddress: address,
          spenderAddress: gatewayContract.address as Address,
          value: collateralAmount,
          deadline: BigInt(Number(moment().add(10, "seconds"))),
          nonce: contractData?.collateralNonces,
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
          args: [gatewayContract.address as Address, collateralAmount],
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

    /* Sign permit on USDC for Gateway*/
    try {
      updateStepStatus(`Sign Permit for USDC`, "In Progress")

      signatureUSDC = await signPermit({
        contractAddress: usdcContract.address,
        erc20Name: "ECG Testnet USDC",
        ownerAddress: address,
        spenderAddress: gatewayContract.address as Address,
        value: usdcAmount,
        deadline: BigInt(Number(moment().add(10, "seconds"))),
        nonce: usdcNonces,
        chainId: wagmiConfig.chains[0].id,
        permitVersion: "1",
      })

      if (!signatureUSDC) {
        updateStepStatus(`Sign Permit for USDC`, "Error")
        return
      }
      updateStepStatus(`Sign Permit for USDC`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus(`Sign Permit for USDC`, "Error")
      return
    }

    /* Call gateway.multicall() */
    try {
      updateStepStatus("Partial Repay with Leverage", "In Progress")
      const hash = await writeContract(wagmiConfig, {
        ...gatewayContract,
        functionName: "repayWithBalancerFlashLoan",
        args: [
          loanId,
          lendingTerm.address,
          psmUsdcContract.address,
          uniswapRouterContract.address,
          lendingTerm.collateral.address,
          usdcContract.address,
          collateralAmount + flashloanCollateralAmount,
          getAllowCollateralTokenCall(lendingTerm, collateralAmount, signatureCollateral),
        ],
      })

      const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (checkBorrow.status === "success") {
        refetch()
        reload(true)
        updateStepStatus("Partial Repay with Leverage", "Success")
        return
      } else {
        updateStepStatus("Partial Repay with Leverage", "Error")
      }

      updateStepStatus(`Partial Repay with Leverage`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Partial Repay with Leverage", "Error")
      return
    }
  }

  async function repayGateway(loanId: string) {
    setOpen(false)
    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: "Sign Permit for USDC", status: "Not Started" },
        { name: "Repay", status: "Not Started" },
      ]
      return baseSteps
    }
    setSteps(createSteps())

    let signatureUSDC: any

    const debtToRepay = tableDataWithDebts.find((item) => item.id == loanId).loanDebt
    const hourlyFees =
      (parseUnits(lendingTerm.interestRate.toString(), 2) * debtToRepay) /
      BigInt(100) /
      BigInt(HOURS_IN_YEAR)
    const usdcAmountToApprove = gUsdcToUsdc(
      tableDataWithDebts.find((item) => item.id == loanId).loanDebt + hourlyFees,
      creditMultiplier
    )

    setShowModal(true)

    /* Sign permit on USDC for Gateway*/
    try {
      updateStepStatus(`Sign Permit for USDC`, "In Progress")

      signatureUSDC = await signPermit({
        contractAddress: usdcContract.address,
        erc20Name: "ECG Testnet USDC",
        ownerAddress: address,
        spenderAddress: gatewayContract.address as Address,
        value: usdcAmountToApprove,
        deadline: BigInt(Number(moment().add(10, "seconds"))),
        nonce: usdcNonces,
        chainId: wagmiConfig.chains[0].id,
        permitVersion: "1",
      })

      if (!signatureUSDC) {
        updateStepStatus(`Sign Permit for USDC`, "Error")
        return
      }
      updateStepStatus(`Sign Permit for USDC`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus(`Sign Permit for USDC`, "Error")
      return
    }

    /* Call gateway.multicall() */
    try {
      //build multicall
      const calls = simpleRepay(
        "full",
        lendingTerm,
        loanId,
        usdcAmountToApprove,
        tableDataWithDebts.find((item) => item.id == loanId).loanDebt + hourlyFees,
        signatureUSDC
      )

      //get description of calls in multicall
      const callsDescription = getMulticallsDecoded(calls, lendingTerm)
      updateStepStatus(`Repay`, "In Progress", callsDescription)

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
        updateStepStatus("Repay", "Success")
        return
      } else {
        updateStepStatus("Repay", "Error")
      }

      updateStepStatus(`Repay`, "Success")
    } catch (e) {
      console.log(e)
      updateStepStatus("Repay", "Error")
      return
    }
  }

  /* End of smart contract writes */

  const calculateCollateralAmount = (borrowAmount: bigint) => {
    let collateralAmount: bigint =
      (borrowAmount /
        BigInt(10 ** (18 - lendingTerm.collateral.decimals)) /
        parseUnits(lendingTerm.borrowRatio.toString(), 18)) *
      creditMultiplier
    return collateralAmount
  }

  /* Set table */
  const columnHelper = createColumnHelper<loanObj>()

  const columns = [
    columnHelper.accessor("id", {
      id: "id",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              Loan Id
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="flex justify-center">
          <ItemIdBadge id={info.getValue()} />
        </div>
      ),
    }),
    columnHelper.accessor("loanDebt", {
      id: "loanDebt",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              Debt Amount
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const borrowValue =
          currencyType == "USDC"
            ? Number(
                formatUnits(
                  gUsdcToUsdc(
                    info.row.original.loanDebt,
                    info.row.original.borrowCreditMultiplier
                  ),
                  6
                )
              )
            : Number(formatUnits(info.row.original.loanDebt, 18))

        const usdRate =
          currencyType == "USDC"
            ? pegPrice
            : pegPrice * Number(formatUnits(info.row.original.borrowCreditMultiplier, 18))

        return (
          <div className="ml-3 text-center">
            <p className="font-semibold text-gray-700 dark:text-white">
              <div className="flex items-center justify-center gap-1">
                {toLocaleString(formatDecimal(borrowValue, 2))}
                {currencyType == "USDC" ? (
                  <Image
                    src="/img/crypto-logos/usdc.png"
                    width={20}
                    height={20}
                    alt="logo"
                  />
                ) : (
                  <Image
                    src="/img/crypto-logos/credit.png"
                    width={20}
                    height={20}
                    alt="logo"
                  />
                )}
              </div>
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              $ {toLocaleString(formatDecimal(borrowValue * usdRate, 2))}
            </p>
          </div>
        )
      },
    }),
    columnHelper.accessor("collateralAmount", {
      id: "collateralAmount",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              Collateral Amount
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const collateralValue = formatDecimal(
          Number(
            formatUnits(
              info.row.original.collateralAmount,
              lendingTerm.collateral.decimals
            )
          ) * collateralPrice,
          2
        )

        return (
          <div className="ml-3 text-center">
            <p className="font-semibold text-gray-700 dark:text-white">
              <div className="flex items-center justify-center gap-1">
                {toLocaleString(
                  formatDecimal(
                    Number(formatUnits(info.getValue(), lendingTerm.collateral.decimals)),
                    2
                  )
                )}{" "}
                <Image
                  src={lendingTerm.collateral.logo}
                  width={20}
                  height={20}
                  alt="logo"
                />
              </div>
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              $ {toLocaleString(collateralValue)}
            </p>
          </div>
        )
      },
    }),
    {
      id: "borrowTime",
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              Next Payment
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const currentDateInSeconds = Date.now() / 1000
        const sumOfTimestamps =
          repays[info.row.original.id] + lendingTerm.maxDelayBetweenPartialRepay
        const nextPaymentDue =
          lendingTerm.maxDelayBetweenPartialRepay === 0
            ? "n/a"
            : Number.isNaN(sumOfTimestamps)
            ? "--"
            : sumOfTimestamps < currentDateInSeconds
            ? "Overdue"
            : secondsToAppropriateUnit(sumOfTimestamps - currentDateInSeconds)

        return (
          <div className="flex flex-col items-center">
            {lendingTerm.maxDelayBetweenPartialRepay != 0 ? (
              <>
                <div
                  className={clsx(
                    "flex items-center justify-center gap-1",
                    nextPaymentDue === "Overdue"
                      ? "text-red-500 dark:text-red-500"
                      : "text-amber-500 dark:text-amber-300"
                  )}
                >
                  <MdOutlineError />
                  <p>{nextPaymentDue}</p>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-200">
                  Min. repay:{" "}
                  <strong>
                    ${" "}
                    {toLocaleString(
                      formatDecimal(
                        Number(formatUnits(info.row.original.borrowAmount, 18)) *
                          lendingTerm.minPartialRepayPercent,
                        2
                      )
                    )}
                  </strong>
                </p>
              </>
            ) : (
              "-"
            )}
          </div>
        )
      },
    },
    {
      id: "ltv",
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">
              LTV
            </p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const currentDebtInCollateralEquivalent =
          Number(
            formatUnits(
              info.row.original.borrowAmount / BigInt(lendingTerm.borrowRatio),
              18
            )
          ) * Number(formatUnits(info.row.original.borrowCreditMultiplier, 18))

        const collateralValue = Number(
          formatUnits(info.row.original.collateralAmount, lendingTerm.collateral.decimals)
        )

        const ltvValue = formatDecimal(
          (currentDebtInCollateralEquivalent / collateralValue) * 100,
          2
        )

        return (
          <div className="flex justify-center">
            <p
              className={clsx(
                "font-semibold",
                Number(ltvValue) < 80
                  ? "text-green-500"
                  : Number(ltvValue) < 90
                  ? "text-amber-500"
                  : "text-red-500"
              )}
            >
              {ltvValue}%
            </p>
          </div>
        )
      },
    },
    {
      id: "repay",
      header: "",
      cell: (info: any) => (
        <p className="text-center font-medium text-gray-600 dark:text-white">
          <button
            onClick={() => handleModalOpening(info.row.original)}
            type="button"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-700 dark:ring-navy-600"
          >
            Repay
          </button>
        </p>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
    initialState: {
      pagination: {
        pageSize: 6,
      },
      sorting: [
        {
          id: "borrowTime",
          desc: true,
        },
      ],
    },
  })
  /* End of table */

  const handleModalOpening = (rowData: loanObj) => {
    setSelectedRow(rowData)
    setOpen(true)
  }

  if (isLoadingEventLoans) {
    return (
      <div className="mt-20 flex justify-center">
        <Spinner />
      </div>
    )
  }

  if (data && !isLoadingEventLoans && data.length == 0) {
    return (
      <div className="mt-20 flex justify-center">You do not have any active loans</div>
    )
  }

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} setSteps={setSteps} />}
      <ModalRepay
        setOpen={setOpen}
        isOpen={open}
        creditBalance={creditBalance}
        usdcBalance={usdcBalance}
        rowData={selectedRow}
        repay={repay}
        partialRepay={partialRepay}
        repayGateway={repayGateway}
        partialRepayGateway={partialRepayGateway}
        partialRepayGatewayLeverage={partialRepayGatewayLeverage}
        creditMultiplier={creditMultiplier}
        minBorrow={minBorrow}
        currencyType={currencyType}
      />

      <CustomTable withNav={true} table={table} />
    </>
  )
}

export default Myloans
