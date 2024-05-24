'use client';

import { useAccount, useReadContracts } from 'wagmi';
import Disconnected from 'components/error/disconnected';
import React, { useEffect, useState } from 'react';
import Card from 'components/card';
import { TermABI, ProfitManagerABI, CreditABI, GuildABI, SurplusGuildMinterABI, ERC20PermitABI } from 'lib/contracts';
import { readContract } from '@wagmi/core';
import Myloans from './components/MyLoans';
import CreateLoan from './components/CreateLoan';
import ActiveLoans from './components/ActiveLoans';
import { loanObj, LendingTerms } from 'types/lending';
import { MdOutlineOpenInNew } from 'react-icons/md';
import { TooltipHorizon, QuestionMarkIcon } from 'components/tooltip';
import { getActiveLoanDetails } from 'lib/logs/loans';
import { useSearchParams } from 'next/navigation';
import LendingStats from './components/LendingStats';
import { useAppStore } from 'store';
import { Tab } from '@headlessui/react';
import clsx from 'clsx';
import { Abi, formatUnits, erc20Abi, Address } from 'viem';
import { eq, generateTermName } from 'utils/strings';
import { formatDecimal, formatCurrencyValue } from 'utils/numbers';
import { wagmiConfig } from 'contexts/Web3Provider';
import { lendingTermConfig, getPegTokenLogo, getExplorerBaseUrl } from 'config';
import { ToggleCredit } from 'components/switch/ToggleCredit';
import Image from 'next/image';
import { MdArrowBack } from 'react-icons/md';
import Link from 'next/link';

const LendingDetails = () => {
  const { address, isConnected } = useAccount();
  const { appMarketId, coinDetails, lendingTerms, contractsList, appChainId, fetchLendingTerms, airdropData } =
    useAppStore();
  const searchParams = useSearchParams();
  const termAddress = searchParams.get('term');
  const [lendingTermData, setLendingTermData] = useState<LendingTerms>();
  const [termTotalCollateral, setTermTotalCollateral] = useState(0);
  const [isLoadingEventLoans, setIsLoadingEventLoans] = useState<boolean>(true);
  const [reload, setReload] = useState<boolean>(true);
  const [eventLoans, setEventLoans] = useState<loanObj[]>([]);
  const [editingFdv, setEditingFdv] = useState(false);
  const [fdv, setFdv] = useState(20_000_000);

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

  const creditTokenSymbol = 'g' + pegToken?.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);

  // airdrop computations
  const fdvSupply = 1e9; // 1B GUILD max supply
  const airdropPercent = 0.01; // 1% supply
  const airdropSize = airdropPercent * fdvSupply;
  const dailyGuild = airdropSize / 28; // days per periods
  const dailyGuildToBorrowers = dailyGuild * 0.1; // 10% to lenders
  const currentDailyGuildPerDollar = dailyGuildToBorrowers / airdropData.totalIssuanceUsd;
  const borrowerApr = (365 * currentDailyGuildPerDollar * fdv) / 1e9;

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
      },
      {
        address: termAddress as Address,
        abi: TermABI,
        functionName: 'getParameters',
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
          termSurplusBuffer: Number(formatUnits(data[18].result as bigint, 18)),
          hardCap: Number(formatUnits(data[19].result?.hardCap as bigint, 18))
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
        <div className="py-10 text-center text-gray-400" style={{ fontSize: '1.3em' }}>
          This Lending Term is not part of the selected market.
          <br />
          <br />
          <Link href="/borrow">
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
        <div className="mt-3 grid gap-5 xs:grid-cols-1 lg:grid-cols-6 2xl:grid-cols-6 3xl:grid-cols-6">
          <LendingStats
            creditMultiplier={data?.creditMultiplier}
            lendingTermData={lendingTermData}
            currentDebt={data?.currentDebt}
            debtCeiling={Math.min(data?.debtCeiling, data?.hardCap)}
            termTotalCollateral={termTotalCollateral}
          />
          <Card
            title="Current daily GUILD rewards"
            extra="order-2 w-full h-full sm:overflow-auto px-6 py-4 lg:col-span-2 2xl:col-span-2 3xl:col-span-2 xs:col-span-1"
          >
            <div className="text-center">
              {fdv ? (
                <div className="mt-3 text-xl">
                  <Image
                    className="mr-1 inline-block align-text-top"
                    src="/img/crypto-logos/guild.png"
                    width={28}
                    height={28}
                    alt="logo"
                  />
                  <span className="font-bold">{formatDecimal(borrowerApr * 100, 0)}%</span> *
                  <div className="mt-1 text-xs font-normal opacity-50">
                    * Assuming ${formatCurrencyValue(fdv)} FDV, GUILD is not transferable yet
                  </div>
                </div>
              ) : (
                <div className="mt-5 text-2xl font-bold">
                  <Image
                    className="mr-1 inline-block align-text-top"
                    src="/img/crypto-logos/guild.png"
                    width={28}
                    height={28}
                    alt="logo"
                  />
                  {formatDecimal(currentDailyGuildPerDollar * 1000, 0)} GUILD / 1k$
                </div>
              )}

              {editingFdv ? (
                <div className="mt-1 cursor-pointer text-xs">
                  $
                  <input
                    className="border-gray-300 bg-brand-100/0 px-2 py-1 text-gray-800 focus:border-brand-400/80 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50"
                    type="text"
                    style={{ width: '100px' }}
                    value={fdv}
                    onChange={(e) => {
                      if (/^[0-9]+\.?[0-9]*$/i.test(e.target.value)) {
                        let num = Number(e.target.value);
                        if (!isNaN(num)) {
                          setFdv(Number(e.target.value));
                        }
                      }
                    }}
                  />
                  <span
                    className="mr-2 cursor-pointer rounded-sm bg-brand-500 px-1 py-1 text-xs font-semibold text-white no-underline hover:bg-brand-400 dark:bg-brand-800 dark:hover:bg-brand-700"
                    onClick={async () => {
                      setEditingFdv(false);
                    }}
                  >
                    Set
                  </span>
                  <span
                    className="mr-2 cursor-pointer rounded-sm bg-gray-500 px-1 py-1 text-xs font-semibold text-white no-underline hover:bg-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
                    onClick={async () => {
                      setFdv(0);
                      setEditingFdv(false);
                    }}
                  >
                    Clear
                  </span>
                </div>
              ) : (
                <div
                  className="text-bold mt-1 cursor-pointer text-xs underline"
                  onClick={() => {
                    setEditingFdv(true);
                  }}
                >
                  Set {fdv ? 'another' : ''} FDV to {fdv ? 'update' : 'display'} APY
                </div>
              )}
              <TooltipHorizon
                extra="dark:text-gray-200"
                content={
                  <>
                    <p className="mb-3 text-xs opacity-70">
                      When borrowing, you pay interest but will be earning GUILD tokens as a reward for
                      <br />
                      helping to bootstrap the protocol. GUILD rewards are computed per epoch, visit the
                      <br />
                      airdrop page for more information.
                    </p>
                    <p>
                      GUILD airdrop : <span className="font-semibold">10M</span>
                    </p>
                    <p>
                      Period duration : <span className="font-semibold">30 days</span>
                    </p>
                    <p>
                      GUILD to borrowers : <span className="font-semibold">10%</span>
                    </p>
                    <p>
                      Daily GUILD to borrowers :{' '}
                      <span className="font-semibold">{formatCurrencyValue(dailyGuildToBorrowers)}</span>
                    </p>
                    <p>
                      Total borrowed (across all markets) :{' '}
                      <span className="font-semibold">{formatCurrencyValue(airdropData.totalIssuanceUsd)}</span> $
                    </p>
                    <p>
                      Current daily GUILD per $ borrowed :{' '}
                      <span className="font-semibold">{formatDecimal(currentDailyGuildPerDollar, 2)}</span>
                    </p>
                    <p className="mt-3 italic">
                      All values are estimates and the final result depends on the behavior
                      <br />
                      of other protocol users.
                    </p>
                  </>
                }
                trigger={
                  <div className="mt-3 cursor-help text-center text-xs italic opacity-50">
                    Hover to view airdrop details
                  </div>
                }
                placement="left"
              />
            </div>
          </Card>
        </div>
        <h3 className="mb-4 ml-8 mt-5 text-xl font-semibold text-gray-700 dark:text-white">Loan</h3>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3 ">
          <Card extra="order-1 w-full h-full sm:overflow-auto px-6 py-4" title="New Loan">
            <CreateLoan
              lendingTerm={lendingTermData}
              availableDebt={
                Math.min(data?.debtCeiling, data?.hardCap) - data?.currentDebt > 0
                  ? Math.min(data?.debtCeiling, data?.hardCap) - data?.currentDebt
                  : 0
              }
              creditMultiplier={data?.creditMultiplier}
              creditBalance={data?.creditBalance}
              pegTokenBalance={data?.pegTokenBalance}
              creditTokenNonces={data?.creditTokenNonces}
              minBorrow={Number(formatUnits(data?.minBorrow, 18))}
              setReload={setReload}
              reload={reload}
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
              setReload={setReload}
              reload={reload}
              creditMultiplier={data?.creditMultiplier}
              pegTokenBalance={data?.pegTokenBalance}
              creditBalance={data?.creditBalance}
              pegTokenNonces={data?.pegTokenNonces}
              minBorrow={data?.minBorrow}
            />
          </Card>
        </div>
        <div className="mb-20">
          <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">Overview</h3>
          <Card
            extra="order-5 md:col-span-2 w-full h-full px-6 py-4 overflow-auto sm:overflow-x-auto"
            title="Active Loans"
          >
            <ActiveLoans
              lendingTerm={lendingTermData}
              activeLoans={eventLoans}
              isLoadingEventLoans={isLoadingEventLoans}
              creditMultiplier={data?.creditMultiplier}
              reload={setReload}
            />
          </Card>
        </div>
      </div>
    );
  }
};

export default LendingDetails;
