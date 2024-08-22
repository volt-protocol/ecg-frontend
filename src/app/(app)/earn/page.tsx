'use client';

import Disconnected from 'components/error/disconnected';
import React, { useEffect, useState } from 'react';
import Card from 'components/card';
import { useAccount, useReadContracts } from 'wagmi';
import { ProfitManagerABI, CreditABI, WethABI, ERC20PermitABI } from 'lib/contracts';
import { waitForTransactionReceipt, writeContract, getBalance } from '@wagmi/core';
import { formatCurrencyValue, formatDecimal } from 'utils/numbers';
import { toastError } from 'components/toast';
import MintOrRedeem from './components/MintOrRedeem';
import { Step } from 'components/stepLoader/stepType';
import StepModal from 'components/stepLoader';
import clsx from 'clsx';
import { Switch } from '@headlessui/react';
import { formatUnits, Address, erc20Abi, parseUnits } from 'viem';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore, useUserPrefsStore } from 'store';
import Spinner from 'components/spinner';
import { getPegTokenLogo, marketsConfig } from 'config';
import Image from 'next/image';
import ImageWithFallback from 'components/image/ImageWithFallback';
import { TooltipHorizon, QuestionMarkIcon } from 'components/tooltip';
import { BsClock, BsPerson, BsSafe2, BsPercent, BsFire } from 'react-icons/bs';
import Widget from 'components/widget/Widget';
import { ApexChartWrapper } from 'components/charts/ApexChartWrapper';
import DefiInputBox from 'components/box/DefiInputBox';
import { getCreditTokenSymbol } from 'utils/strings';

function MintAndSaving() {
  const { contractsList, coinDetails, historicalData, airdropData, creditHolderCount, profitSharingConfig } =
    useAppStore();
  const { appMarketId, appChainId } = useUserPrefsStore();
  const { address, isConnected } = useAccount();
  const [reload, setReload] = React.useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFdv, setEditingFdv] = useState(false);
  const [fdv, setFdv] = useState(20_000_000);
  const [apr, setApr] = useState(0);
  const [aprFuture, setAprFuture] = useState(0);
  const [wrapValue, setWrapValue] = useState<string>('');
  const [unwrapValue, setUnwrapValue] = useState<string>('');
  const [userBalance, setUserBalance] = useState<bigint>(BigInt(0));
  const [chartData, setChartData] = useState<any>([]);

  const createSteps = (): Step[] => {
    const baseSteps = [{ name: 'Rebasing', status: 'Not Started' }];
    return baseSteps;
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());

  const profitManagerAddress = contractsList?.marketContracts[appMarketId]?.profitManagerAddress;
  const creditAddress = contractsList?.marketContracts[appMarketId]?.creditAddress;
  const pegTokenAddress = contractsList?.marketContracts[appMarketId]?.pegTokenAddress;
  const psmAddress = contractsList?.marketContracts[appMarketId]?.psmAddress;

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10((pegToken ? pegToken.price : 0) * 100)), 0);
  const creditTokenSymbol = getCreditTokenSymbol(coinDetails, appMarketId, contractsList);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);

  // airdrop matching incentives
  let additionalGuildPerDay = 0;
  if (pegToken.symbol == 'OD' && Date.now() < new Date('2024-08-09').getTime()) {
    additionalGuildPerDay += 55750 / 28;
  }

  // airdrop computations
  const fdvSupply = 1e9; // 1B GUILD max supply
  const airdropPercent = 0.01; // 1% supply
  const airdropSize = airdropPercent * fdvSupply;
  const dailyGuild = airdropSize / 28; // days in period
  const totalMarketWeights = Object.keys(airdropData.marketUtilization).reduce((acc, cur) => {
    acc += airdropData.marketDebt[cur];
    return acc;
  }, 0);
  const marketWeight = airdropData.marketDebt[appMarketId];
  const dailyGuildToLenders = dailyGuild * 0.75; // 75% to lenders
  const dailyGuildToMarketLenders = dailyGuildToLenders * (marketWeight / totalMarketWeights);
  // minimum reward rate = market's share of total lending deposits / 10 * total lender rewards
  const totalMarketsTVL = Object.keys(airdropData.marketTVL).reduce((acc, cur) => {
    acc += airdropData.marketTVL[cur];
    return acc;
  }, 0);
  const marketTVL = airdropData.marketTVL[appMarketId];
  const minDailyGuildToMarketLenders = (marketTVL / totalMarketsTVL / 10) * dailyGuildToLenders;
  const marketCreditSupply = Number(historicalData.aprData.values.rebasingSupply.slice(-1)[0]);
  const marketCreditSupplyValue =
    marketCreditSupply * pegToken?.price * Number(historicalData.creditMultiplier.values.slice(-1)[0]);
  const currentDailyGuildPerDollarLent =
    (Math.max(dailyGuildToMarketLenders, minDailyGuildToMarketLenders) + additionalGuildPerDay) /
    marketCreditSupplyValue;
  const lenderApr = (365 * currentDailyGuildPerDollarLent * fdv) / 1e9;

  const additionalRewards = {
    enabled: false,
    token: null,
    dailyAmount: 0
  };
  // ODG rewards in OD market (cycle 3 & 4)
  if (
    pegToken.symbol == 'OD' &&
    Date.now() > new Date('2024-06-14').getTime() &&
    Date.now() < new Date('2024-08-09').getTime()
  ) {
    additionalRewards.enabled = true;
    additionalRewards.token = coinDetails.find(
      (item) => item.address.toLowerCase() == '0x000d636bd52bfc1b3a699165ef5aa340bea8939c' // ODG
    );
    additionalRewards.dailyAmount = 1500 / (8 * 7);
    console.log('OD market earns additional ODG rewards', additionalRewards);
  }
  // DOLA rewards in DOLA market (cycle 4)
  else if (
    pegToken.symbol == 'DOLA' &&
    Date.now() > new Date('2024-07-12').getTime() &&
    Date.now() < new Date('2024-08-09').getTime()
  ) {
    additionalRewards.enabled = true;
    additionalRewards.token = coinDetails.find(
      (item) => item.address.toLowerCase() == '0x6a7661795c374c0bfc635934efaddff3a7ee23b6' // DOLA
    );
    additionalRewards.dailyAmount = 3750 / (4 * 7);
    console.log('DOLA market earns additional DOLA rewards', additionalRewards);
  }
  // ARB rewards in eUSD market (off-cycle, August)
  else if (
    pegToken.symbol == 'eUSD' &&
    Date.now() > new Date('2024-08-01').getTime() &&
    Date.now() < new Date('2024-08-31').getTime()
  ) {
    additionalRewards.enabled = true;
    additionalRewards.token = coinDetails.find(
      (item) => item.address.toLowerCase() == '0x912ce59144191c1204e64559fe8253a0e49e6548' // ARB
    );
    additionalRewards.dailyAmount = 5081 / 31;
    console.log('eUSD market earns additional ARB rewards', additionalRewards);
  }

  /* Smart contract reads */
  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: pegTokenAddress,
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
        address: profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: 'creditMultiplier',
        chainId: appChainId
      },
      {
        address: pegTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [psmAddress],
        chainId: appChainId
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'isRebasing',
        args: [address as Address],
        chainId: appChainId
      },
      {
        address: creditAddress,
        abi: ERC20PermitABI,
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
        address: creditAddress,
        abi: ERC20PermitABI,
        functionName: 'name',
        chainId: appChainId
      },
      {
        address: pegToken?.address,
        abi: ERC20PermitABI,
        functionName: 'name',
        chainId: appChainId
      }
    ],
    query: {
      select: (data) => {
        return {
          pegTokenBalance: (data[0].result as bigint) || BigInt(0),
          creditTokenBalance: (data[1].result as bigint) || BigInt(0),
          creditMultiplier: (data[2].result as bigint) || BigInt(1e18),
          pegTokenPSMBalance: (data[3].result as bigint) || BigInt(0),
          isRebasing: (data[4].result as boolean) || false,
          creditTokenNonces: (data[5].result as bigint) || BigInt(0),
          pegTokenNonces: (data[6].result as bigint) || BigInt(0),
          creditTokenName: (data[7].result as string) || '',
          pegTokenName: (data[8].result as string) || ''
        };
      }
    }
  });

  useEffect(() => {
    if (!historicalData) return;

    const interpolatingRebaseRewards: number[] = [];
    const unpaidInterestPerUnit: number[] = [];
    historicalData.aprData.timestamps.forEach((t, i, arr) => {
      // compute unpaid interest per unit of credit token
      const unpaidInterest =
        historicalData.loanBorrow.values.totalUnpaidInterests[i] /
        (historicalData.aprData.values.rebasingSupply[i] * historicalData.creditMultiplier.values[i]);
      unpaidInterestPerUnit.push(
        isNaN(unpaidInterest) ? 0 : Number(formatDecimal(unpaidInterest, pegTokenDecimalsToDisplay * 2))
      );

      // compute interpolating rebase rewards
      const nInterpolatingRewards =
        historicalData.aprData.values.targetTotalSupply[i] - historicalData.aprData.values.totalSupply[i];
      const interpolatingRewardsPerCredit = nInterpolatingRewards / historicalData.aprData.values.rebasingSupply[i];
      interpolatingRebaseRewards.push(
        Number(formatDecimal(interpolatingRewardsPerCredit, pegTokenDecimalsToDisplay * 2))
      );
    });

    const sharePrice = historicalData.aprData.values.sharePrice.slice(-1)[0];
    const deltaGreen =
      historicalData.aprData.values.sharePrice.slice(-2)[1] - historicalData.aprData.values.sharePrice.slice(-2)[0];
    /*const gray =
      historicalData.loanBorrow.values.totalUnpaidInterests.slice(-1)[0] /
      historicalData.aprData.values.rebasingSupply.slice(-1)[0];
    const yellow =
      (historicalData.aprData.values.targetTotalSupply.slice(-1)[0] -
        historicalData.aprData.values.totalSupply.slice(-1)[0]) /
      historicalData.aprData.values.rebasingSupply.slice(-1)[0];*/
    const apr = (deltaGreen * 365 * 24) / sharePrice;

    const marketLent = Number(historicalData.creditSupply.values.slice(-1)[0]);
    const marketSaving = Number(historicalData.aprData.values.rebasingSupply.slice(-1)[0]);
    const multiplier = marketLent / marketSaving;
    const averageInterestPaidByBorrowers = Number(historicalData.averageInterestRate.values.slice(-1)[0]) / 100;
    const totalBorrowUsd = airdropData.marketDebt[appMarketId];
    const totalLendingsUsd = historicalData.aprData.values.rebasingSupply.at(-1) * pegToken.price;
    const futureApr =
      (((averageInterestPaidByBorrowers * Number(profitSharingConfig[1])) / 1e18) * multiplier * totalBorrowUsd) /
      totalLendingsUsd;

    let _apr = 100 * apr;
    if (isNaN(_apr)) _apr = 0;
    setApr(_apr);
    let _aprFuture = 100 * futureApr;
    if (isNaN(_aprFuture)) _aprFuture = 0;
    setAprFuture(_aprFuture);

    const seriesData = [
      {
        name: 'Principal losses',
        data: historicalData.creditMultiplier.values.map((e, i) =>
          Number(formatDecimal(e - 1, pegTokenDecimalsToDisplay * 2))
        ),
        color: '#212121'
      },
      {
        name: 'Distributed',
        data: historicalData.aprData.values.sharePrice.map((e) =>
          Number(formatDecimal(e - 1, pegTokenDecimalsToDisplay * 2))
        ),
        color: '#689F38'
      },
      {
        name: 'Interest paid interpolating over 30d',
        data: interpolatingRebaseRewards,
        color: '#FFC107'
      },
      {
        name: 'Pending Interest on open loans',
        data: unpaidInterestPerUnit,
        color: '#757575'
      }
    ];

    const state = {
      series: seriesData,
      options: {
        chart: {
          id: 'creditGrowthChart',
          stacked: true,
          toolbar: {
            show: false
          },
          height: 350,
          type: 'area',
          zoom: {
            autoScaleYaxis: true
          }
        },
        legend: {
          show: true,
          floating: false,
          fontSize: '14px',
          fontFamily: 'Inter',
          fontWeight: 400,
          offsetY: 3
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'straight',
          width: 0
        },
        xaxis: {
          type: 'datetime',
          tickAmount: 6,
          labels: {
            datetimeFormatter: {
              year: 'yyyy',
              month: "MMM 'yy",
              day: 'dd MMM',
              hour: 'HH:mm'
            }
          },
          min: new Date(historicalData.aprData.timestamps[0] * 1000).getTime(),
          categories: historicalData.aprData.timestamps.map((e) => e * 1000)
        },
        fill: {
          colors: seriesData.map((e) => e.color),
          type: 'solid',
          opacity: 1
        }
      }
    };

    setChartData(state);
  }, [historicalData]);

  useEffect(() => {
    if (!isConnected) return;
    getBalance(wagmiConfig, {
      address,
      chainId: appChainId as any
    }).then(function (balance) {
      setUserBalance(balance.value);
    });
  }, [reload]);

  useEffect(() => {
    if (reload) {
      refetch();
      setReload(false);
    }
  }, [reload]);

  const handleWrapInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Verify input is a number
    if (/^[0-9]+\.?[0-9]*$/i.test(inputValue)) {
      setWrapValue(inputValue as string);
    }
  };

  const handleUnwrapInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Verify input is a number
    if (/^[0-9]+\.?[0-9]*$/i.test(inputValue)) {
      setUnwrapValue(inputValue as string);
    }
  };

  async function wrap(): Promise<void> {
    if (!isConnected) {
      toastError('Please connect your wallet');
      return;
    }
    setSteps([{ name: 'Wrap', status: 'Not Started' }]);
    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Wrap', 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: pegTokenAddress,
        abi: WethABI,
        functionName: 'deposit',
        value: parseUnits(wrapValue, 18),
        chainId: appChainId as any
      });

      const check = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });
      if (check.status != 'success') {
        updateStepStatus('Wrap', 'Error');
        return;
      }
      updateStepStatus('Wrap', 'Success');
      setReload(true);
    } catch (error) {
      updateStepStatus('Wrap', 'Error');
      console.log(error);
    }
  }

  async function unwrap(): Promise<void> {
    if (!isConnected) {
      toastError('Please connect your wallet');
      return;
    }
    setSteps([{ name: 'Unwrap', status: 'Not Started' }]);
    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Unwrap', 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: pegTokenAddress,
        abi: WethABI,
        functionName: 'withdraw',
        args: [parseUnits(unwrapValue, 18)],
        chainId: appChainId as any
      });

      const check = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });
      if (check.status != 'success') {
        updateStepStatus('Unwrap', 'Error');
        return;
      }
      updateStepStatus('Unwrap', 'Success');
      setReload(true);
    } catch (error) {
      updateStepStatus('Unwrap', 'Error');
      console.log(error);
    }
  }

  async function saving(rebaseMode: string): Promise<void> {
    setSteps(createSteps());
    if (!isConnected) {
      toastError('Please connect your wallet');
      return;
    }
    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Rebasing', 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList?.marketContracts[appMarketId].creditAddress,
        abi: CreditABI,
        functionName: rebaseMode,
        chainId: appChainId as any
      });

      const checkStartSaving = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });
      if (checkStartSaving.status != 'success') {
        updateStepStatus('Rebasing', 'Error');
        return;
      }
      updateStepStatus('Rebasing', 'Success');
      setReload(true);
    } catch (error) {
      updateStepStatus('Rebasing', 'Error');
      console.log(error);
    }
  }

  /*if (!isConnected) {
    return <Disconnected />;
  }*/

  if (isLoading) return <Spinner />;

  if (data) {
    return (
      <div>
        {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}

        <div className="mt-3 grid gap-5 xs:grid-cols-1 lg:grid-cols-6 2xl:grid-cols-6 3xl:grid-cols-6">
          <Card
            title=""
            extra="order-1 w-full h-full sm:overflow-auto px-3 py-3 lg:col-span-2 2xl:col-span-2 3xl:col-span-2 xs:col-span-1 text-center"
          >
            <h3 className="text-left leading-5">
              <span className="mr-2 inline-block rounded-full bg-lightPrimary p-3 align-middle text-brand-500 dark:bg-navy-700">
                <BsFire className="h-5 w-5" />
              </span>
              <span className="text-md">Lending APR</span>
            </h3>
            <TooltipHorizon
              extra="dark:text-gray-200"
              content={
                <>
                  <p>APR currently being distributed through the rebasing mechanism (savings rate).</p>
                  <p>This corresponds to the green area on the chart.</p>
                  <p>It is currently distributed in real-time, you will earn this rate if you lend.</p>
                </>
              }
              trigger={
                <div className={!fdv ? 'mt-2' : ''}>
                  <span className="mr-1 font-bold">Current APR :</span>
                  <span>
                    <Image
                      className="inline-block align-bottom"
                      title={pegToken?.symbol}
                      src={pegTokenLogo}
                      width={24}
                      height={24}
                      alt="logo"
                    />{' '}
                    {formatDecimal(apr, 2) + '%'}
                  </span>
                  <span>
                    {' '}
                    +{' '}
                    <Image
                      className="inline-block align-bottom"
                      src="/img/crypto-logos/guild.png"
                      title="GUILD"
                      width={24}
                      height={24}
                      alt="logo"
                    />{' '}
                    {fdv
                      ? formatDecimal(lenderApr * 100, 2) + '% *'
                      : formatDecimal(currentDailyGuildPerDollarLent * 1000, 0) + ' / 1k$ daily'}
                  </span>
                  {additionalRewards.enabled ? (
                    <span>
                      {' '}
                      +{' '}
                      <ImageWithFallback
                        className="inline-block align-bottom"
                        src={'/img/crypto-logos/' + additionalRewards.token.symbol.toLowerCase() + '.png'}
                        fallbackSrc="/img/crypto-logos/unk.png"
                        width={24}
                        height={24}
                        alt={'logo'}
                      />{' '}
                      {formatDecimal(
                        ((100 * 365 * additionalRewards.dailyAmount * additionalRewards.token.price) /
                          Number(historicalData.creditSupply.values.slice(-1)[0])) *
                          pegToken.price,
                        0
                      ) +
                        '% ' +
                        additionalRewards.token.symbol}
                    </span>
                  ) : null}
                </div>
              }
              placement="bottom"
            />
            <TooltipHorizon
              extra="dark:text-gray-200"
              content={
                <>
                  <p>Estimated future APR, based on current average interest paid by borrowers and current lenders.</p>
                  <p className="mt-2">
                    Average rate paid by borrowers :{' '}
                    <strong>{formatDecimal(Number(historicalData.averageInterestRate.values.slice(-1)[0]), 2)}</strong>%
                  </p>
                  <p>
                    Percent of interest going to lenders :{' '}
                    <strong>{formatDecimal((100 * Number(profitSharingConfig[1])) / 1e18, 2)}</strong>%
                  </p>
                  <p>
                    Multiplier effect :{' '}
                    <strong>
                      {'x' +
                        formatDecimal(
                          Number(historicalData.creditSupply.values.slice(-1)[0]) /
                            Number(historicalData.aprData.values.rebasingSupply.slice(-1)[0]),
                          3
                        )}
                    </strong>{' '}
                    (only{' '}
                    <span className="font-semibold">
                      {formatDecimal(
                        Number(historicalData.aprData.values.rebasingSupply.slice(-1)[0]),
                        pegTokenDecimalsToDisplay
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold">
                      {formatDecimal(
                        Number(historicalData.creditSupply.values.slice(-1)[0]),
                        pegTokenDecimalsToDisplay
                      )}
                    </span>{' '}
                    <Image className="inline-block align-top" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                    {pegToken?.symbol} lent is earning the savings rate)
                  </p>
                </>
              }
              trigger={
                <div>
                  <span className="mr-1 font-bold">Future APR :</span>
                  <span>
                    <Image
                      className="inline-block align-bottom"
                      title={pegToken?.symbol}
                      src={pegTokenLogo}
                      width={24}
                      height={24}
                      alt="logo"
                    />{' '}
                    {formatDecimal(aprFuture, 2) + '%'}
                  </span>
                  <span>
                    {' '}
                    +{' '}
                    <Image
                      className="inline-block align-bottom"
                      src="/img/crypto-logos/guild.png"
                      title="GUILD"
                      width={24}
                      height={24}
                      alt="logo"
                    />{' '}
                    {fdv
                      ? formatDecimal(lenderApr * 100, 2) + '% *'
                      : formatDecimal(currentDailyGuildPerDollarLent * 1000, 0) + ' / 1k$ daily'}
                  </span>
                  {additionalRewards.enabled ? (
                    <span>
                      {' '}
                      +{' '}
                      <ImageWithFallback
                        className="inline-block align-bottom"
                        src={'/img/crypto-logos/' + additionalRewards.token.symbol.toLowerCase() + '.png'}
                        fallbackSrc="/img/crypto-logos/unk.png"
                        width={24}
                        height={24}
                        alt={'logo'}
                      />{' '}
                      {formatDecimal(
                        ((100 * 365 * additionalRewards.dailyAmount * additionalRewards.token.price) /
                          Number(historicalData.creditSupply.values.slice(-1)[0])) *
                          pegToken.price,
                        0
                      ) +
                        '% ' +
                        additionalRewards.token.symbol}
                    </span>
                  ) : null}
                </div>
              }
              placement="bottom"
            />
            {fdv ? (
              <div className="mt-1 text-2xl text-xs font-normal opacity-50">
                * Assuming ${formatCurrencyValue(fdv)} FDV, GUILD is not transferable yet
              </div>
            ) : null}

            {editingFdv ? (
              <div className="cursor-pointer text-xs">
                $
                <input
                  className="border-gray-300 bg-brand-100/0 px-2 py-1 text-gray-800 focus:border-brand-400/80 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50"
                  type="text"
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
                className={(fdv ? 'mt-1' : 'mt-2') + ' text-bold cursor-pointer text-xs underline'}
                onClick={() => {
                  setEditingFdv(true);
                }}
              >
                Set {fdv ? 'another' : ''} FDV to {fdv ? 'update' : 'display'} GUILD APR
              </div>
            )}
            <TooltipHorizon
              extra="dark:text-gray-200"
              content={
                <>
                  <p className="mb-3 text-xs opacity-50">
                    In addition to {pegToken?.symbol} yield, you will be earning GUILD tokens as a reward for
                    <br />
                    helping to bootstrap the protocol. GUILD rewards are computed per epoch,
                    <br />
                    visit the airdrop page for more information.
                  </p>
                  <p>
                    GUILD airdrop : <span className="font-semibold">10M</span>
                  </p>
                  <p>
                    Period duration : <span className="font-semibold">28 days</span>
                  </p>
                  <p>
                    GUILD to lenders : <span className="font-semibold">75%</span>
                  </p>
                  <p>
                    Daily GUILD to lenders :{' '}
                    <span className="font-semibold">{formatCurrencyValue(dailyGuildToLenders)}</span>
                  </p>
                  <p>
                    Total lent (across all markets) :{' '}
                    <span className="font-semibold">{formatCurrencyValue(airdropData.rebasingSupplyUsd)}</span> $
                  </p>
                  <p>
                    Current daily GUILD per $ lent :{' '}
                    <span className="font-semibold">{formatDecimal(currentDailyGuildPerDollarLent, 2)}</span>
                  </p>
                  <p className="mt-3 italic">
                    All values are estimates and the final result depends on the behavior
                    <br />
                    of other protocol users.
                  </p>
                </>
              }
              trigger={
                <div className="mt-1 cursor-help text-center text-xs italic opacity-50">
                  Hover to view airdrop details
                </div>
              }
              placement="bottom"
            />
          </Card>

          <div className="order-2 grid h-full w-full grid-cols-1 gap-5 xs:col-span-1 xs:grid-cols-2 sm:overflow-auto lg:col-span-4 lg:grid-cols-2 2xl:col-span-4 2xl:grid-cols-2 3xl:col-span-4 3xl:grid-cols-2">
            <TooltipHorizon
              extra="dark:text-gray-200"
              content={
                <>
                  <p>
                    Lent : <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                    <span className="font-semibold">
                      {formatDecimal(
                        Number(historicalData.creditSupply.values.slice(-1)[0]),
                        pegTokenDecimalsToDisplay
                      )}
                    </span>{' '}
                    {pegToken?.symbol}
                  </p>
                  <p>
                    Unit Price : <span className="font-semibold">{pegToken.price}</span> ${' '}
                    <span className="text-gray-400">(DefiLlama)</span>
                  </p>
                  <p>
                    Total Lent :{' '}
                    <span className="font-semibold">
                      {formatDecimal(Number(historicalData.creditSupply.values.slice(-1)[0]) * pegToken.price, 2)}
                    </span>{' '}
                    $ <span className="text-gray-400">(DefiLlama)</span>
                  </p>
                  <p className="mt-2">
                    Earning Savings Rate:{' '}
                    <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                    <span className="font-semibold">
                      {formatDecimal(
                        Number(historicalData.aprData.values.rebasingSupply.slice(-1)[0]),
                        pegTokenDecimalsToDisplay
                      )}
                    </span>
                  </p>
                </>
              }
              trigger={
                <div>
                  <Widget
                    icon={<BsSafe2 className="h-7 w-7" />}
                    title={'Total Lent'}
                    subtitle={
                      pegToken.price === 0
                        ? '$ -.--'
                        : '$ ' +
                          formatCurrencyValue(
                            parseFloat(
                              formatDecimal(Number(historicalData.creditSupply.values.slice(-1)[0]) * pegToken.price, 2)
                            )
                          )
                    }
                    extra={<QuestionMarkIcon />}
                  />
                </div>
              }
              placement="bottom"
            />

            <TooltipHorizon
              extra="dark:text-gray-200"
              content={
                <>
                  <p>
                    Number of unique addresses holding{' '}
                    <Image
                      className="inline-block"
                      src={pegTokenLogo}
                      width={20}
                      height={20}
                      alt="logo"
                      style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                    />{' '}
                    {creditTokenSymbol}.
                  </p>
                </>
              }
              trigger={
                <div>
                  <Widget
                    icon={<BsPerson className="h-7 w-7" />}
                    title={'Lenders'}
                    subtitle={creditHolderCount}
                    extra={<QuestionMarkIcon />}
                  />
                </div>
              }
              placement="bottom"
            />

            <TooltipHorizon
              extra="dark:text-gray-200"
              content={
                <>
                  <p>
                    Total Borrowed :{' '}
                    <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                    <span className="font-semibold">
                      {formatDecimal(
                        Number(historicalData.creditTotalIssuance.values.slice(-1)[0]),
                        pegTokenDecimalsToDisplay
                      )}
                    </span>
                  </p>
                  <p>
                    Total Lent : <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                    <span className="font-semibold">
                      {formatDecimal(
                        Number(historicalData.creditSupply.values.slice(-1)[0]),
                        pegTokenDecimalsToDisplay
                      )}
                    </span>
                  </p>
                </>
              }
              trigger={
                <div>
                  <Widget
                    icon={<BsPercent className="h-7 w-7" />}
                    title={'Utilization'}
                    subtitle={
                      formatDecimal(
                        100 *
                          (Number(historicalData.creditTotalIssuance.values.slice(-1)[0]) /
                            Number(historicalData.creditSupply.values.slice(-1)[0])),
                        1
                      ) + '%'
                    }
                    extra={<QuestionMarkIcon />}
                  />
                </div>
              }
              placement="bottom"
            />

            <TooltipHorizon
              extra="dark:text-gray-200"
              content={
                <>
                  <p>
                    Pending Interest :{' '}
                    <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                    <span className="font-semibold">
                      {formatDecimal(
                        historicalData.loanBorrow.values.totalUnpaidInterests.slice(-1)[0],
                        pegTokenDecimalsToDisplay
                      )}
                    </span>{' '}
                    {pegToken?.symbol}
                  </p>
                  <p>
                    Unit Price : <span className="font-semibold">{pegToken.price}</span> ${' '}
                    <span className="text-gray-400">(DefiLlama)</span>
                  </p>
                  <p>This corresponds to the gray area on the chart.</p>
                </>
              }
              trigger={
                <div>
                  <Widget
                    icon={<BsClock className="h-7 w-7" />}
                    title={'Pending Interest'}
                    subtitle={
                      '$ ' +
                      formatCurrencyValue(
                        historicalData.loanBorrow.values.totalUnpaidInterests.slice(-1)[0] * pegToken?.price
                      )
                    }
                    extra={<QuestionMarkIcon />}
                  />
                </div>
              }
              placement="bottom"
            />
          </div>
        </div>

        <Card
          title="Earnings over time"
          extra="mt-5 w-full sm:overflow-auto px-6 py-4 lg:col-span-1 2xl:col-span-1 3xl:col-span-1 xs:col-span-1"
        >
          <p className="text-sm opacity-70">
            Hypothetical earnings of 1{' '}
            <Image
              className="inline-block align-text-bottom"
              src={pegTokenLogo}
              width={16}
              height={16}
              alt={pegToken?.symbol}
            />{' '}
            {pegToken?.symbol} in the savings rate since market launch.
          </p>
          <div>
            {chartData.length === 0 ? (
              <div className="flex h-96 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div>
                <ApexChartWrapper options={chartData.options} series={chartData.series} type="area" height={270} />
              </div>
            )}
          </div>
          <p className="text-xs italic opacity-70">
            Unlike most lending protocols, profit in the Credit Guild is accounted only when borrowers pay their
            interests, once we know the loans did not create bad debt. When borrowers pay interests, the profit is
            distributed to lenders through a rebase interpolation over 30 days (your balance slowly goes up over time).
          </p>
        </Card>

        {pegTokenAddress == '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' ? (
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card title="" extra="order-1 w-full h-full sm:overflow-auto px-6 py-4">
              <h3 className="mb-2 text-xl font-medium text-gray-800 dark:text-white">
                Wrap ETH to WETH
                <span className="ml-5 align-middle text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available: {formatDecimal(Number(formatUnits(userBalance, 18)), pegTokenDecimalsToDisplay)}{' '}
                  <button
                    className="inline text-sm font-medium text-brand-500 hover:text-brand-400"
                    onClick={(e) => setWrapValue(formatUnits(userBalance, 18))}
                  >
                    Set to max
                  </button>
                </span>
                {wrapValue ? (
                  <button
                    className="float-right inline rounded-sm bg-brand-500 px-3 py-1 text-sm font-medium hover:bg-brand-400"
                    onClick={(e) => wrap()}
                  >
                    Wrap
                  </button>
                ) : null}
              </h3>
              <DefiInputBox
                topLabel=""
                currencyLogo="/img/crypto-logos/eth.png"
                currencySymbol="ETH"
                placeholder="0"
                pattern="^[0-9]*[.,]?[0-9]*$"
                inputSize="text-xl sm:text-2xl"
                value={wrapValue}
                onChange={handleWrapInputChange}
              />
            </Card>
            <Card title="" extra="order-1 w-full h-full sm:overflow-auto px-6 py-4">
              <h3 className="mb-2 text-xl font-medium text-gray-800 dark:text-white">
                Unwrap WETH to ETH
                <span className="ml-5 align-middle text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available: {formatDecimal(Number(formatUnits(data.pegTokenBalance, 18)), pegTokenDecimalsToDisplay)}{' '}
                  <button
                    className="inline text-sm font-medium text-brand-500 hover:text-brand-400"
                    onClick={(e) => setUnwrapValue(formatUnits(data.pegTokenBalance, 18))}
                  >
                    Set to max
                  </button>
                </span>
                {unwrapValue ? (
                  <button
                    className="float-right inline rounded-sm bg-brand-500 px-3 py-1 text-sm font-medium hover:bg-brand-400"
                    onClick={(e) => unwrap()}
                  >
                    Unwrap
                  </button>
                ) : null}
              </h3>
              <DefiInputBox
                topLabel=""
                currencyLogo="/img/crypto-logos/weth.png"
                currencySymbol="WETH"
                placeholder="0"
                pattern="^[0-9]*[.,]?[0-9]*$"
                inputSize="text-xl sm:text-2xl"
                value={unwrapValue}
                onChange={handleUnwrapInputChange}
              />
            </Card>
          </div>
        ) : null}

        <div className="mb-5 mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card
            title="Savings Rate"
            extra="w-full h-full sm:overflow-auto px-6 py-4"
            rightText={
              <Switch
                checked={data.isRebasing}
                onChange={function () {
                  {
                    data.isRebasing ? saving('exitRebase') : saving('enterRebase');
                  }
                }}
                className={clsx(
                  data.isRebasing ? 'bg-brand-500' : 'bg-gray-200',
                  'border-transparent relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out'
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    data.isRebasing ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            }
          >
            <div className="h-full rounded-md text-gray-700 dark:text-gray-200">
              <div className="mt-4 flex flex-col gap-4">
                <p>
                  If you elect to receive the savings rate, the{' '}
                  <Image
                    className="inline-block"
                    src={pegTokenLogo}
                    width={20}
                    height={20}
                    alt="logo"
                    style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                  />{' '}
                  <strong>{creditTokenSymbol}</strong> balance of your wallet will automatically rebase up when the
                  protocol earn fees. The protocol profit sharing can be updated by governance, and is currently
                  configured as follow :
                </p>
                <ul className="list-inside list-disc">
                  <li className="list-item">
                    <span className="font-semibold ">{(100 * Number(profitSharingConfig[1])) / 1e18}</span>% to{' '}
                    <Image
                      className="inline-block"
                      src={pegTokenLogo}
                      width={20}
                      height={20}
                      alt="logo"
                      style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                    />{' '}
                    <strong>{creditTokenSymbol}</strong> savers,
                  </li>
                  <li className="list-item">
                    <span className="font-semibold">{(100 * Number(profitSharingConfig[2])) / 1e18}</span>% to{' '}
                    <Image
                      className="inline-block"
                      src="/img/crypto-logos/guild.png"
                      width={20}
                      height={20}
                      alt="logo"
                    />{' '}
                    <strong>GUILD</strong> stakers,
                  </li>
                  <li className="list-item">
                    <span className="font-semibold">{(100 * Number(profitSharingConfig[0])) / 1e18}</span>% to the
                    Surplus Buffer.
                  </li>
                </ul>
                <p>The Surplus Buffer is a first-loss capital reserve shared among all terms of a market.</p>
                <p className="text-gray-400">
                  You might not want to subscribe to the savings rate if your only intent is to borrow{' '}
                  <Image
                    className="inline-block"
                    src={pegTokenLogo}
                    width={20}
                    height={20}
                    alt="logo"
                    style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                  />{' '}
                  {creditTokenSymbol} then redeem them for{' '}
                  <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" />{' '}
                  {pegToken?.symbol} (leveraging up on collateral tokens and shorting{' '}
                  <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" />{' '}
                  {pegToken?.symbol}), as being a rebasing address (and delegating voting power to be able to veto) will
                  increase the gas cost of doing{' '}
                  <Image
                    className="inline-block"
                    src={pegTokenLogo}
                    width={20}
                    height={20}
                    alt="logo"
                    style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                  />{' '}
                  {creditTokenSymbol} token transfers to/from lending terms and PSM.
                </p>
                <p className="text-gray-400">
                  The{' '}
                  <Image
                    className="inline-block"
                    src={pegTokenLogo}
                    width={20}
                    height={20}
                    alt="logo"
                    style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                  />{' '}
                  {creditTokenSymbol} tokens are not intended to be very liquid on-chain, they act as a receipt token
                  for lending in this ECG market, and can be redeemed in the PSM to inherit the liquidity of the peg
                  token, <Image className="inline-block" src={pegTokenLogo} width={20} height={20} alt="logo" />{' '}
                  {pegToken?.symbol}, when there is liquidity. Loans can be called to increase PSM liquidity.
                </p>
              </div>
            </div>
          </Card>

          <Card title="Mint / Redeem" extra="order-1 w-full h-full sm:overflow-auto px-6 py-4">
            <MintOrRedeem
              reloadMintRedeem={setReload}
              pegTokenBalance={data.pegTokenBalance}
              pegTokenPSMBalance={data.pegTokenPSMBalance}
              creditTokenBalance={data.creditTokenBalance}
              creditMultiplier={data.creditMultiplier}
              isRebasing={data.isRebasing}
              creditTokenNonces={data.creditTokenNonces}
              pegTokenNonces={data.pegTokenNonces}
              creditTokenName={data.creditTokenName}
              pegTokenName={data.pegTokenName}
            />
          </Card>
        </div>
      </div>
    );
  }
}

export default MintAndSaving;
