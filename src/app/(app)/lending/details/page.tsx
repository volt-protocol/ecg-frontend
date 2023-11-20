"use client"

import { useAccount } from "wagmi"
import Disconnected from "components/error/disconnected"
import React, { useEffect, useState } from "react"
import Card from "components/card"
import { Flowbite, Tabs } from "flowbite-react"
import { BsArrowDownLeft, BsArrowUpRight, BsBank2 } from "react-icons/bs"
import customTheme from "./components/customThemeFlowbite"
import {
  GuildABI,
  TermABI,
  SurplusGuildMinterABI,
  CreditABI,
  ProfitManagerABI,
  UsdcABI,
} from "lib/contracts"
import { Address, readContract } from "@wagmi/core"
import {
  DecimalToUnit,
  preciseRound,
  secondsToAppropriateUnit,
} from "utils/utils-old"
import Myloans from "./components/MyLoans"
import CreateLoan from "./components/CreateLoan"
import Stake from "./components/StakeCredit"
import ActiveLoans from "./components/ActiveLoans"
import AllocateGuild from "./components/AllocateGuild"
import {
  LoansObj,
  LendingTermsResponse,
  loanObj,
  LendingTerms,
} from "types/lending"
import axios, { AxiosResponse } from "axios"
import Widget from "components/widget/Widget"
import { MdBarChart, MdCurrencyExchange } from "react-icons/md"
import { nameCoinGecko } from "./components/coinGecko"
import { TooltipHorizon, QuestionMarkIcon } from "components/tooltip"
import { GiProgression } from "react-icons/gi"
import { TbArrowsExchange } from "react-icons/tb"
import { AiFillClockCircle } from "react-icons/ai"
import { getLoansCall } from "./components/ContractEvents"
import { useSearchParams } from "next/navigation"
import LendingStats from "./components/LendingStats"
import { useAppStore } from "store"

const LendingDetails = () => {
  const { address, isConnected, isDisconnected } = useAccount()
  const { prices } = useAppStore()
  const searchParams = useSearchParams()
  const termAddress = searchParams.get("term")

  // const { data: activeLoans, isLoading: activeLoansDataLoading } =
  //   useSWR<LendingTermsResponse>(`/loans/term/${termAddress}`, fetcher)
  // const { data: userActiveLoans, isLoading: myLoansDataLoading } =
  //   useSWR<LendingTermsResponse>(
  //     `/loans/term/${termAddress}/${address}`,
  //     fetcher
  //   )
  const [guildAllocated, setGuildAllocated] = React.useState<number>()
  const [guildBalance, setGuildBalance] = React.useState<number>()
  const [guildAvailableToStake, setGuildAvailableToStake] = React.useState(0)
  const [creditAllocated, setCreditAllocated] = React.useState<number>()
  const [creditAvailable, setCreditAvailable] = React.useState<number>()
  const [lendingTermData, setLendingTermData] = React.useState<lendingTerms>()
  const [collateralPrice, setCollateralPrice] = React.useState(0)
  const [pegPrice, setPegPrice] = React.useState(0)
  const [termTotalCollateral, setTermTotalCollateral] = React.useState(0)
  const [gaugeWeight, setGaugeWeight] = useState<number>(0)
  const [totalWeight, setTotalWeight] = useState<number>(0)
  const [creditTotalSupply, setCreditTotalSupply] = useState<number>(0)
  const [ratioGuildCredit, setRatioGuildCredit] = useState<number>(0)
  const [debtCeilling, setDebtCeilling] = useState<number>(0)
  const [currentDebt, setCurrentDebt] = useState<number>(0)
  const [isLoadingEventLoans, setIsLoadingEventLoans] = useState<boolean>(true)
  const [profitSharing, setProfitSharing] = React.useState({
    creditSplit: "",
    guildSplit: "",
    surplusBufferSplit: "",
  })
  const [reload, setReload] = useState<boolean>(false)
  const [utilization, setUtilization] = useState<string>("")
  const [eventLoans, setEventLoans] = useState<loanObj[]>([])
  const { lendingTerms  } = useAppStore()

  useEffect(() => {
    if (lendingTerms && termAddress) {
      setLendingTermData(
        lendingTerms.find((item) => item.address == termAddress)
      )
    }
  }, [lendingTerms])

  //Coin gecko price fetching
  useEffect(() => {
    function getPegPrice() {
      const nameCG = "usd-coin"
      const price = prices.find(crypto => crypto[nameCG])[nameCG].usd
      // const response = await axios.get(
      //   `https://api.coingecko.com/api/v3/simple/price?ids=${nameCG}&vs_currencies=usd`,
      //   {}
      // )
      setPegPrice(price)
    }
    function getCollateralPrice() {
      const nameCG = nameCoinGecko.find(
        (name) => name.nameECG === lendingTermData.collateral
      )?.nameCG
      const price = prices.find(crypto => crypto[nameCG])[nameCG].usd
      // const response = await axios.get(
      //   `https://api.coingecko.com/api/v3/simple/price?ids=${nameCG}&vs_currencies=usd`,
      //   {}
      // )
      setCollateralPrice(price)
    }
    async function getTermsTotalCollateral() {
      const result = await readContract({
        address: lendingTermData.collateralAddress as Address,
        abi: UsdcABI,
        functionName: "balanceOf",
        args: [lendingTermData.address],
      })

      setTermTotalCollateral(
        DecimalToUnit(result as bigint, lendingTermData.collateralDecimals)
      )
    }
    if (lendingTermData) {
      getPegPrice()
      getCollateralPrice()
      getTermsTotalCollateral()
      setUtilization(
        preciseRound(
          (currentDebt / creditTotalSupply) * (gaugeWeight / totalWeight) * 100,
          2
        ).toString()
      )
    }
  }, [lendingTermData, creditTotalSupply, gaugeWeight, totalWeight])

  //fetch smart contract data
  useEffect(() => {
    async function getGuildAllocated(): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
        abi: GuildABI,
        functionName: "getUserGaugeWeight",
        args: [address, termAddress],
      })
      setGuildAllocated(DecimalToUnit(result as bigint, 18))
    }
    async function getGuildAvailable(): Promise<void> {
      const balance = await readContract({
        address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
        abi: GuildABI,
        functionName: "balanceOf",
        args: [address],
      })
      const result = DecimalToUnit(balance as bigint, 18)

      setGuildBalance(result)
    }
    async function getGuildAvailableToStake(): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
        abi: GuildABI,
        functionName: "getUserWeight",
        args: [address],
      })
      setGuildAvailableToStake(DecimalToUnit(result as bigint, 18))
    }

    async function getCreditAllocated(): Promise<void> {
      const result = await readContract({
        address: process.env
          .NEXT_PUBLIC_SURPLUS_GUILD_MINTER_ADDRESS as Address,
        abi: SurplusGuildMinterABI,
        functionName: "stakes",
        args: [address, termAddress],
      })

      setCreditAllocated(DecimalToUnit(result as bigint, 18))
    }
    async function getCreditdAvailable(): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
        abi: CreditABI,
        functionName: "balanceOf",
        args: [address],
      })
      setCreditAvailable(DecimalToUnit(result as bigint, 18))
    }

    async function getEventLoans(): Promise<Object> {
      const loansCall = await getLoansCall(termAddress as Address)
      setEventLoans(loansCall)
      setIsLoadingEventLoans(false)
      return loansCall
    }

    if (isConnected) {
      getGuildAvailable()
      getGuildAllocated()
      getCreditAllocated()
      getCreditdAvailable()
      // getLoans()
      // getMyLoans()
      getGuildAvailableToStake()
    }
    // setGuildAvailable( parseInt(getGuildAvailable, 10) / 1e18 );
    else {
      setGuildAllocated(undefined)
      setGuildBalance(undefined)
      setCreditAllocated(undefined)
      setCreditAvailable(undefined)
      // getLoans()
    }
    getEventLoans()
    setReload(false)
  }, [isConnected, reload])

  //fetch other smart contract data
  useEffect(() => {
    async function getGaugeWeight(): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
        abi: GuildABI,
        functionName: "getGaugeWeight",
        args: [termAddress],
      })
      setGaugeWeight(Number(DecimalToUnit(result as bigint, 18)))
    }

    async function getTotalWeight(): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
        abi: GuildABI,
        functionName: "totalTypeWeight",
        args: [1],
      })
      setTotalWeight(Number(DecimalToUnit(result as bigint, 18)))
    }
    async function getCreditTotalSupply(): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
        abi: CreditABI,
        functionName: "totalSupply",
        args: [],
      })
      setCreditTotalSupply(Number(DecimalToUnit(result as bigint, 18)))
    }
    async function getRationGUILDCREDIT() {
      const ratio = await readContract({
        address: process.env
          .NEXT_PUBLIC_SURPLUS_GUILD_MINTER_ADDRESS as Address,
        abi: SurplusGuildMinterABI,
        functionName: "ratio",
      })
      setRatioGuildCredit(DecimalToUnit(ratio as bigint, 18))
    }
    async function getProfitSharing(): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_PROFIT_MANAGER_ADDRESS as Address,
        abi: ProfitManagerABI,
        functionName: "getProfitSharingConfig",
        args: [],
      })

      if (Array.isArray(result) && result.length >= 3) {
        setProfitSharing({
          creditSplit: preciseRound(
            DecimalToUnit(result[0] as bigint, 18) * 100,
            2
          ),
          guildSplit: preciseRound(
            DecimalToUnit(result[1] as bigint, 18) * 100,
            2
          ),
          surplusBufferSplit: preciseRound(
            DecimalToUnit(result[2] as bigint, 18) * 100,
            2
          ),
        })
      } else {
        throw new Error("Invalid profit sharing config")
      }
    }
    async function getCurrentDebt(): Promise<void> {
      const result = await readContract({
        address: termAddress as Address,
        abi: TermABI,
        functionName: "issuance",
      })
      setCurrentDebt(Number(DecimalToUnit(result as bigint, 18)))
    }
    const resp = getProfitSharing()
    console.log("erwererw", resp)
    getGaugeWeight()
    getTotalWeight()
    getCreditTotalSupply()
    getRationGUILDCREDIT()
    getCurrentDebt()
  }, [reload])

  useEffect(() => {
    setDebtCeilling(creditTotalSupply * (gaugeWeight / totalWeight) * 1.2)
  }, [creditTotalSupply, gaugeWeight, totalWeight])

  const formatLendingTermName = () => {
    const item: LendingTerms = lendingTermData

    return item
      ? `${
          item.collateral +
          "-" +
          item.interestRate * 100 +
          "%" +
          "-" +
          preciseRound(item.borrowRatio, 2)
        }`
      : null
  }

  if (!isConnected) {
    return <Disconnected />
  }

  if (lendingTermData) {
    return (
      <div>
        <h3 className="text-2xl font-semibold text-gray-700 dark:text-white">
          {formatLendingTermName()}
        </h3>
        <LendingStats
          lendingTermData={lendingTermData}
          currentDebt={currentDebt}
          debtCeilling={debtCeilling}
          utilization={utilization}
          termTotalCollateral={termTotalCollateral}
          collateralPrice={collateralPrice}
        />
        <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">
          Loan
        </h3>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3 ">
          <Card
            extra="order-1 w-full h-full sm:overflow-auto px-6 py-4"
            title="New Loan"
          >
            <CreateLoan
              name={lendingTermData.collateral}
              contractAddress={termAddress}
              collateralAddress={lendingTermData.collateralAddress}
              openingFee={lendingTermData.openingFee}
              minBorrow={lendingTermData.minBorrow}
              borrowRatio={lendingTermData.borrowRatio}
              callFee={lendingTermData.callFee}
              currentDebt={currentDebt}
              availableDebt={debtCeilling - currentDebt}
              collateralDecimals={lendingTermData.collateralDecimals}
              maxDelayBetweenPartialRepay={
                lendingTermData.maxDelayBetweenPartialRepay
              }
              reload={setReload}
            />
          </Card>
          <Card
            extra="md:col-span-2 order-2 w-full h-full px-6 py-4 sm:overflow-x-auto relative"
            title="My Active Loans"
          >
            <Myloans
              isLoadingEventLoans={isLoadingEventLoans}
              tableData={eventLoans}
              collateralName={lendingTermData.collateral}
              collateralPrice={collateralPrice}
              pegPrice={pegPrice}
              smartContractAddress={termAddress}
              maxDelayBetweenPartialRepay={
                lendingTermData.maxDelayBetweenPartialRepay
              }
              collateralDecimals={lendingTermData.collateralDecimals}
              reload={setReload}
            />
          </Card>
        </div>
        <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">
          Stake
        </h3>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card
            extra="order-1 w-full h-full sm:overflow-auto px-6 py-4"
            title="Stake GUILD"
          >
            <div className="h-full rounded-md">
              <TooltipHorizon
                extra="z-10 !w-[450px] dark:text-white"
                content={
                  <div className="space-y-2 p-2">
                    <p>
                      Staked GUILD increase the debt ceiling of lending terms
                      (available CREDIT to borrow).
                    </p>

                    <p>
                      If the term creates bad debt, the GUILD tokens staked for
                      this term are slashed.
                    </p>

                    <p>
                      When you stake your GUILD tokens on a term, this portion
                      of your balance becomes non-transferable, and if you
                      attempt to transfer your tokens, your GUILD will be
                      unstaked, which will decrease the debt ceiling. If the
                      debt ceiling cannot be decreased (due to active borrowing
                      demand), the loans have to be repaid or called first.
                      Loans can only be called if they missed a period payment
                      or if the term has been offboarded.
                    </p>

                    <p>
                      GUILD staked on a term earns a proportional share of the
                      fees earned by this term. If you represent{" "}
                      <strong>50%</strong> of the GUILD staked for a term, you
                      will earn <strong>50%</strong> of the fees earned by GUILD
                      stakers on this term.
                    </p>

                    <p>
                      The protocol profit sharing can be updated by governance,
                      and is configured as follow :<br />
                      &mdash; <strong>{profitSharing.creditSplit}</strong>% to
                      CREDIT savers
                      <br />
                      &mdash; <strong>{profitSharing.guildSplit}</strong>% to
                      GUILD stakers
                      <br />
                      &mdash;{" "}
                      <strong>{profitSharing.surplusBufferSplit}</strong>% to
                      the Surplus Buffer
                    </p>
                    <p>
                      The Surplus Buffer is a first-loss capital reserve shared
                      among all terms.
                    </p>
                  </div>
                }
                trigger={
                  <div className="mt-4 flex items-center space-x-2 text-gray-700 dark:text-white">
                    <span>Risk your GUILD tokens & earn CREDIT rewards</span>
                    <QuestionMarkIcon />
                  </div>
                }
                placement="bottom"
              />
              <div className="mt-4 space-y-8">
                <div className="rounded-md">
                  <Flowbite>
                    <Tabs.Group
                      aria-label="Tabs with underline"
                      style="underline"
                      className="z-0"
                    >
                      <Tabs.Item
                        active
                        className=""
                        icon={BsArrowUpRight}
                        title="Stake GUILD"
                      >
                        <AllocateGuild
                          textButton="Increment"
                          allocatedGuild={guildAllocated}
                          guildBalance={guildBalance}
                          smartContractAddress={termAddress}
                          currentDebt={currentDebt}
                          availableDebt={lendingTermData.availableDebt}
                          gaugeWeight={gaugeWeight}
                          totalWeight={totalWeight}
                          creditTotalSupply={creditTotalSupply}
                          guildAvailableToStake={guildAvailableToStake}
                          reload={setReload}
                        ></AllocateGuild>
                      </Tabs.Item>
                      <Tabs.Item icon={BsArrowDownLeft} title="Unstake GUILD">
                        <AllocateGuild
                          textButton="Decrement"
                          allocatedGuild={guildAllocated}
                          guildBalance={guildBalance}
                          smartContractAddress={termAddress}
                          currentDebt={currentDebt}
                          availableDebt={lendingTermData.availableDebt}
                          gaugeWeight={gaugeWeight}
                          totalWeight={totalWeight}
                          creditTotalSupply={creditTotalSupply}
                          guildAvailableToStake={guildAvailableToStake}
                          reload={setReload}
                        ></AllocateGuild>
                      </Tabs.Item>
                    </Tabs.Group>
                  </Flowbite>
                </div>
              </div>
            </div>
          </Card>

          <Card
            extra="order-2 w-full h-full sm:overflow-auto px-6 py-4"
            title="Stake CREDIT"
          >
            <div className="rounded-md">
              <TooltipHorizon
                extra="z-10 !w-[450px] dark:text-white"
                content={
                  <div className="space-y-2 p-2">
                    <p>
                      The CREDIT staked will act as first-loss capital if this
                      term creates bad debt. You will not recover any CREDIT if
                      this term creates bad debt while you staked.
                    </p>

                    <p>
                      For each CREDIT staked,{" "}
                      <strong>{preciseRound(ratioGuildCredit, 2)}</strong> GUILD
                      will be minted & staked for this term (see Stake GUILD
                      tooltip), which will increase the debt ceiling (available
                      CREDIT to borrow) in this term.
                    </p>

                    <p>
                      You will earn CREDIT from the regular GUILD stake rewards,
                      plus an additional <strong>X.XX</strong> GUILD per CREDIT
                      earned.
                    </p>
                  </div>
                }
                trigger={
                  <div className="mt-4 flex items-center space-x-2 text-gray-700 dark:text-white">
                    <h4>
                      Provide first lost capital & earn CREDIT + GUILD rewards
                    </h4>
                    <QuestionMarkIcon />
                  </div>
                }
                placement="bottom"
              />
              <div className="mt-4 space-y-8">
                <div className="rounded-md ">
                  <Flowbite>
                    <Tabs.Group
                      aria-label="Tabs with underline"
                      style="underline"
                      className="z-0"
                    >
                      <Tabs.Item
                        active
                        className=""
                        icon={BsArrowUpRight}
                        title="Stake CREDIT"
                      >
                        <Stake
                          textButton="stake"
                          allocatedCredit={creditAllocated}
                          availableCredit={creditAvailable}
                          termAddress={termAddress}
                          gaugeWeight={gaugeWeight}
                          totalWeight={totalWeight}
                          creditTotalSupply={creditTotalSupply}
                          ratioGuildCredit={ratioGuildCredit}
                          reload={setReload}
                        ></Stake>
                      </Tabs.Item>
                      <Tabs.Item icon={BsArrowDownLeft} title="Unstake CREDIT">
                        <Stake
                          textButton="Unstake"
                          allocatedCredit={creditAllocated}
                          availableCredit={creditAvailable}
                          termAddress={termAddress}
                          gaugeWeight={gaugeWeight}
                          totalWeight={totalWeight}
                          creditTotalSupply={creditTotalSupply}
                          ratioGuildCredit={ratioGuildCredit}
                          reload={setReload}
                        ></Stake>
                      </Tabs.Item>
                    </Tabs.Group>
                  </Flowbite>
                </div>
              </div>
            </div>
          </Card>
        </div>
        <div className="mb-20">
          <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">
            Overview
          </h3>
          <Card
            extra="order-5 md:col-span-2 w-full h-full px-6 py-4 overflow-auto sm:overflow-x-auto"
            title="Active Loans"
          >
            <ActiveLoans
              maxDelayBetweenPartialRepay={
                lendingTermData.maxDelayBetweenPartialRepay
              }
              collateralName={lendingTermData.collateral}
              termAddress={termAddress}
              activeLoans={eventLoans}
              collateralAddress={lendingTermData.collateralAddress}
              collateralDecimals={lendingTermData.collateralDecimals}
              reload={setReload}
            />
          </Card>
        </div>
      </div>
    )
  }
}

export default LendingDetails
