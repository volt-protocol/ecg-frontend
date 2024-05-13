'use client';

import Disconnected from 'components/error/disconnected';
import React, { useEffect, useState } from 'react';
import Card from 'components/card';
import { useAccount, useReadContracts } from 'wagmi';
import { ProfitManagerABI, CreditABI, WethABI } from 'lib/contracts';
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
import { useAppStore } from 'store';
import Spinner from 'components/spinner';
import { getPegTokenLogo, marketsConfig } from 'config';
import Image from 'next/image';
import { TooltipHorizon, QuestionMarkIcon } from 'components/tooltip';
import { BsBank2 } from 'react-icons/bs';
import Widget from 'components/widget/Widget';
import { ApexChartWrapper } from 'components/charts/ApexChartWrapper';
import DefiInputBox from 'components/box/DefiInputBox';

function MintAndSaving() {
  const { appMarketId, appChainId, contractsList, coinDetails, historicalData, airdropData } = useAppStore();
  const { address, isConnected } = useAccount();
  const [reload, setReload] = React.useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFdv, setEditingFdv] = useState(false);
  const [fdv, setFdv] = useState(0);
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
  const creditTokenSymbol = 'g' + pegToken?.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);

  // airdrop computations
  const fdvSupply = 1e9; // 1B GUILD max supply
  const airdropPercent = 0.01; // 1% supply
  const airdropSize = airdropPercent * fdvSupply;
  const dailyGuild = airdropSize / 30; // monthly periods
  const dailyGuildToLenders = dailyGuild * 0.6; // 60% to lenders
  const currentDailyGuildPerDollarLent = dailyGuildToLenders / airdropData.rebasingSupplyUsd;
  const lenderApr = (365 * currentDailyGuildPerDollarLent * fdv) / 1e9;

  useEffect(() => {
    if (!historicalData) return;

    const interpolatingRebaseRewards: number[] = [];
    const unpaidInterestPerUnit: number[] = [];
    historicalData.aprData.timestamps.forEach((t, i) => {
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

    const seriesData = [
      {
        name: 'Principal losses',
        data: historicalData.creditMultiplier.values.map((e, i) =>
          Number(formatDecimal(e - 1, pegTokenDecimalsToDisplay * 2))
        ),
        color: '#212121'
      },
      {
        name: 'Pending Interest',
        data: unpaidInterestPerUnit,
        color: '#757575'
      },
      {
        name: 'Distributed through rebase',
        data: historicalData.aprData.values.sharePrice.map((e) =>
          Number(formatDecimal(e - 1, pegTokenDecimalsToDisplay * 2))
        ),
        color: '#388E3C'
      },
      {
        name: 'Interpolating rebase rewards',
        data: interpolatingRebaseRewards,
        color: '#4CAF50'
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
        address: profitManagerAddress,
        abi: ProfitManagerABI,
        functionName: 'getProfitSharingConfig',
        chainId: appChainId
      }
    ],
    query: {
      select: (data) => {
        return {
          pegTokenBalance: data[0].result as bigint,
          creditTokenBalance: data[1].result as bigint,
          creditMultiplier: data[2].result as bigint,
          pegTokenPSMBalance: data[3].result as bigint,
          isRebasing: data[4].result as boolean,
          creditSplit: formatDecimal(Number(formatUnits(data[5].result[1] as bigint, 18)) * 100, 2),
          guildSplit: formatDecimal(Number(formatUnits(data[5].result[2] as bigint, 18)) * 100, 2),
          surplusBufferSplit: formatDecimal(Number(formatUnits(data[5].result[0] as bigint, 18)) * 100, 2)
        };
      }
    }
  });

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

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^[0-9]*\.?[0-9]*$/i.test(inputValue)) {
      setWrapValue(inputValue as string);
    }
  };

  const handleUnwrapInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^[0-9]*\.?[0-9]*$/i.test(inputValue)) {
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
        value: parseUnits(wrapValue, 18)
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
        args: [parseUnits(unwrapValue, 18)]
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
        functionName: rebaseMode
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

  if (!isConnected) {
    return <Disconnected />;
  }

  if (isLoading) return <Spinner />;

  if (data) {
    return (
      <div>
        {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}

        {true ? null : (
          <div className="mt-3 grid grid-cols-1 gap-5 opacity-50 xs:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-6">
            <TooltipHorizon
              extra="dark:text-gray-200"
              content={
                <>
                  <p>
                    Lent : <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                    <span className="font-semibold">{formatDecimal(123.456789, pegTokenDecimalsToDisplay)}</span>{' '}
                    {pegToken?.symbol}
                  </p>
                  <p>
                    Unit Price : <span className="font-semibold">{pegToken.price}</span> ${' '}
                    <span className="text-gray-400">(DefiLlama)</span>
                  </p>
                  <p>
                    Total Lent : <span className="font-semibold">{formatDecimal(123.456789 * pegToken.price, 2)}</span>{' '}
                    $ <span className="text-gray-400">(DefiLlama)</span>
                  </p>
                </>
              }
              trigger={
                <div>
                  <Widget
                    icon={<BsBank2 className="h-7 w-7" />}
                    title={'Total Lent'}
                    subtitle={
                      pegToken.price === 0
                        ? '$ -.--'
                        : '$ ' + formatCurrencyValue(parseFloat(formatDecimal(123.456789 * pegToken.price, 2)))
                    }
                    extra={<QuestionMarkIcon />}
                  />
                </div>
              }
              placement="bottom"
            />

            <Widget icon={<BsBank2 className="h-7 w-7" />} title={'Lenders'} subtitle={'Soon™️'} />

            <Widget icon={<BsBank2 className="h-7 w-7" />} title={'Utilization'} subtitle={'Soon™️'} />

            <Widget icon={<BsBank2 className="h-7 w-7" />} title={'Current APR'} subtitle={'Soon™️'} />

            <Widget icon={<BsBank2 className="h-7 w-7" />} title={'Future APR (est)'} subtitle={'Soon™️'} />

            <Widget icon={<BsBank2 className="h-7 w-7" />} title={'All-time P&L'} subtitle={'Soon™️'} />
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-5 xs:grid-cols-1 lg:grid-cols-6 2xl:grid-cols-6 3xl:grid-cols-6">
          <Card
            title="Earnings over time"
            extra="order-1 w-full h-full sm:overflow-auto px-6 py-4 lg:col-span-4 2xl:col-span-4 3xl:col-span-4 xs:col-span-1"
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
              {pegToken?.symbol} lent since market launch.
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
              distributed to lenders through a rebase interpolation over 30 days (your balance slowly goes up over
              time).
            </p>
          </Card>
          <Card
            title="Current daily GUILD rewards"
            extra="order-2 w-full h-full sm:overflow-auto px-6 py-4 lg:col-span-2 2xl:col-span-2 3xl:col-span-2 xs:col-span-1"
          >
            <div className="text-center">
              <Image
                className="mt-3 inline-block"
                src="/img/crypto-logos/guild.png"
                width={85}
                height={85}
                alt="logo"
              />
              {fdv ? (
                <div className="mt-2 text-2xl">
                  <span className="font-bold">{formatDecimal(lenderApr * 100, 0)}%</span>*
                  <div className="text-xs font-normal">
                    *APR assuming ${formatCurrencyValue(fdv)} FDV, GUILD is not transferable yet
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-2xl font-bold">
                  {formatDecimal(currentDailyGuildPerDollarLent * 1000, 0)} GUILD / 1k$
                </div>
              )}

              {editingFdv ? (
                <div className="mt-1 cursor-pointer text-xs">
                  $
                  <input
                    className="border-gray-300 bg-brand-100/0 px-2 py-1 text-gray-800 focus:border-brand-400/80 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50"
                    type="text"
                    value={fdv}
                    onChange={(e) => {
                      if (/^[0-9]*\.?[0-9]*$/i.test(e.target.value)) {
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
                    Set Custom
                  </span>
                  <span
                    className="mr-2 cursor-pointer rounded-sm bg-brand-500 px-1 py-1 text-xs font-semibold text-white no-underline hover:bg-brand-400 dark:bg-brand-800 dark:hover:bg-brand-700"
                    onClick={async () => {
                      setFdv(50e6);
                      setEditingFdv(false);
                    }}
                  >
                    Set to $50M
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
                  Set FDV to {fdv ? 'update' : 'display'} APY
                </div>
              )}

              <p className="mt-3 text-xs opacity-50">
                In addition to {pegToken?.symbol} yield, you will be earning GUILD tokens as a reward for helping to
                bootstrap the protocol. GUILD rewards are computed per epoch of ~1 month, and airdropped directly in
                your wallet. Current epoch is running between 19th of april to 19th of may, and a total of 10M GUILD
                tokens will be distributed. Distribution will go 60% to lenders, 20% to borrowers, 15% to first-loss
                capital providers (GUILD and {creditTokenSymbol}), and 5% towards liquidators, proportional to the value
                and time spent in the protocol. Rewards are shared between all markets.
              </p>
              <TooltipHorizon
                extra="dark:text-gray-200"
                content={
                  <>
                    <p>
                      GUILD airdrop : <span className="font-semibold">10M</span>
                    </p>
                    <p>
                      Period duration : <span className="font-semibold">30 days</span>
                    </p>
                    <p>
                      GUILD to lenders : <span className="font-semibold">60%</span>
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
                      of protocol users between now and the end of the period.
                    </p>
                  </>
                }
                trigger={
                  <div className="mt-3 cursor-help text-center text-xs italic opacity-50">
                    Hover to view airdrop details
                  </div>
                }
                placement="bottom"
              />
            </div>
          </Card>
        </div>

        {pegTokenAddress == '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' ? (
          <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
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

        <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
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
                    <span className="font-semibold ">{data.creditSplit}</span>% to{' '}
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
                    <span className="font-semibold">{data.guildSplit}</span>% to{' '}
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
                    <span className="font-semibold">{data.surplusBufferSplit}</span>% to the Surplus Buffer.
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
            />
          </Card>
        </div>
      </div>
    );
  }
}

export default MintAndSaving;
