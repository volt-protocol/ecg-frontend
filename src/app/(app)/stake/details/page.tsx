'use client';

import { useAccount, useReadContracts } from 'wagmi';
import Disconnected from 'components/error/disconnected';
import React, { useEffect, useState } from 'react';
import Card from 'components/card';
import { TermABI, ProfitManagerABI, CreditABI, GuildABI, SurplusGuildMinterABI, ERC20PermitABI } from 'lib/contracts';
import { readContract } from '@wagmi/core';
import StakeCredit from './components/StakeCredit';
import StakeGuild from './components/StakeGuild';
import { loanObj, LendingTerms } from 'types/lending';
import { MdOutlineOpenInNew } from 'react-icons/md';
import { TooltipHorizon, QuestionMarkIcon } from 'components/tooltip';
import { getActiveLoanDetails } from 'lib/logs/loans';
import { useSearchParams } from 'next/navigation';
import { useAppStore, useUserPrefsStore } from 'store';
import { Tab } from '@headlessui/react';
import clsx from 'clsx';
import { Abi, formatUnits, erc20Abi, Address } from 'viem';
import { eq, generateTermName, getCreditTokenSymbol } from 'utils/strings';
import { formatDecimal, toLocaleString } from 'utils/numbers';
import { wagmiConfig } from 'contexts/Web3Provider';
import { getPegTokenLogo, getExplorerBaseUrl } from 'config';
import Image from 'next/image';
import { MdArrowBack } from 'react-icons/md';
import Link from 'next/link';
import { marketsConfig } from 'config';

const LendingDetails = () => {
  const { address, isConnected } = useAccount();
  const { coinDetails, lendingTerms, contractsList, fetchLendingTerms } = useAppStore();
  const { appMarketId, appChainId } = useUserPrefsStore();
  const market = marketsConfig[appChainId].find((_) => _.marketId == appMarketId);

  const searchParams = useSearchParams();
  const termAddress = searchParams.get('term');
  const [lendingTermData, setLendingTermData] = useState<LendingTerms>();
  const [termTotalCollateral, setTermTotalCollateral] = useState(0);
  const [isLoadingEventLoans, setIsLoadingEventLoans] = useState<boolean>(true);
  const [reload, setReload] = useState<boolean>(true);
  const [utilization, setUtilization] = useState<string>('');
  const [eventLoans, setEventLoans] = useState<loanObj[]>([]);

  useEffect(() => {
    if (lendingTerms && termAddress) {
      setLendingTermData(lendingTerms.find((item) => item.address == termAddress));
    }
  }, [lendingTerms]);

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const guildAddress = contractsList?.guildAddress;
  const creditAddress = contractsList?.marketContracts[appMarketId]?.creditAddress;
  const profitManagerAddress = contractsList?.marketContracts[appMarketId]?.profitManagerAddress;
  const surplusGuildMinterAddress = contractsList?.marketContracts[appMarketId]?.surplusGuildMinterAddress;

  const creditTokenSymbol = getCreditTokenSymbol(coinDetails, appMarketId, contractsList);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);

  /* Smart contract reads */
  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: 'creditMultiplier',
        chainId: appChainId
      },
      {
        address: pegToken?.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
        chainId: appChainId
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'balanceOf',
        args: [address],
        chainId: appChainId
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'nonces',
        args: [address],
        chainId: appChainId
      },
      {
        address: pegToken?.address,
        abi: ERC20PermitABI,
        functionName: 'nonces',
        args: [address],
        chainId: appChainId
      },
      {
        address: profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: 'minBorrow',
        chainId: appChainId
      },
      {
        address: guildAddress,
        abi: GuildABI,
        functionName: 'getUserWeight',
        args: [address],
        chainId: appChainId
      },
      {
        address: guildAddress,
        abi: GuildABI,
        functionName: 'balanceOf',
        args: [address],
        chainId: appChainId
      },
      {
        address: guildAddress,
        abi: GuildABI,
        functionName: 'getUserGaugeWeight',
        args: [address, termAddress],
        chainId: appChainId
      },
      {
        address: surplusGuildMinterAddress,
        abi: SurplusGuildMinterABI,
        functionName: 'getUserStake',
        args: [address, termAddress],
        chainId: appChainId
      },
      {
        address: termAddress as Address,
        abi: TermABI,
        functionName: 'debtCeiling',
        chainId: appChainId
      },
      {
        address: guildAddress,
        abi: GuildABI,
        functionName: 'getGaugeWeight',
        args: [termAddress],
        chainId: appChainId
      },
      {
        address: guildAddress,
        abi: GuildABI,
        functionName: 'totalTypeWeight',
        args: [appMarketId],
        chainId: appChainId
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'totalSupply',
        args: [],
        chainId: appChainId
      },
      {
        address: surplusGuildMinterAddress,
        abi: SurplusGuildMinterABI,
        functionName: 'mintRatio',
        chainId: appChainId
      },
      {
        address: surplusGuildMinterAddress,
        abi: SurplusGuildMinterABI,
        functionName: 'rewardRatio',
        chainId: appChainId
      },
      {
        address: termAddress as Address,
        abi: TermABI,
        functionName: 'issuance',
        chainId: appChainId
      },
      {
        address: profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: 'getProfitSharingConfig',
        chainId: appChainId
      },
      {
        address: profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: 'termSurplusBuffer',
        args: [termAddress],
        chainId: appChainId
      }
    ],
    query: {
      select: (data) => {
        return {
          creditMultiplier: data[0].result as bigint,
          pegTokenBalance: data[1].result as bigint,
          creditBalance: data[2].result as bigint,
          creditTokenNonces: data[3].result as bigint,
          pegTokenNonces: data[4].result as bigint,
          minBorrow: data[5].result as bigint,
          guildUserWeight: data[6].result as bigint,
          guildBalance: data[7].result as bigint,
          guildUserGaugeWeight: data[8].result as bigint,
          creditAllocated: data[9].result.credit as bigint,
          debtCeiling: Number(formatUnits(data[10].result as bigint, 18)),
          gaugeWeight: Number(formatUnits(data[11].result as bigint, 18)),
          totalWeight: Number(formatUnits(data[12].result as bigint, 18)),
          creditTotalSupply: Number(formatUnits(data[13].result as bigint, 18)),
          sgmMintRatio: Number(formatUnits(data[14].result as bigint, 18)),
          sgmRewardRatio: Number(formatUnits(data[15].result as bigint, 18)),
          currentDebt: Number(formatUnits(data[16].result as bigint, 18)),
          profitSharing: {
            creditSplit: formatDecimal(Number(formatUnits(data[17].result[1] as bigint, 18)) * 100, 2),
            guildSplit: formatDecimal(Number(formatUnits(data[17].result[2] as bigint, 18)) * 100, 2),
            surplusBufferSplit: formatDecimal(Number(formatUnits(data[17].result[0] as bigint, 18)) * 100, 2)
          },
          termSurplusBuffer: Number(formatUnits(data[18].result as bigint, 18))
        };
      }
    }
  });
  /* End Smart contract reads */

  useEffect(() => {
    async function getTermsTotalCollateral() {
      const result = await readContract(wagmiConfig, {
        address: lendingTermData.collateral.address as Address,
        abi: erc20Abi as Abi,
        functionName: 'balanceOf',
        args: [lendingTermData.address],
        chainId: appChainId as any
      });

      setTermTotalCollateral(Number(formatUnits(result as bigint, lendingTermData.collateral.decimals)));
    }

    if (lendingTermData) {
      getTermsTotalCollateral();
      setUtilization(formatDecimal(Math.min((data?.currentDebt / data?.debtCeiling) * 100, 100), 2));
    }
  }, [lendingTermData, data?.creditTotalSupply, data?.gaugeWeight, data?.totalWeight]);

  useEffect(() => {
    if (!reload) {
      return;
    }

    async function getEventLoans(): Promise<Object> {
      setIsLoadingEventLoans(true);
      const loansCall = await getActiveLoanDetails(appChainId, termAddress as Address);
      setEventLoans(loansCall);
      setIsLoadingEventLoans(false);
      return loansCall;
    }

    getEventLoans();
    fetchLendingTerms(appMarketId, appChainId);
    refetch(); //refect onchain data (!important for signatures)
    setReload(false);
  }, [reload]);

  if (!isConnected) {
    return <Disconnected />;
  }

  function getPercentageAllocation(alreadyAllocated: bigint, totalBalance: bigint) {
    const total = Number(formatUnits(totalBalance, 18)) + Number(formatUnits(alreadyAllocated, 18));
    if (total == 0) {
      return '0';
    }

    return formatDecimal(
      (Number(formatUnits(alreadyAllocated, 18)) /
        (Number(formatUnits(totalBalance, 18)) + Number(formatUnits(alreadyAllocated, 18)))) *
        100,
      2
    );
  }

  const isMarketLendingTerm =
    lendingTerms.find((term) => term.address.toLowerCase() == termAddress.toLowerCase()) != undefined;
  if (!isMarketLendingTerm) {
    return (
      <div>
        {market.deprecated ? (
          <div className="mb-3 rounded-md bg-white p-5 text-center dark:bg-navy-800 dark:text-white">
            <div className="text-xl font-semibold text-yellow-600">This market is deprecated</div>
            <div className="text-m mt-3">
              Consider repaying open borrows and redeeming your lent assets, as no new loans can be opened and no new
              lenders can enter the market.
            </div>
          </div>
        ) : null}
        <div className="py-10 text-center text-gray-400" style={{ fontSize: '1.3em' }}>
          This Lending Term is not part of the selected market.
          <br />
          <br />
          <Link href="/stake">
            <button
              type="button"
              className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm text-stone-600 shadow-sm transition-all duration-150 ease-in-out hover:bg-brand-100/30 hover:text-stone-800 dark:bg-navy-700 dark:text-stone-300 dark:hover:text-stone-100"
            >
              <MdArrowBack className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:block">Go Back</span>
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (lendingTermData && data) {
    return (
      <div>
        {market.deprecated ? (
          <div className="mb-3 rounded-md bg-white p-5 text-center dark:bg-navy-800 dark:text-white">
            <div className="text-xl font-semibold text-yellow-600">This market is deprecated</div>
            <div className="text-m mt-3">
              Consider repaying open borrows and redeeming your lent assets, as no new loans can be opened and no new
              lenders can enter the market.
            </div>
          </div>
        ) : null}
        <div className="my-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-semibold text-gray-700 dark:text-white">
              {generateTermName(
                lendingTermData.collateral.symbol,
                lendingTermData.interestRate,
                lendingTermData.borrowRatio / Number(formatUnits(data?.creditMultiplier, 18))
              )}
            </h3>
            <a
              target="_blank"
              href={getExplorerBaseUrl(appChainId) + '/address/' + termAddress}
              type="button"
              className="flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1.5 text-xs transition-all duration-150 ease-in-out  dark:bg-navy-700 dark:text-stone-300 dark:ring-navy-600 dark:hover:text-stone-100 "
            >
              View in explorer
              <MdOutlineOpenInNew />
            </a>
          </div>
        </div>
        <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">Stake</h3>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card extra="order-1 w-full h-full sm:overflow-auto px-6">
            <div className="h-full rounded-md">
              <div className="mt-4 space-y-8">
                <div className="rounded-md">
                  <dl className="my-5 flex rounded-md bg-gray-50 ring-1 ring-gray-100 dark:bg-navy-600 dark:ring-navy-800">
                    <div className="border-r border-gray-100 px-4 py-3 dark:border-navy-800">
                      <dt className="text-base font-medium text-gray-900 dark:text-gray-100">Your GUILD staked</dt>
                      <dd className="mt-1 flex items-baseline justify-between gap-6 md:block lg:flex">
                        <div className="flex items-baseline text-2xl font-semibold text-brand-500">
                          {data?.guildUserGaugeWeight != undefined &&
                            toLocaleString(formatDecimal(Number(formatUnits(data?.guildUserGaugeWeight, 18)), 2))}
                        </div>
                        <div className="inline-flex items-baseline rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800 md:mt-2 lg:mt-0">
                          {data?.guildUserGaugeWeight != undefined &&
                            data?.guildBalance != undefined &&
                            getPercentageAllocation(data?.guildUserGaugeWeight, data?.guildBalance)}
                          %
                        </div>
                      </dd>
                      <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-300">
                        /{' '}
                        {data?.guildBalance != undefined &&
                          toLocaleString(formatDecimal(Number(formatUnits(data?.guildBalance, 18)), 2))}
                      </span>
                    </div>

                    <div className="border-r border-gray-100 px-4 py-3 dark:border-navy-800">
                      <dt className="text-base font-medium text-gray-900 dark:text-gray-100">Total GUILD staked</dt>
                      <dd className="mt-1 flex items-baseline justify-between gap-6 md:block lg:flex">
                        <div className="flex items-baseline text-2xl font-semibold text-brand-500">
                          {data?.gaugeWeight != undefined && formatDecimal(data?.gaugeWeight, 2)}
                        </div>
                      </dd>
                    </div>

                    <div className="mx-auto flex flex-col items-center justify-center px-4 text-center">
                      <TooltipHorizon
                        extra="z-10 !w-[450px] dark:text-gray-100"
                        content={
                          <div className="space-y-2 p-2">
                            <p>
                              Staked{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              GUILD increase the debt ceiling of lending terms (
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              {pegToken?.symbol} borrow cap).
                            </p>

                            <p>
                              If the term creates bad debt, the{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              GUILD and{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={16}
                                height={16}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol} tokens staked for this term are slashed.
                            </p>

                            <p>
                              When you stake your{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              GUILD tokens on a term, this portion of your balance becomes non-transferable, and if you
                              attempt to transfer your tokens, your{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              GUILD will be unstaked, which will decrease the debt ceiling. If the debt ceiling cannot
                              be decreased (due to active borrowing demand), the loans have to be repaid or called
                              first. Loans can only be called if they are above the max borrow ratio, missed a periodic
                              payment, or if the term has been offboarded.
                            </p>

                            <p>
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              GUILD staked on a term earns a proportional share of the fees earned by this term, in the
                              form of{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={16}
                                height={16}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol} tokens. If you represent <strong>50%</strong> of the{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              GUILD staked for a term, you will earn <strong>50%</strong> of the fees earned by{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              GUILD stakers on this term.
                            </p>

                            <p>
                              The protocol profit sharing can be updated by governance, and is configured as follow :
                              <br />
                              &mdash; <strong>{data?.profitSharing.creditSplit}</strong>% to{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={16}
                                height={16}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol} savers
                              <br />
                              &mdash; <strong>{data?.profitSharing.guildSplit}</strong>% to{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              GUILD stakers
                              <br />
                              &mdash; <strong>{data?.profitSharing.surplusBufferSplit}</strong>% to the Surplus Buffer
                            </p>
                            <p>The Surplus Buffer is a first-loss capital reserve shared among all terms.</p>
                          </div>
                        }
                        trigger={
                          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-200">
                            <span>
                              Risk{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={24}
                                height={24}
                                alt="logo"
                              />{' '}
                              GUILD
                              <br />
                              Earn{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={24}
                                height={24}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol}
                            </span>
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
                            'w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base',
                            selected
                              ? 'bg-white font-semibold text-brand-500 dark:bg-navy-600/70'
                              : 'font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50'
                          )
                        }
                      >
                        Stake
                      </Tab>
                      <Tab
                        key="unstake-guild"
                        className={({ selected }) =>
                          clsx(
                            'w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base',
                            selected
                              ? 'bg-white font-semibold text-brand-500 dark:bg-navy-600/70'
                              : 'font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50'
                          )
                        }
                      >
                        Unstake
                      </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-2">
                      <Tab.Panel key="stake-guild" className={'px-3 py-1'}>
                        {market.deprecated ? (
                          <div className="mb-3 rounded-md bg-white p-5 text-center dark:bg-navy-800 dark:text-white">
                            <div className="text-xl font-semibold text-yellow-600">This market is deprecated</div>
                            <div className="text-m mt-3">
                              Consider repaying open borrows and redeeming your lent assets, as no new loans can be
                              opened and no new lenders can enter the market.
                            </div>
                          </div>
                        ) : (
                          <StakeGuild
                            debtCeiling={data?.debtCeiling}
                            lendingTerm={lendingTermData}
                            textButton="Stake"
                            guildUserGaugeWeight={data?.guildUserGaugeWeight}
                            guildBalance={data?.guildBalance}
                            smartContractAddress={termAddress}
                            guildUserWeight={data?.guildUserWeight}
                            creditMultiplier={data?.creditMultiplier}
                            reload={setReload}
                          />
                        )}
                      </Tab.Panel>
                      <Tab.Panel key="unstake-guild" className={'px-3 py-1'}>
                        <StakeGuild
                          debtCeiling={data?.debtCeiling}
                          lendingTerm={lendingTermData}
                          textButton="Unstake"
                          guildUserGaugeWeight={data?.guildUserGaugeWeight}
                          guildBalance={data?.guildBalance}
                          smartContractAddress={termAddress}
                          guildUserWeight={data?.guildUserWeight}
                          creditMultiplier={data?.creditMultiplier}
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
                    <div className="border-r border-gray-100 px-4 py-3 dark:border-navy-800">
                      <dt className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Your {creditTokenSymbol} staked
                      </dt>
                      <dd className="mt-1 flex items-baseline justify-between gap-6 md:block lg:flex">
                        <div className="flex items-baseline text-2xl font-semibold text-brand-500">
                          {data?.creditAllocated != undefined &&
                            toLocaleString(formatDecimal(Number(formatUnits(data?.creditAllocated, 18)), 2))}
                        </div>
                        <div className="inline-flex items-baseline rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800 md:mt-2 lg:mt-0">
                          {data?.creditAllocated != undefined &&
                            data?.creditBalance != undefined &&
                            getPercentageAllocation(data?.creditAllocated, data?.creditBalance)}
                          %
                        </div>
                      </dd>
                      <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-300">
                        /{' '}
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

                    <div className="border-r border-gray-100 px-4 py-3 dark:border-navy-800">
                      <dt className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Total {creditTokenSymbol} staked
                      </dt>
                      <dd className="mt-1 flex items-baseline justify-between gap-6 md:block lg:flex">
                        <div className="flex items-baseline text-2xl font-semibold text-brand-500">
                          {data?.termSurplusBuffer != undefined && formatDecimal(data?.termSurplusBuffer, 2)}
                        </div>
                      </dd>
                    </div>

                    <div className="mx-auto flex flex-col items-center justify-center px-4 text-center">
                      <TooltipHorizon
                        extra="z-10 !w-[450px] dark:text-white"
                        content={
                          <div className="space-y-2 p-2">
                            <p>
                              The{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={24}
                                height={24}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol} staked will act as first-loss capital if this term creates bad debt.
                              You will not recover any of your stake if this term creates bad debt while you stake.
                            </p>

                            <p>
                              For each{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={24}
                                height={24}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol} staked, <strong>{formatDecimal(data?.sgmMintRatio, 2)}</strong>{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={24}
                                height={24}
                                alt="logo"
                              />{' '}
                              GUILD will be minted & staked for this term (see Stake GUILD tooltip), which will increase
                              the debt ceiling (
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={18}
                                height={18}
                                alt="logo"
                              />{' '}
                              {pegToken?.symbol} borrow cap) in this term.
                            </p>

                            <p>
                              You will earn{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={24}
                                height={24}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol} from the regular{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={24}
                                height={24}
                                alt="logo"
                              />{' '}
                              GUILD stake rewards, plus an additional{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={24}
                                height={24}
                                alt="logo"
                              />{' '}
                              <strong>{formatDecimal(data?.sgmRewardRatio, 2)}</strong> GUILD per{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={24}
                                height={24}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol} earned as an indirect{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={24}
                                height={24}
                                alt="logo"
                              />{' '}
                              GUILD staker.
                            </p>
                          </div>
                        }
                        trigger={
                          <div className="flex items-center space-x-2 text-gray-700 dark:text-white">
                            <h4>
                              Risk{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={24}
                                height={24}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol}
                              <br />
                              Earn{' '}
                              <Image
                                className="inline-block"
                                src={pegTokenLogo}
                                width={24}
                                height={24}
                                alt="logo"
                                style={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
                              />{' '}
                              {creditTokenSymbol}
                              <br />+ Bonus{' '}
                              <Image
                                className="inline-block"
                                src="/img/crypto-logos/guild.png"
                                width={24}
                                height={24}
                                alt="logo"
                              />{' '}
                              GUILD
                              <br />
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
                        className={({ selected }) =>
                          clsx(
                            'w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base',
                            selected
                              ? 'bg-white font-semibold text-brand-500 dark:bg-navy-600/70'
                              : 'font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50'
                          )
                        }
                      >
                        Stake
                      </Tab>
                      <Tab
                        className={({ selected }) =>
                          clsx(
                            'w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base',
                            selected
                              ? 'bg-white font-semibold text-brand-500 dark:bg-navy-600/70'
                              : 'font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50'
                          )
                        }
                      >
                        Unstake
                      </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-2">
                      <Tab.Panel className={'px-3 py-1'}>
                        {market.deprecated ? (
                          <div className="mb-3 rounded-md bg-white p-5 text-center dark:bg-navy-800 dark:text-white">
                            <div className="text-xl font-semibold text-yellow-600">This market is deprecated</div>
                            <div className="text-m mt-3">
                              Consider repaying open borrows and redeeming your lent assets, as no new loans can be
                              opened and no new lenders can enter the market.
                            </div>
                          </div>
                        ) : (
                          <StakeCredit
                            debtCeiling={data?.debtCeiling}
                            lendingTerm={lendingTermData}
                            textButton="Stake"
                            creditAllocated={data?.creditAllocated}
                            creditBalance={data?.creditBalance}
                            termAddress={termAddress}
                            sgmMintRatio={data?.sgmMintRatio}
                            sgmRewardRatio={data?.sgmRewardRatio}
                            creditMultiplier={data?.creditMultiplier}
                            reload={setReload}
                          />
                        )}
                      </Tab.Panel>
                      <Tab.Panel className={'px-3 py-1'}>
                        <StakeCredit
                          debtCeiling={data?.debtCeiling}
                          lendingTerm={lendingTermData}
                          textButton="Unstake"
                          creditAllocated={data?.creditAllocated}
                          creditBalance={data?.creditBalance}
                          termAddress={termAddress}
                          sgmMintRatio={data?.sgmMintRatio}
                          sgmRewardRatio={data?.sgmRewardRatio}
                          creditMultiplier={data?.creditMultiplier}
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
      </div>
    );
  }
};

export default LendingDetails;
