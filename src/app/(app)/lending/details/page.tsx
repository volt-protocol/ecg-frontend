"use client"

import { useAccount, useReadContracts } from "wagmi"
import Disconnected from "components/error/disconnected"
import React, { useEffect, useState } from "react"
import Card from "components/card"
import {
  TermABI,
  ProfitManagerABI,
  CreditABI,
  GuildABI,
  SurplusGuildMinterABI,
  ERC20PermitABI,
} from "lib/contracts"
import { readContract } from "@wagmi/core"
import Myloans from "./components/MyLoans"
import CreateLoan from "./components/CreateLoan"
import StakeCredit from "./components/StakeCredit"
import ActiveLoans from "./components/ActiveLoans"
import StakeGuild from "./components/StakeGuild"
import { loanObj, LendingTerms } from "types/lending"
import { MdOutlineOpenInNew } from "react-icons/md"
import { TooltipHorizon, QuestionMarkIcon } from "components/tooltip"
import { getActiveLoanDetails } from "lib/logs/loans"
import { useSearchParams } from "next/navigation"
import LendingStats from "./components/LendingStats"
import { useAppStore } from "store"
import { Tab } from "@headlessui/react"
import clsx from "clsx"
import { Abi, formatUnits, erc20Abi, Address } from "viem"
import { generateTermName } from "utils/strings"
import { formatDecimal, toLocaleString } from "utils/numbers"
import { coinsList } from "config"
import { wagmiConfig } from "contexts/Web3Provider"
import { lendingTermConfig } from "config"
import { ToggleCredit } from "components/switch/ToggleCredit"

const LendingDetails = () => {
  const { address, isConnected } = useAccount()
  const { prices, lendingTerms, contractsList } = useAppStore()
  const searchParams = useSearchParams()
  const termAddress = searchParams.get("term")
  const [lendingTermData, setLendingTermData] = useState<LendingTerms>()
  const [collateralPrice, setCollateralPrice] = useState(0)
  const [pegPrice, setPegPrice] = useState(0)
  const [termTotalCollateral, setTermTotalCollateral] = useState(0)
  const [isLoadingEventLoans, setIsLoadingEventLoans] = useState<boolean>(true)
  const [reload, setReload] = useState<boolean>(false)
  const [utilization, setUtilization] = useState<string>("")
  const [eventLoans, setEventLoans] = useState<loanObj[]>([])
  const [currencyType, setCurrencyType] = useState<"gUSDC" | "USDC">("gUSDC")

  useEffect(() => {
    if (lendingTerms && termAddress) {
      setLendingTermData(lendingTerms.find((item) => item.address == termAddress))
    }
  }, [lendingTerms])

  /* Smart contract reads */
  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: contractsList.profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: "creditMultiplier",
      },
      {
        address: contractsList.usdcAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: contractsList.creditAddress,
        abi: CreditABI,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: contractsList.creditAddress,
        abi: CreditABI,
        functionName: "nonces",
        args: [address],
      },
      {
        address: contractsList.usdcAddress,
        abi: ERC20PermitABI,
        functionName: "nonces",
        args: [address],
      },
      {
        address: contractsList.profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: "minBorrow",
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: "getUserWeight",
        args: [address],
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: "getUserGaugeWeight",
        args: [address, termAddress],
      },
      {
        address: contractsList.surplusGuildMinterAddress,
        abi: SurplusGuildMinterABI,
        functionName: "getUserStake",
        args: [address, termAddress],
      },
      {
        address: termAddress as Address,
        abi: TermABI,
        functionName: "debtCeiling",
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: "getGaugeWeight",
        args: [termAddress],
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: "totalTypeWeight",
        args: [1],
      },
      {
        address: contractsList.creditAddress,
        abi: CreditABI,
        functionName: "totalSupply",
        args: [],
      },
      {
        address: contractsList.surplusGuildMinterAddress,
        abi: SurplusGuildMinterABI,
        functionName: "mintRatio",
      },
      {
        address: termAddress as Address,
        abi: TermABI,
        functionName: "issuance",
      },
      {
        address: contractsList.profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: "getProfitSharingConfig",
      },
    ],
    query: {
      select: (data) => {
        return {
          creditMultiplier: data[0].result as bigint,
          usdcBalance: data[1].result as bigint,
          creditBalance: data[2].result as bigint,
          gusdcNonces: data[3].result as bigint,
          usdcNonces: data[4].result as bigint,
          minBorrow: data[5].result as bigint,
          guildUserWeight: data[6].result as bigint,
          guildBalance: data[7].result as bigint,
          guildUserGaugeWeight: data[8].result as bigint,
          creditAllocated: data[9].result.credit as bigint,
          debtCeiling: Number(formatUnits(data[10].result as bigint, 18)),
          gaugeWeight: Number(formatUnits(data[11].result as bigint, 18)),
          totalWeight: Number(formatUnits(data[12].result as bigint, 18)),
          creditTotalSupply: Number(formatUnits(data[13].result as bigint, 18)),
          ratioGuildCredit: Number(formatUnits(data[14].result as bigint, 18)),
          currentDebt: Number(formatUnits(data[15].result as bigint, 18)),
          profitSharing: {
            creditSplit: formatDecimal(
              Number(formatUnits(data[16].result[1] as bigint, 18)) * 100,
              2
            ),
            guildSplit: formatDecimal(
              Number(formatUnits(data[16].result[2] as bigint, 18)) * 100,
              2
            ),
            surplusBufferSplit: formatDecimal(
              Number(formatUnits(data[16].result[0] as bigint, 18)) * 100,
              2
            ),
          },
        }
      },
    },
  })
  /* End Smart contract reads */

  //Coin gecko price fetching
  useEffect(() => {
    function getPegPrice() {
      const nameCG = "usd-coin"
      const price = prices[nameCG].usd
      setPegPrice(price)
    }

    function getCollateralPrice() {
      const nameCG = coinsList.find(
        (name) => name.nameECG === lendingTermData.collateral.symbol
      )?.nameCG
      const price = prices[nameCG].usd
      setCollateralPrice(price)
    }

    async function getTermsTotalCollateral() {
      const result = await readContract(wagmiConfig, {
        address: lendingTermData.collateral.address as Address,
        abi: erc20Abi as Abi,
        functionName: "balanceOf",
        args: [lendingTermData.address],
      })

      setTermTotalCollateral(
        Number(formatUnits(result as bigint, lendingTermData.collateral.decimals))
      )
    }

    if (lendingTermData) {
      getPegPrice()
      getCollateralPrice()
      getTermsTotalCollateral()
      setUtilization(
        formatDecimal(
          (data?.currentDebt / data?.creditTotalSupply) *
            (data?.gaugeWeight / data?.totalWeight) *
            100,
          2
        )
      )
    }
  }, [lendingTermData, data?.creditTotalSupply, data?.gaugeWeight, data?.totalWeight])

  useEffect(() => {
    async function getEventLoans(): Promise<Object> {
      setIsLoadingEventLoans(true)
      const loansCall = await getActiveLoanDetails(termAddress as Address)
      setEventLoans(loansCall)
      setIsLoadingEventLoans(false)
      return loansCall
    }

    getEventLoans()
    refetch() //refect onchain data (!important for signatures)
    setReload(false)
  }, [reload])

  if (!isConnected) {
    return <Disconnected />
  }

  if (lendingTermData && data) {
    return (
      <div>
        <div className="my-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-semibold text-gray-700 dark:text-white">
              {generateTermName(
                lendingTermData.collateral.symbol,
                lendingTermData.interestRate,
                lendingTermData.borrowRatio /
                  Number(formatUnits(data?.creditMultiplier, 18))
              )}
            </h3>
            <a
              target="_blank"
              href={
                process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_ADDRESS + "/" + termAddress
              }
              type="button"
              className="flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1.5 text-xs transition-all duration-150 ease-in-out  dark:bg-navy-700 dark:text-stone-300 dark:ring-navy-600 dark:hover:text-stone-100 "
            >
              View in explorer
              <MdOutlineOpenInNew />
            </a>
          </div>
          <div className="flex items-center gap-1">
            <TooltipHorizon
              extra="dark:text-gray-200 w-[240px]"
              content={
                <p>Use USDC for your borrows and repays when lending term allows it.</p>
              }
              trigger={
                <div>
                  <QuestionMarkIcon />
                </div>
              }
              placement="left"
            />

            <ToggleCredit
              selectType={setCurrencyType}
              type={currencyType}
              disabled={
                !lendingTermConfig.find((item) => item.termAddress == termAddress)
                  ?.useGateway
              }
            />
          </div>
        </div>
        <LendingStats
          creditMultiplier={data?.creditMultiplier}
          lendingTermData={lendingTermData}
          currentDebt={data?.currentDebt}
          debtCeiling={data?.debtCeiling}
          utilization={utilization}
          termTotalCollateral={termTotalCollateral}
          collateralPrice={collateralPrice}
        />
        <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">
          Loan
        </h3>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3 ">
          <Card extra="order-1 w-full h-full sm:overflow-auto px-6 py-4" title="New Loan">
            <CreateLoan
              lendingTerm={lendingTermData}
              availableDebt={
                data?.debtCeiling - data?.currentDebt > 0
                  ? data?.debtCeiling - data?.currentDebt
                  : 0
              }
              creditMultiplier={data?.creditMultiplier}
              creditBalance={data?.creditBalance}
              usdcBalance={data?.usdcBalance}
              gusdcNonces={data?.gusdcNonces}
              minBorrow={Number(formatUnits(data?.minBorrow, 18))}
              setReload={setReload}
              reload={reload}
              currencyType={currencyType}
            />
          </Card>
          <Card
            extra="md:col-span-2 order-2 w-full h-full px-6 py-4 sm:overflow-x-auto relative"
            title="Your Active Loans"
          >
            <Myloans
              lendingTerm={lendingTermData}
              isLoadingEventLoans={isLoadingEventLoans}
              tableData={eventLoans}
              collateralPrice={collateralPrice}
              pegPrice={pegPrice}
              setReload={setReload}
              reload={reload}
              creditMultiplier={data?.creditMultiplier}
              usdcBalance={data?.usdcBalance}
              creditBalance={data?.creditBalance}
              usdcNonces={data?.usdcNonces}
              minBorrow={data?.minBorrow}
              currencyType={currencyType}
            />
          </Card>
        </div>
        <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">
          Stake
        </h3>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card extra="order-1 w-full h-full sm:overflow-auto px-6">
            <div className="h-full rounded-md">
              <div className="mt-4 space-y-8">
                <div className="rounded-md">
                  <dl className="my-5 flex rounded-md bg-gray-50 ring-1 ring-gray-100 dark:bg-navy-600 dark:ring-navy-800">
                    <div
                      key="guildStaking"
                      className="border-r border-gray-100 px-4 py-3 dark:border-navy-800"
                    >
                      <dt className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Your GUILD staked
                      </dt>
                      <dd className="mt-1 flex items-baseline justify-between gap-6 md:block lg:flex">
                        <div className="flex items-baseline text-2xl font-semibold text-brand-500">
                          {data?.guildUserGaugeWeight != undefined &&
                            toLocaleString(
                              formatDecimal(
                                Number(formatUnits(data?.guildUserGaugeWeight, 18)),
                                2
                              )
                            )}
                        </div>
                        <div className="inline-flex items-baseline rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800 md:mt-2 lg:mt-0">
                          {data?.guildUserGaugeWeight != undefined &&
                            data?.guildBalance != undefined &&
                            formatDecimal(
                              (Number(formatUnits(data?.guildUserGaugeWeight, 18)) /
                                Number(formatUnits(data?.guildBalance, 18))) *
                                100,
                              2
                            )}
                          %
                        </div>
                      </dd>
                      <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-300">
                        /{" "}
                        {data?.guildBalance != undefined &&
                          toLocaleString(
                            formatDecimal(Number(formatUnits(data?.guildBalance, 18)), 2)
                          )}
                      </span>
                    </div>
                    <div className="mx-auto flex flex-col items-center justify-center px-4 text-center">
                      <TooltipHorizon
                        extra="z-10 !w-[450px] dark:text-gray-100"
                        content={
                          <div className="space-y-2 p-2">
                            <p>
                              Staked GUILD increase the debt ceiling of lending terms
                              (available gUSDC to borrow).
                            </p>

                            <p>
                              If the term creates bad debt, the GUILD tokens staked for
                              this term are slashed.
                            </p>

                            <p>
                              When you stake your GUILD tokens on a term, this portion of
                              your balance becomes non-transferable, and if you attempt to
                              transfer your tokens, your GUILD will be unstaked, which
                              will decrease the debt ceiling. If the debt ceiling cannot
                              be decreased (due to active borrowing demand), the loans
                              have to be repaid or called first. Loans can only be called
                              if they missed a period payment or if the term has been
                              offboarded.
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
                              &mdash; <strong>{data?.profitSharing.guildSplit}</strong>%
                              to GUILD stakers
                              <br />
                              &mdash; <strong>{data?.profitSharing.creditSplit}</strong>
                              % to gUSDC savers
                              <br />
                              &mdash;{" "}
                              <strong>{data?.profitSharing.surplusBufferSplit}</strong>%
                              to the Surplus Buffer
                            </p>
                            <p>
                              The Surplus Buffer is a first-loss capital reserve shared
                              among all terms.
                            </p>
                          </div>
                        }
                        trigger={
                          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-200">
                            <span>Risk your GUILD tokens & earn gUSDC rewards</span>
                            <QuestionMarkIcon />
                          </div>
                        }
                        placement="bottom"
                      />
                    </div>
                  </dl>

                  <Tab.Group>
                    <Tab.List className="flex space-x-1 rounded-md bg-brand-100/50 p-1 dark:bg-navy-700">
                      <Tab
                        key="stake-guild"
                        className={({ selected }) =>
                          clsx(
                            "w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base",
                            selected
                              ? "bg-white font-semibold text-brand-500 dark:bg-navy-600/70"
                              : "font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50"
                          )
                        }
                      >
                        Stake
                      </Tab>
                      <Tab
                        key="unstake-guild"
                        className={({ selected }) =>
                          clsx(
                            "w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base",
                            selected
                              ? "bg-white font-semibold text-brand-500 dark:bg-navy-600/70"
                              : "font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50"
                          )
                        }
                      >
                        Unstake
                      </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-2">
                      <Tab.Panel key="stake-guild" className={"px-3 py-1"}>
                        <StakeGuild
                          debtCeiling={data?.debtCeiling}
                          lendingTerm={lendingTermData}
                          textButton="Stake"
                          guildUserGaugeWeight={data?.guildUserGaugeWeight}
                          guildBalance={data?.guildBalance}
                          smartContractAddress={termAddress}
                          guildUserWeight={data?.guildUserWeight}
                          reload={setReload}
                        />
                      </Tab.Panel>
                      <Tab.Panel key="unstake-guild" className={"px-3 py-1"}>
                        <StakeGuild
                          debtCeiling={data?.debtCeiling}
                          lendingTerm={lendingTermData}
                          textButton="Unstake"
                          guildUserGaugeWeight={data?.guildUserGaugeWeight}
                          guildBalance={data?.guildBalance}
                          smartContractAddress={termAddress}
                          guildUserWeight={data?.guildUserWeight}
                          reload={setReload}
                        />
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>
                </div>
              </div>
            </div>
          </Card>

          <Card extra="order-1 w-full h-full sm:overflow-auto px-6">
            <div className="rounded-md">
              <div className="mt-4 space-y-8">
                <div className="rounded-md ">
                  <dl className="my-5 flex rounded-md bg-gray-50 ring-1 ring-gray-100 dark:bg-navy-600 dark:ring-navy-800">
                    <div
                      key="guildStaking"
                      className="border-r border-gray-100 px-4 py-3 dark:border-navy-800"
                    >
                      <dt className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Your gUSDC staked
                      </dt>
                      <dd className="mt-1 flex items-baseline justify-between gap-6 md:block lg:flex">
                        <div className="flex items-baseline text-2xl font-semibold text-brand-500">
                          {data?.creditAllocated != undefined &&
                            toLocaleString(
                              formatDecimal(
                                Number(formatUnits(data?.creditAllocated, 18)),
                                2
                              )
                            )}
                        </div>
                        <div className="inline-flex items-baseline rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800 md:mt-2 lg:mt-0">
                          {data?.creditAllocated != undefined &&
                            data?.creditBalance != undefined &&
                            formatDecimal(
                              (Number(formatUnits(data?.creditAllocated, 18)) /
                                (Number(formatUnits(data?.creditBalance, 18)) +
                                  Number(formatUnits(data?.creditAllocated, 18)))) *
                                100,
                              2
                            )}
                          %
                        </div>
                      </dd>
                      <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-300">
                        /{" "}
                        {data?.creditBalance != undefined &&
                          data?.creditAllocated != undefined &&
                          toLocaleString(
                            formatDecimal(
                              Number(formatUnits(data?.creditBalance, 18)) +
                                Number(formatUnits(data?.creditAllocated, 18)),
                              2
                            )
                          )}
                      </span>
                    </div>
                    <div className="mx-auto flex flex-col items-center justify-center px-4 text-center">
                      <TooltipHorizon
                        extra="z-10 !w-[450px] dark:text-white"
                        content={
                          <div className="space-y-2 p-2">
                            <p>
                              The gUSDC staked will act as first-loss capital if this term
                              creates bad debt. You will not recover any gUSDC if this
                              term creates bad debt while you staked.
                            </p>

                            <p>
                              For each gUSDC staked,{" "}
                              <strong>{formatDecimal(data?.ratioGuildCredit, 2)}</strong>{" "}
                              GUILD will be minted & staked for this term (see Stake GUILD
                              tooltip), which will increase the debt ceiling (available
                              gUSDC to borrow) in this term.
                            </p>

                            <p>
                              You will earn gUSDC from the regular GUILD stake rewards,
                              plus an additional <strong>X.XX</strong> GUILD per gUSDC
                              earned.
                            </p>
                          </div>
                        }
                        trigger={
                          <div className="flex items-center space-x-2 text-gray-700 dark:text-white">
                            <h4>
                              Provide first lost capital & earn gUSDC + GUILD rewards
                            </h4>
                            <QuestionMarkIcon />
                          </div>
                        }
                        placement="bottom"
                      />
                    </div>
                  </dl>

                  <Tab.Group>
                    <Tab.List className="flex space-x-1 rounded-md bg-brand-100/50 p-1 dark:bg-navy-700">
                      <Tab
                        key="stake-credit"
                        className={({ selected }) =>
                          clsx(
                            "w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base",
                            selected
                              ? "bg-white font-semibold text-brand-500 dark:bg-navy-600/70"
                              : "font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50"
                          )
                        }
                      >
                        Stake
                      </Tab>
                      <Tab
                        key="unstake-credit"
                        className={({ selected }) =>
                          clsx(
                            "w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base",
                            selected
                              ? "bg-white font-semibold text-brand-500 dark:bg-navy-600/70"
                              : "font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50"
                          )
                        }
                      >
                        Unstake
                      </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-2">
                      <Tab.Panel key="stake-credit" className={"px-3 py-1"}>
                        <StakeCredit
                          debtCeiling={data?.debtCeiling}
                          lendingTerm={lendingTermData}
                          textButton="Stake"
                          creditAllocated={data?.creditAllocated}
                          creditBalance={data?.creditBalance}
                          termAddress={termAddress}
                          ratioGuildCredit={data?.ratioGuildCredit}
                          reload={setReload}
                        />
                      </Tab.Panel>
                      <Tab.Panel key="unstake-credit" className={"px-3 py-1"}>
                        <StakeCredit
                          debtCeiling={data?.debtCeiling}
                          lendingTerm={lendingTermData}
                          textButton="Unstake"
                          creditAllocated={data?.creditAllocated}
                          creditBalance={data?.creditBalance}
                          termAddress={termAddress}
                          ratioGuildCredit={data?.ratioGuildCredit}
                          reload={setReload}
                        />
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>
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
              lendingTerm={lendingTermData}
              activeLoans={eventLoans}
              isLoadingEventLoans={isLoadingEventLoans}
              reload={setReload}
              currencyType={currencyType}
            />
          </Card>
        </div>
      </div>
    )
  }
}

export default LendingDetails
