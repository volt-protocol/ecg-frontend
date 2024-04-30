'use client';
import Image from 'next/image';
import { readContract, multicall } from '@wagmi/core';
import { useAppStore } from 'store';
import { Abi, Address, formatUnits, erc20Abi } from 'viem';
import { getApiBaseUrl, getPegTokenLogo } from 'config';
import { ProfitManagerABI } from 'lib/contracts';
import { useEffect, useState } from 'react';
import Card from 'components/card';
import { CollateralTypes } from './components/CollateralTypes';
import { DebtCeiling } from './components/DebtCeiling';
import { FirstLossCapital } from './components/FirstLossCapital';
import { AverageInterestRate } from './components/AverageInterestRate';
import { CreditTotalSupply } from './components/CreditTotalSupply';
import Spinner from 'components/spinner';
import { formatDecimal } from 'utils/numbers';
import { wagmiConfig } from 'contexts/Web3Provider';
import { generateTermName } from 'utils/strings';
import { GlobalStatCarts } from './components/GlobalStatCarts';
import { TVLChart } from './components/TVLChart';
import { HttpGet } from 'utils/HttpHelper';
import { LastActivityApiResponse } from 'types/activities';

const GlobalDashboard = () => {
  const {
    appMarketId,
    appChainId,
    lendingTerms,
    coinDetails,
    historicalData,
    contractsList,
    creditMultiplier,
    creditSupply,
    totalWeight,
    auctions,
    loans,
    psmPegTokenBalance
  } = useAppStore();
  const [totalActiveLoans, setTotalActiveLoans] = useState<number>();
  const [debtCeilingData, setDebtCeilingData] = useState([]);
  const [collateralData, setCollateralData] = useState([]);
  const [liquidityData, setLiquidityData] = useState(0);
  const [firstLossData, setFirstLossData] = useState([]);
  // const [lastActivities, setLastActivites] = useState<LastActivity[]>([]);
  const [allTimePnl, setAllTimePnl] = useState<number>(0);

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10((pegToken ? pegToken.price : 0) * 100)), 0);

  const data = {
    totalWeight: Number(formatUnits(totalWeight, 18)),
    creditMultiplier: Number(formatUnits(creditMultiplier, 18)),
    creditTotalSupply: Number(formatUnits(creditSupply, 18))
  };

  useEffect(() => {
    const asyncFunc = async () => {
      const total = await getTotalActiveLoans();
      setTotalActiveLoans(total);
      const ceilingData = (await getDebtCeilingData()).filter(function (e) {
        return e.debtCeiling != 0; // remove empty debt ceiling terms from the chart
      });
      setDebtCeilingData(ceilingData);
      const collateralData = await getCollateralData();
      setCollateralData(collateralData);
      const liquidityData = psmPegTokenBalance;
      setLiquidityData(Number(formatUnits(liquidityData, pegToken.decimals)) * pegToken.price);
      const firstLossData = await getFirstLossCapital();
      setFirstLossData(firstLossData);
      // const lastActivities = await getLastActivities();
      // setLastActivites(lastActivities);
      const allTimePnl = await getAllTimePnl();
      setAllTimePnl(allTimePnl);
    };

    lendingTerms.length && asyncFunc();
  }, [lendingTerms]);

  if (!contractsList?.marketContracts[appMarketId]) {
    return (
      <div className="absolute bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 transform">
        <Spinner />
      </div>
    );
  }

  // round historicalData for presentation
  historicalData.creditSupply.values = historicalData.creditSupply.values.map(function (x, i) {
    return formatDecimal(Number(x), pegTokenDecimalsToDisplay);
  });
  historicalData.creditTotalIssuance.values = historicalData.creditTotalIssuance.values.map(function (x) {
    return formatDecimal(Number(x), pegTokenDecimalsToDisplay);
  });

  /**** Get Dashboard data ****/
  const getTotalActiveLoans = async () => {
    let activeLoans = 0;
    for (const t of lendingTerms) {
      activeLoans += t.activeLoans;
    }

    return activeLoans;
  };

  const getCollateralData = async () => {
    const collateralData: { collateral: string; collateralValueDollar: number }[] = [];

    // fetch only live terms
    const liveTerms = lendingTerms.filter((term) => term.status == 'live');
    const contractCalls = [];
    for (const term of liveTerms) {
      contractCalls.push({
        address: term.collateral.address as Address,
        abi: erc20Abi as Abi,
        functionName: 'balanceOf',
        args: [term.address],
        chainId: appChainId as any
      });
    }

    // @ts-ignore
    const balanceOfResponses = await multicall(wagmiConfig, {
      chainId: appChainId as any,
      contracts: contractCalls
    });

    let cursor = 0;
    for (const term of liveTerms) {
      const result = balanceOfResponses[cursor++].result;
      const exchangeRate = coinDetails.find((_) => _.address == term.collateral.address).price;

      collateralData.push({
        collateral: generateTermName(
          term.collateral.symbol,
          term.interestRate,
          term.borrowRatio / data?.creditMultiplier
        ),
        collateralValueDollar: Number(formatUnits(result as bigint, term.collateral.decimals)) * exchangeRate
      });
    }

    return collateralData;
  };

  const getDebtCeilingData = async () => {
    const debtCeilingData: { collateral: string; currentDebt: number; debtCeiling: number }[] = [];
    for (const term of lendingTerms.filter((_) => _.status == 'live')) {
      debtCeilingData.push({
        collateral: generateTermName(
          term.collateral.symbol,
          term.interestRate,
          term.borrowRatio / data?.creditMultiplier
        ),
        currentDebt: term.currentDebt * data?.creditMultiplier,
        debtCeiling: term.debtCeiling * data?.creditMultiplier
      });
    }

    return debtCeilingData;
  };

  const getFirstLossCapital = async () => {
    const globalSurplusBuffer = await readContract(wagmiConfig, {
      address: contractsList.marketContracts[appMarketId].profitManagerAddress,
      abi: ProfitManagerABI as Abi,
      functionName: 'surplusBuffer',
      chainId: appChainId as any
    });

    const termsArray: { term: string; value: number }[] = [];
    for (const t of lendingTerms.filter((_) => _.status == 'live')) {
      termsArray.push({
        term: t.collateral.symbol,
        value: t.termSurplusBuffer
      });
    }

    termsArray.push({
      term: 'Global',
      value: Number(formatDecimal(Number(formatUnits(globalSurplusBuffer as bigint, 18)), 2))
    });

    return termsArray;
  };

  const getLastActivities = async () => {
    if (!appChainId || !appMarketId) {
      return [];
    }
    const apiUrl = getApiBaseUrl(appChainId) + `/markets/${appMarketId}/activity`;
    const activities = await HttpGet<LastActivityApiResponse>(apiUrl);

    return activities.activities;
  };

  const getAllTimePnl = async () => {
    let totalBorrowedPegToken = 0;
    let totalRepaidPegToken = 0;
    for (const loan of loans.filter((_) => _.closeTime != 0)) {
      const normBorrowed = loan.borrowAmount;
      const normCreditMultiplier = loan.borrowCreditMultiplier;
      totalBorrowedPegToken += normBorrowed * normCreditMultiplier;
      totalRepaidPegToken += loan.debtRepaid * normCreditMultiplier;
    }

    const pnl = (totalRepaidPegToken - totalBorrowedPegToken) * pegToken.price;
    return pnl;
  };

  /***** End get dashboard data *****/

  return (
    <div>
      {/* Card widget */}
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-6">
        <GlobalStatCarts
          lendingTerms={lendingTerms}
          data={data}
          collateralData={collateralData}
          totalActiveLoans={totalActiveLoans}
          allTimePnL={allTimePnl}
          pegToken={pegToken}
          liquidityData={liquidityData}
        />
      </div>

      {/* Charts */}
      <div className="my-3 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card
          title="Collateral Types"
          extra="w-full min-h-[300px] md:col-span-1 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
        >
          {debtCeilingData.length == 0 ? (
            <div className="flex h-96 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <CollateralTypes
              data={collateralData.map((item) => Number(item.collateralValueDollar.toFixed(2)))}
              labels={collateralData.map((item) => item.collateral)}
            />
          )}
        </Card>
        {!historicalData ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <TVLChart tvl={historicalData.tvl} />
        )}
        {/* <Card
          title="Loan Success Rate"
          extra="w-full min-h-[300px] md:col-span-2 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4 opacity-40"
        >
          <LoanSuccessRate />
        </Card> */}
      </div>

      <div className="my-3 grid grid-cols-1 gap-5 md:grid-cols-3">
        {!historicalData ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <CreditTotalSupply
            creditTotalIssuance={historicalData.creditTotalIssuance}
            creditSupply={historicalData.creditSupply}
          />
        )}
        <Card
          title="Debt Ceiling"
          extra="w-full min-h-[300px] md:col-span-1 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
        >
          {debtCeilingData.length == 0 ? (
            <div className="flex h-96 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <DebtCeiling
              pegTokenSymbol={pegToken.symbol}
              data={debtCeilingData}
              labels={debtCeilingData.map((item) => item.collateral)}
            />
          )}
        </Card>
      </div>

      <div className="my-3 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card
          title={`First-loss Capital (${pegToken.symbol})`}
          extra="w-full min-h-[300px] md:col-span-1 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
        >
          <dl className="mt-3 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow dark:divide-navy-600 dark:bg-navy-700 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div key="guildVotingPower" className="px-2 py-4 sm:p-5">
              <dt className="text-sm font-normal text-gray-500 dark:text-gray-300 xl:text-base">Global</dt>
              <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-center gap-2 overflow-hidden text-lg font-semibold text-gray-700 dark:text-gray-200 xl:text-2xl">
                  <Image src={pegTokenLogo} width={32} height={32} alt={''} />
                  {firstLossData && firstLossData.length != 0 ? (
                    formatDecimal(
                      firstLossData[firstLossData.length - 1].value * data?.creditMultiplier,
                      pegTokenDecimalsToDisplay
                    )
                  ) : (
                    <div className="h-5 w-28 animate-pulse rounded-md bg-gray-200" />
                  )}
                </div>
              </dd>
            </div>
            <div key="creditVotingPower" className="px-2 py-4 sm:p-5">
              <dt className="text-sm font-normal text-gray-500 dark:text-gray-300 xl:text-base">Term Specific</dt>
              <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-center gap-2 overflow-hidden text-lg font-semibold text-gray-700 dark:text-gray-200 xl:text-2xl">
                  <Image src={pegTokenLogo} width={32} height={32} alt={''} />
                  {firstLossData && firstLossData.length != 0 ? (
                    formatDecimal(
                      firstLossData.filter((item) => item.term != 'Global').reduce((a, b) => a + b.value, 0) *
                        data?.creditMultiplier,
                      pegTokenDecimalsToDisplay
                    )
                  ) : (
                    <div className="h-5 w-28 animate-pulse rounded-md bg-gray-200" />
                  )}
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
              symbol={pegToken.symbol}
              data={firstLossData.map((item) => Number(item.value.toFixed(2)))}
              labels={firstLossData.map((item) => item.term)}
            />
          )}
        </Card>
        {!historicalData ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <AverageInterestRate averageInterestRate={historicalData.averageInterestRate} />
        )}
      </div>

      {/* <div className="mb-10 mt-3 flex">
        <Card title="Last Week Activities" extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
          {lastActivities.length == 0 ? (
            <div className="flex h-96 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <LastProtocolActivity data={lastActivities} currentBlock={currentBlock} />
          )}
        </Card>
      </div> */}
    </div>
  );
};

export default GlobalDashboard;
