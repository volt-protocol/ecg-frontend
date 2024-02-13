import React, { useEffect, useState } from "react"
import Image from "next/image"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table"
import { readContract, waitForTransactionReceipt, writeContract } from "@wagmi/core"
import {
  TermABI,
  creditContract,
  usdcContract,
  gatewayContract,
  ERC20PermitABI,
} from "lib/contracts"
import { preciseRound, secondsToAppropriateUnit, UnitToDecimal } from "utils/utils-old"
import { LendingTerms, loanObj } from "types/lending"
import { useAccount, useReadContracts } from "wagmi"
import { Step } from "components/stepLoader/stepType"
import { MdChevronLeft, MdChevronRight, MdOutlineError, MdWarning } from "react-icons/md"
import { formatDecimal, gUsdcToUsdc, usdcToGUsdc } from "utils/numbers"
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa"
import { Abi, Address, erc20Abi, formatUnits, parseEther, parseUnits } from "viem"
import clsx from "clsx"
import ModalRepay from "./ModalRepay"
import StepModal from "components/stepLoader"
import Spinner from "components/spinner"
import { wagmiConfig } from "contexts/Web3Provider"
import { ItemIdBadge } from "components/badge/ItemIdBadge"
import { signPermit } from "lib/transactions/signPermit"
import moment, { min } from "moment"
import { simpleRepay } from "./helper/simpleRepay"
import { getMulticallsDecoded } from "lib/transactions/getMulticallsDecoded"
import { HOURS_IN_YEAR } from "utils/constants"
import { permitConfig } from "config"
import { repayWithLeverage } from "./helper/repayWithLeverage"
import { set } from "react-hook-form"

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
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
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
      { name: "Partial Repay (Multicall)", status: "Not Started" },
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

  async function partialRepayLeverage(
    loanId: string,
    value: string,
    flashloanValue: string
  ) {
    setOpen(false)
    updateStepName("Partial Repay (Multicall)", "Partial Repay with Leverage")

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

    const deadlineSwap = BigInt(Number(moment().add(3600, "seconds")))
    console.log(
      "repayMode",
      debtToRepay >= tableDataWithDebts.find((item) => item.id == loanId).loanDebt
        ? "full"
        : "partial"
    )

    /* Call gateway.multicall() */
    try {
      //build multicall
      const calls = repayWithLeverage(
        debtToRepay >= tableDataWithDebts.find((item) => item.id == loanId).loanDebt
          ? "full"
          : "partial",
        lendingTerm,
        loanId,
        debtToRepay, //in gUSDC
        usdcAmount, //in USDC
        collateralAmount, // eg: sDAI
        flashloanCollateralAmount, // eg: sDAI
        usdcAmountFlashloan,
        signatureCollateral,
        signatureUSDC,
        deadlineSwap
      )

      //get description of calls in multicall
      const callsDescription = getMulticallsDecoded(calls, lendingTerm)
      updateStepStatus(`Partial Repay with Leverage`, "In Progress", callsDescription)

      const hash = await writeContract(wagmiConfig, {
        ...gatewayContract,
        functionName: "multicallWithBalancerFlashLoan",
        args: [[lendingTerm.collateral.address], [flashloanCollateralAmount], calls],
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

  async function repay(loanId: string) {
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

  // async function repay2(loanId: string, borrowCredit: bigint) {
  //   setOpen(false)

  //   const updateStepStatus = (stepName: string, status: Step["status"]) => {
  //     setSteps((prevSteps) =>
  //       prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
  //     )
  //   }

  //   updateStepName("Partial Repay", "Repay")

  //   try {
  //     setShowModal(true)
  //     updateStepStatus("Approve", "In Progress")
  //     const hash = await writeContract(wagmiConfig, {
  //       ...creditContract,
  //       functionName: "approve",
  //       args: [lendingTerm.address, borrowCredit],
  //     })

  //     const data = await waitForTransactionReceipt(wagmiConfig, {
  //       hash: hash,
  //     })

  //     if (data.status != "success") {
  //       updateStepStatus("Approve", "Error")
  //       return
  //     }
  //     updateStepStatus("Approve", "Success")
  //   } catch (e) {
  //     console.log(e)
  //     updateStepStatus("Approve", "Error")
  //     return
  //   }
  //   try {
  //     updateStepStatus("Repay", "In Progress")
  //     const hash = await writeContract(wagmiConfig, {
  //       address: lendingTerm.address,
  //       abi: TermABI,
  //       functionName: "repay",
  //       args: [loanId],
  //     })

  //     const checkRepay = await waitForTransactionReceipt(wagmiConfig, {
  //       hash: hash,
  //     })

  //     if (checkRepay.status != "success") {
  //       updateStepStatus("Repay", "Error")
  //     }
  //     updateStepStatus("Repay", "Success")
  //     reload(true)
  //   } catch (e) {
  //     console.log(e)
  //     updateStepStatus("Repay", "Error")
  //   }
  // }
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
        <div className="ml-3 text-center">
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
        const borrowValue = Number(
          formatUnits(
            BigInt(
              info.row.original.loanDebt * info.row.original.borrowCreditMultiplier
            ) / BigInt(1e18),
            18
          )
        )
        return (
          <div className="ml-3 text-center">
            <p className="font-semibold text-gray-700 dark:text-white">
              <div className="flex items-center justify-center gap-1">
                {formatDecimal(borrowValue, 2)}
                <Image
                  src="/img/crypto-logos/usdc.png"
                  width={20}
                  height={20}
                  alt="logo"
                />
              </div>
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {preciseRound(borrowValue * pegPrice, 2)}$
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
        const collateralValue = preciseRound(
          Number(
            formatUnits(
              BigInt(Number(info.row.original.collateralAmount) * collateralPrice),
              lendingTerm.collateral.decimals
            )
          ),
          2
        )
        return (
          <div className="ml-3 text-center">
            <p className="font-semibold text-gray-700 dark:text-white">
              <div className="flex items-center justify-center gap-1">
                {formatDecimal(
                  Number(formatUnits(info.getValue(), lendingTerm.collateral.decimals)),
                  2
                )}{" "}
                <Image
                  src={lendingTerm.collateral.logo}
                  width={20}
                  height={20}
                  alt="logo"
                />
              </div>
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">{collateralValue}$</p>
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
          <div className="ml-3 text-center">
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
                    {preciseRound(
                      Number(formatUnits(info.row.original.borrowAmount, 18)) *
                        lendingTerm.minPartialRepayPercent,
                      2
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
        const ltvValue = formatDecimal(
          (Number(
            info.row.original.borrowAmount * info.row.original.borrowCreditMultiplier
          ) /
            1e18 /
            1e18 /
            ((collateralPrice * Number(info.row.original.collateralAmount)) /
              UnitToDecimal(1, lendingTerm.collateral.decimals))) *
            100,
          2
        )

        return (
          <div className="ml-3 text-center">
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
        // return <RepayCell original={info.row.original} />
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
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
    initialState: {
      pagination: {
        pageSize: 3,
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
      {showModal && (
        <StepModal
          steps={steps}
          close={setShowModal}
          initialStep={createSteps}
          setSteps={setSteps}
        />
      )}
      <ModalRepay
        setOpen={setOpen}
        isOpen={open}
        creditBalance={creditBalance}
        usdcBalance={usdcBalance}
        rowData={selectedRow}
        repay={repay}
        partialRepay={partialRepay}
        partialRepayLeverage={partialRepayLeverage}
        creditMultiplier={creditMultiplier}
        minBorrow={minBorrow}
      />

      <div className="mt-4 overflow-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="!border-px !border-gray-400 ">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pt-4 text-start dark:border-gray-400"
                    >
                      <div className="flex items-center justify-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.columnDef.enableSorting && (
                          <span className="text-sm text-gray-400">
                            {{
                              asc: <FaSortDown />,
                              desc: <FaSortUp />,
                              null: <FaSort />,
                            }[header.column.getIsSorted() as string] ?? <FaSort />}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table
              .getRowModel()
              .rows.slice(0, 20)
              .map((row) => {
                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 transition-all duration-200 ease-in-out last:border-none hover:cursor-pointer hover:bg-stone-100/80 dark:border-gray-500 dark:hover:bg-navy-700"
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <td
                          key={cell.id}
                          className="relative min-w-[150px] border-white/0 py-5"
                        >
                          {cell.column.id != "usage" &&
                          cell.column.id != "maxDelayBetweenPartialRepay" ? (
                            <>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </>
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
      <nav
        className="flex w-full items-center justify-between border-t border-gray-200 px-2 py-3 text-gray-400"
        aria-label="Pagination"
      >
        <div className="hidden sm:block">
          <p className="text-sm ">
            Showing page{" "}
            <span className="font-medium">
              {table.getState().pagination.pageIndex + 1}
            </span>{" "}
            of <span className="font-semibold">{table.getPageCount()}</span>
          </p>
        </div>
        <div className="flex flex-1 justify-between sm:justify-end">
          <button
            onClick={() => table.previousPage()}
            className="relative inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
            disabled={!table.getCanPreviousPage()}
          >
            <MdChevronLeft />
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            className="relative ml-3 inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
            disabled={!table.getCanNextPage()}
          >
            Next
            <MdChevronRight />
          </button>
        </div>
      </nav>
    </>
  )
}

export default Myloans
