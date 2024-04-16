'use client';
import { GuildABI, CreditABI } from 'lib/contracts';
import { readContract } from '@wagmi/core';
import { useEffect, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { formatDecimal } from 'utils/numbers';
import { Delegatee } from 'app/(app)/governance/page';
import { ApexChartWrapper } from 'components/charts/ApexChartWrapper';
import Spinner from 'components/spinner';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore } from 'store';
import { getCreditTokenSymbol } from 'utils/strings';
import { getPegTokenLogo, marketsConfig } from 'config';
import Image from 'next/image';

export default function VotingPower({ userAddress }: { userAddress: Address }) {
  const { contractsList, appMarketId, coinDetails, appChainId } = useAppStore();
  const [guildDelegatees, setGuildDelegatees] = useState<Delegatee[]>([]);
  const [creditDelegatees, setCreditDelegatees] = useState<Delegatee[]>([]);
  const [loadingGuildDelegation, setLoadingGuildDelegation] = useState<boolean>(true);
  const [loadingCreditDelegation, setLoadingCreditDelegation] = useState<boolean>(true);
  const [guildChart, setGuildChart] = useState<any>(undefined);
  const [creditChart, setCreditChart] = useState<any>(undefined);

  const creditAddress = contractsList?.marketContracts[appMarketId]?.creditAddress;
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken?.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);

  const creditTokenSymbol = getCreditTokenSymbol(coinDetails, appMarketId, contractsList);

  /* Read contracts */
  const { data, isError, isLoading, isFetched } = useReadContracts({
    contracts: [
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'balanceOf',
        args: [userAddress],
        chainId: appChainId
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'freeVotes',
        args: [userAddress],
        chainId: appChainId
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'getVotes',
        args: [userAddress],
        chainId: appChainId
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'balanceOf',
        args: [userAddress],
        chainId: appChainId
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'freeVotes',
        args: [userAddress],
        chainId: appChainId
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'getVotes',
        args: [userAddress],
        chainId: appChainId
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'delegates',
        args: [userAddress],
        chainId: appChainId
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'delegates',
        args: [userAddress],
        chainId: appChainId
      }
    ],
    query: {
      select: (data) => {
        return {
          guildBalance: data[0].result as bigint,
          guildNotUsed: data[1].result as bigint,
          guildVotingWeight: data[2].result as bigint,
          creditBalance: data[3].result as bigint,
          creditNotUsed: data[4].result as bigint,
          creditVotingWeight: data[5].result as bigint,
          guildDelegatees: data[6].result as string[],
          creditDelegatees: data[7].result as string[]
        };
      }
    }
  });

  useEffect(() => {
    async function getDelegateeAndVotes(): Promise<void> {
      setLoadingGuildDelegation(true);
      for (const delegatee of data.guildDelegatees) {
        const result = await readContract(wagmiConfig, {
          address: contractsList.guildAddress,
          abi: GuildABI,
          functionName: 'delegatesVotesCount',
          args: [userAddress, delegatee],
          chainId: appChainId as any
        });
        const tempDelegatees = {
          address: delegatee,
          votes: Number(formatUnits(result as bigint, 18))
        };
        setGuildDelegatees((guildDelegatees) => [...guildDelegatees, tempDelegatees]);
      }
      setLoadingGuildDelegation(false);
    }
    if (data && data.guildDelegatees) {
      getDelegateeAndVotes();
    }
  }, [data]);

  useEffect(() => {
    async function getDelegateeAndVotes(): Promise<void> {
      setLoadingCreditDelegation(true);
      for (const delegatee of data.creditDelegatees) {
        const result = await readContract(wagmiConfig, {
          address: creditAddress,
          abi: CreditABI,
          functionName: 'delegatesVotesCount',
          args: [userAddress, delegatee],
          chainId: appChainId as any
        });
        const tempDelegatees = {
          address: delegatee,
          votes: Number(formatUnits(result as bigint, 18))
        };
        setGuildDelegatees((creditDelegatees) => [...creditDelegatees, tempDelegatees]);
      }
      setLoadingCreditDelegation(false);
    }
    if (data && data.creditDelegatees) {
      getDelegateeAndVotes();
    }
  }, [data]);

  /* End Read Contracts  */
  useEffect(() => {
    if (!loadingGuildDelegation && !loadingCreditDelegation) {
      const guildChart = {
        series: [
          Number(formatUnits(data.guildNotUsed, 18)),
          Number(formatUnits(data.guildVotingWeight, 18)),
          guildDelegatees.filter((delegatee) => delegatee.address != userAddress).reduce((a, b) => a + b.votes, 0)
        ],
        options: {
          legend: {
            show: false
          },
          tooltip: {
            y: {
              formatter: (val) => formatDecimal(val, 2) + ' GUILD'
            }
          },
          chart: {
            width: 380,
            type: 'pie'
          },
          labels: ['Not delegated yet', 'Delegated to yourself', 'Delegated to others'],
          responsive: [
            {
              breakpoint: 480,
              options: {
                chart: {
                  width: '100%'
                },
                legend: {
                  position: 'bottom'
                }
              }
            }
          ],
          colors: ['#50bdae', '#f7b924', '#9966CC', '#80BF80', '#F28073', '#B2CCE6', '#800021']
        }
      };

      const creditChart = {
        series: [
          Number(formatUnits(data.creditNotUsed, 18)),
          Number(formatUnits(data.creditVotingWeight, 18)),
          creditDelegatees.filter((delegatee) => delegatee.address != userAddress).reduce((a, b) => a + b.votes, 0)
        ],
        options: {
          legend: {
            show: false
          },
          tooltip: {
            y: {
              formatter: (val) => formatDecimal(val, 2) + ' ' + creditTokenSymbol
            }
          },
          chart: {
            width: 380,
            type: 'pie'
          },
          labels: ['Not delegated yet', 'Delegated to yourself', 'Delegated to others'],
          responsive: [
            {
              breakpoint: 480,
              options: {
                chart: {
                  width: '100%'
                },
                legend: {
                  position: 'bottom'
                }
              }
            }
          ],
          colors: ['#50bdae', '#f7b924', '#9966CC', '#80BF80', '#F28073', '#B2CCE6', '#800021']
        }
      };

      setGuildChart(guildChart);
      setCreditChart(creditChart);
    }
  }, [loadingCreditDelegation, loadingGuildDelegation]);

  return (
    <div>
      <dl className="mt-3 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow dark:divide-navy-600 dark:bg-navy-700 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div key="guildVotingPower" className="px-2 py-4 sm:p-5">
          <dt className="text-sm font-normal text-gray-500 dark:text-gray-300 xl:text-base">
            <Image className="inline align-bottom" src="/img/crypto-logos/guild.png" width={28} height={28} alt="" />{' '}
            Voting Power
          </dt>
          <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
            <div className="flex items-baseline overflow-hidden text-lg font-semibold text-gray-700 dark:text-gray-200 xl:text-2xl">
              {data && data.guildBalance && formatDecimal(Number(formatUnits(data.guildBalance, 18)), 2)}{' '}
              <span className="ml-1 text-base font-medium">GUILD</span>
            </div>
          </dd>
        </div>
        <div key="creditVotingPower" className="px-2 py-4 sm:p-5">
          <dt className="text-sm font-normal text-gray-500 dark:text-gray-300 xl:text-base">
            <Image
              src={pegTokenLogo}
              width={28}
              height={28}
              alt=""
              className="inline align-bottom"
              style={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
            />{' '}
            Voting Power
          </dt>
          <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
            <div className="flex items-baseline overflow-hidden text-lg font-semibold text-gray-700 dark:text-gray-200 xl:text-2xl">
              {data &&
                data.guildBalance &&
                formatDecimal(Number(formatUnits(data.creditBalance, 18)), pegTokenDecimalsToDisplay)}{' '}
              <span className="ml-1 text-base font-medium">{creditTokenSymbol}</span>
            </div>
          </dd>
        </div>
      </dl>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2">
        {guildChart != undefined ? (
          <ApexChartWrapper options={guildChart.options} series={guildChart.series} type="pie" />
        ) : (
          <Spinner />
        )}
        {creditChart != undefined ? (
          <ApexChartWrapper options={creditChart.options} series={creditChart.series} type="pie" />
        ) : (
          <Spinner />
        )}
      </div>
    </div>
  );
}
