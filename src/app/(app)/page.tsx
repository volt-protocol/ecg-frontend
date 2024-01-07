"use client"
import Image from "next/image"
import { IoMdHome } from "react-icons/io"
import { IoDocuments } from "react-icons/io5"
import { MdBarChart, MdDashboard } from "react-icons/md"
import { readContract } from "@wagmi/core"

import Widget from "components/widget/Widget"
import { erc20ABI, useAccount, useContractReads } from "wagmi"
import { useAppStore } from "store"
import { Abi, Address, formatUnits } from "viem"
import { coinsList } from "store/slices/pair-prices"
import {
  profitManagerContract,
  guildContract,
  creditContract,
  TermABI,
} from "lib/contracts"
import { useEffect, useState } from "react"
import { getActiveLoanLogs, getCloseLoanLogs, getOpenLoanLogs } from "lib/logs/loans"
import Card from "components/card"
import { CollateralTypes } from "./components/CollateralTypes"
import { DebtCeiling } from "./components/DebtCeiling"
import { FirstLossCapital } from "./components/FirstLossCapital"
import { AverageInterestRate } from "./components/AverageInterestRate"
import { CreditTotalSupply } from "./components/CreditTotalSupply"
import Spinner from "components/spinner"
import { LoanSuccessRate } from "./components/LoanSuccessRate"
import {
  LastActivitiesLogs,
  LastProtocolActivity,
} from "./components/LastProtocolActivity"
import { formatCurrencyValue, formatDecimal } from "utils/numbers"
import { useBlockNumber } from "wagmi"
import { getAllMintRedeemLogs } from "lib/logs/mint-redeem"
import { getAllVotes } from "lib/logs/votes"
import { BLOCK_PER_WEEK } from "utils/constants"

const GlobalDashboard = () => {
  const { lendingTerms, prices, userData } = useAppStore()
  const [totalActiveLoans, setTotalActiveLoans] = useState<number>()
  const [debtCeilingData, setDebtCeilingData] = useState([])
  const [collateralData, setCollateralData] = useState([])
  const [firstLossData, setFirstLossData] = useState([])
  const [lastActivities, setLastActivites] = useState<LastActivitiesLogs[]>([])
  const { isConnected, address } = useAccount()
  const { data: currentBlock } = useBlockNumber()

  /* Read contracts */
  const { data, isError, isLoading } = useContractReads({
    contracts: [
      {
        ...guildContract,
        functionName: "totalTypeWeight",
        args: [1],
      },
      {
        ...profitManagerContract,
        functionName: "creditMultiplier",
      },
      {
        ...creditContract,
        functionName: "totalSupply",
      },
    ],
    select: (data) => {
      return {
        totalWeight: Number(formatUnits(data[0].result as bigint, 18)),
        creditMultiplier: Number(formatUnits(data[1].result as bigint, 18)),
        creditTotalSupply: Number(formatUnits(data[2].result as bigint, 18)),
      }
    },
  })
  /* End Read Contract data  */

  useEffect(() => {
    const asyncFunc = async () => {
      await getTotalActiveLoans()
    }

    asyncFunc()
  }, [])

  useEffect(() => {
    const asyncFunc = async () => {
      const ceilingData = await getDebtCeilingData()
      setDebtCeilingData(ceilingData)
      const collateralData = await getCollateralData()
      setCollateralData(collateralData)
      const firstLossData = await getFirstLossCapital()
      setFirstLossData(firstLossData)
      const lastActivities = await getLastActivities()
      setLastActivites(lastActivities)
    }

    data && asyncFunc()
  }, [data])

  /* Get Dashboard data */
  const getTotalActiveLoans = async () => {
    let total = 0
    for (const term of lendingTerms) {
      const activeLoans = await getActiveLoanLogs(term.address as Address)
      total += activeLoans.length
    }

    setTotalActiveLoans(total)
  }

  const getCollateralData = async () => {
    return await Promise.all(
      lendingTerms.map(async (term) => {
        const result = await readContract({
          address: term.collateral.address as Address,
          abi: erc20ABI as Abi,
          functionName: "balanceOf",
          args: [term.address],
        })

        //get coin gecko name
        const nameCG = coinsList.find((x) => x.nameECG === term.collateral.name).nameCG
        const exchangeRate = prices[nameCG].usd

        return {
          collateral: term.collateral.name,
          collateralValueDollar:
            Number(formatUnits(result as bigint, term.collateral.decimals)) *
            exchangeRate,
        }
      })
    )
  }

  const getDebtCeilingData = async () => {
    return await Promise.all(
      lendingTerms
        .filter((term) => term.status == "live")
        .map(async (term) => {
          const debtCeiling = await readContract({
            address: term.address as Address,
            abi: TermABI as Abi,
            functionName: "debtCeiling",
          })

          return {
            collateral: term.collateral.name,
            currentDebt: term.currentDebt,
            debitCeiling: Number(formatUnits(debtCeiling as bigint, 18)),
          }
        })
    )
  }

  const getFirstLossCapital = async () => {
    const globalSurplusBuffer = await readContract({
      ...profitManagerContract,
      functionName: "surplusBuffer",
    })

    const termsArray = await Promise.all(
      lendingTerms
        .filter((term) => term.status == "live")
        .map(async (term) => {
          const termSurplusBuffer = await readContract({
            ...profitManagerContract,
            functionName: "termSurplusBuffer",
            args: [term.address],
          })
          return {
            term: term.collateral.name,
            value: Number(formatUnits(termSurplusBuffer as bigint, 18)),
          }
        })
    )

    termsArray.push({
      term: "Global",
      value: Number(
        formatDecimal(Number(formatUnits(globalSurplusBuffer as bigint, 18)), 2)
      ),
    })

    return termsArray
  }

  const getLastActivities = async () => {
    //last loan opening
    let allOpenLoans = []
    let allClosedLoans = []
    for (const term of lendingTerms) {
      const openLoans = await getOpenLoanLogs(term.address as Address)
      const closeLoans = await getCloseLoanLogs(term.address as Address)
      allOpenLoans.push(...openLoans, ...closeLoans)
    }

    // last loan closing
    const lastMintRedeem = await getAllMintRedeemLogs(undefined, BLOCK_PER_WEEK * 4)
    const lastVotes = await getAllVotes(undefined, BLOCK_PER_WEEK * 4)

    return [...lastMintRedeem, ...lastVotes, ...allOpenLoans]
  }

  /* End get dashboard data */

  if (isLoading) return <Spinner />
  return (
    <div>
      {/* Card widget */}

      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-6">
        <Widget
          icon={<MdBarChart className="h-7 w-7" />}
          title={"Total Collateral"}
          subtitle={`$${collateralData
            .reduce((a, b) => a + b.collateralValueDollar, 0)
            .toFixed(2)}`}
        />
        <Widget
          icon={<IoDocuments className="h-6 w-6" />}
          title={"Total Debt"}
          subtitle={`$${(
            lendingTerms?.reduce((a, b) => a + b.currentDebt, 0) * data?.creditMultiplier
          ).toFixed(2)}`}
        />
        <Widget
          icon={<MdBarChart className="h-7 w-7" />}
          title={"Lending Terms"}
          subtitle={lendingTerms.length}
        />
        <Widget
          icon={<MdDashboard className="h-6 w-6" />}
          title={"Active Loans"}
          subtitle={totalActiveLoans ?? "-"}
        />
        <Widget
          icon={<MdBarChart className="h-7 w-7" />}
          title={"GUILD Staked"}
          subtitle={`${formatDecimal(data?.totalWeight, 2)}`}
        />
        <div className="opacity-40">
          <Widget
            icon={<IoMdHome className="h-6 w-6" />}
            title={"All Time P&L"}
            subtitle={"$2433"}
          />
        </div>
      </div>

      {/* Charts */}

      <div className="my-3 grid grid-cols-1 gap-5 md:grid-cols-4">
        <Card
          title="Collateral Types"
          extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
        >
          {debtCeilingData.length == 0 ? (
            <div className="flex h-96 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <CollateralTypes
              data={collateralData.map((item) =>
                Number(item.collateralValueDollar.toFixed(2))
              )}
              labels={collateralData.map((item) => item.collateral)}
            />
          )}
        </Card>
        <Card
          title="Debt Ceiling"
          extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
        >
          {debtCeilingData.length == 0 ? (
            <div className="flex h-96 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <DebtCeiling
              data={debtCeilingData}
              labels={debtCeilingData.map((item) => item.collateral)}
            />
          )}
        </Card>
        <Card
          title="Loan Success Rate"
          extra="w-full min-h-[300px] md:col-span-2 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4 opacity-40"
        >
          <LoanSuccessRate />
        </Card>
      </div>

      <div className="my-3 grid grid-cols-1 gap-5 md:grid-cols-4">
        <Card
          title="gUSDC Total Supply"
          extra="w-full min-h-[300px] md:col-span-2 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4 opacity-40"
        >
          <CreditTotalSupply />
        </Card>
        <Card
          title="Average Interest Rate"
          extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4 opacity-40"
        >
          <AverageInterestRate />
        </Card>
        <Card
          title="First-loss Capital"
          extra="w-full min-h-[300px]  sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
        >
          <dl className="mt-3 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow dark:divide-navy-600 dark:bg-navy-700 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div key="guildVotingPower" className="px-2 py-4 sm:p-5">
              <dt className="text-sm font-normal text-gray-500 dark:text-gray-300 xl:text-base">
                Global
              </dt>
              <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-center gap-2 overflow-hidden text-lg font-semibold text-gray-700 dark:text-gray-200 xl:text-2xl">
                  {firstLossData && firstLossData.length != 0 ? (
                    formatCurrencyValue(firstLossData[firstLossData.length - 1].value)
                  ) : (
                    <div className="h-5 w-28 animate-pulse rounded-md bg-gray-200" />
                  )}
                  <Image
                    src="/img/crypto-logos/credit.png"
                    width={32}
                    height={32}
                    alt={""}
                  />
                </div>
              </dd>
            </div>
            <div key="creditVotingPower" className="px-2 py-4 sm:p-5">
              <dt className="text-sm font-normal text-gray-500 dark:text-gray-300 xl:text-base">
                Term Specific
              </dt>
              <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-center gap-2 overflow-hidden text-lg font-semibold text-gray-700 dark:text-gray-200 xl:text-2xl">
                  {firstLossData && firstLossData.length != 0 ? (
                    formatCurrencyValue(
                      firstLossData
                        .filter((item) => item.term != "Global")
                        .reduce((a, b) => a + b.value, 0)
                    )
                  ) : (
                    <div className="h-5 w-28 animate-pulse rounded-md bg-gray-200" />
                  )}
                  <Image
                    src="/img/crypto-logos/credit.png"
                    width={32}
                    height={32}
                    alt={""}
                  />
                </div>
              </dd>
            </div>
          </dl>
          {firstLossData.length == 0 ? (
            <div className="flex h-96 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <FirstLossCapital
              data={firstLossData.map((item) => Number(item.value.toFixed(2)))}
              labels={firstLossData.map((item) => item.term)}
            />
          )}
        </Card>
      </div>

      <div className="mb-10 mt-3 flex">
        <Card
          title="Last Month Activities"
          extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
        >
          {lastActivities.length == 0 ? (
            <div className="flex h-96 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <LastProtocolActivity data={lastActivities} currentBlock={currentBlock} />
          )}
        </Card>
      </div>
    </div>
  )
}

export default GlobalDashboard
