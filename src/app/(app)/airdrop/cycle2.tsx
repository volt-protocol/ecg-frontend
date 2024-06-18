'use client';

import React, { useState } from 'react';
import Card from 'components/card';
import { useAccount } from 'wagmi';
import { default as cycleAirdropData } from './data/cycle2.json';
import Image from 'next/image';
import { getExplorerBaseUrl } from 'config';
import { useUserPrefsStore } from 'store';
import { AddressBadge } from 'components/badge/AddressBadge';
import { marketsConfig, getPegTokenLogo } from 'config';
import { formatCurrencyValue } from 'utils/numbers';
import { TooltipHorizon } from 'components/tooltip';

interface AirdropData {
  marketUtilizationUsd: {
    [date: string]: {
      [marketId: string]: number; // total borrows
    };
  };
  userData: {
    [userAddress: string]: {
      userAddress: string;
      dailyBalances: {
        [dayIso: string]: {
          [marketId: string]: {
            creditBalanceUsd: number;
            borrowBalanceUsd: number;
          };
        };
      };
    };
  };
  termsData: {
    [dayIso: string]: {
      [marketId: number]: {
        [termAddress: string]: {
          termName: string;
          termAddress: string;
          issuanceCredit: number;
          interestRate: number;
          issuanceUsd: number;
          interest24hUsd: number;
          totalStakes: number;
          userStakes: { [userAddress: string]: number };
        };
      };
    };
  };
}

function AirdropCycle2() {
  const { address, isConnected } = useAccount();
  const { appMarketId, appChainId } = useUserPrefsStore();
  const [userDetail, setUserDetail] = useState('');

  const data = cycleAirdropData as AirdropData;

  const AIRDROP_SIZE = 10_000_000;
  const PERCENT_LENDERS = 0.7; // 70%
  const PERCENT_BORROWERS = 0.1; // 10%
  const PERCENT_STAKERS = 0.17; // 17%

  const excludedAddresses = [
    '0x9722bec2524B4b4E37Df3ACd24F1431f66c62706', // Market 1 (USDC) ProfitManager
    '0x5D87B2f530e9C1E605EeE48e41c10534B7E29C78', // Market 3 (WETH) ProfitManager
    '0x7181E377b259D7c8D4caFdFe9FBe103dc5bfcE45', // Market 4 (ARB) ProfitManager
    '0xB94AaAe7472a694Dd959C8497b2f09730391dc52', // Market 1 (USDC) SGM
    '0x55aB4C8a5f11f8E62d7822d5AEd778784DF12aFD', // Market 3 (WETH) SGM
    '0x6995aA07B177918423d2127B885b67E7A3ceC265', // Market 4 (ARB) SGM
    '0x1A1075cef632624153176CCf19Ae0175953CF010', // team msig
    '0x0000000000000000000000000000000000000000' // zero addr
  ].map((_) => _.toLowerCase());

  const dailyTotals: {
    [dayKey: string]: {
      borrowBalanceUsd: number;
      stakePoints: number;
      markets: {
        [marketId: string]: {
          creditBalanceUsd: number;
        };
      };
    } & {
      users: {
        [userAddress: string]: {
          borrowBalanceUsd: number;
          stakePoints: number;
        };
      };
    };
  } = {};

  for (const userAddress in data.userData) {
    // skip excluded addresses
    if (excludedAddresses.includes(userAddress.toLowerCase())) continue;
    for (const date in data.userData[userAddress].dailyBalances) {
      for (const market in data.userData[userAddress].dailyBalances[date]) {
        // global values
        // init object if empty
        if (!dailyTotals[date]) {
          dailyTotals[date] = {
            markets: {},
            borrowBalanceUsd: 0,
            stakePoints: 0,
            users: {}
          };
        }
        if (!dailyTotals[date].markets[market]) {
          dailyTotals[date].markets[market] = {
            creditBalanceUsd: 0
          };
        }
        if (!dailyTotals[date].users[userAddress]) {
          dailyTotals[date].users[userAddress] = {
            borrowBalanceUsd: 0,
            stakePoints: 0
          };
        }
        // register values in daily totals
        dailyTotals[date].markets[market].creditBalanceUsd +=
          data.userData[userAddress].dailyBalances[date][market].creditBalanceUsd;
        dailyTotals[date].borrowBalanceUsd += data.userData[userAddress].dailyBalances[date][market].borrowBalanceUsd;
        dailyTotals[date].users[userAddress].borrowBalanceUsd +=
          data.userData[userAddress].dailyBalances[date][market].borrowBalanceUsd;
      }
    }
  }

  // compute stake points
  for (var dayKey in data.termsData) {
    for (var marketId in data.termsData[dayKey]) {
      for (var termAddress in data.termsData[dayKey][marketId]) {
        let d = data.termsData[dayKey][marketId][termAddress];
        dailyTotals[dayKey].stakePoints += d.interest24hUsd;
        for (var userAddress in d.userStakes) {
          if (!dailyTotals[dayKey].users[userAddress]) {
            dailyTotals[dayKey].users[userAddress] = {
              borrowBalanceUsd: 0,
              stakePoints: 0
            };
          }
          dailyTotals[dayKey].users[userAddress].stakePoints +=
            (d.interest24hUsd * d.userStakes[userAddress]) / data.termsData[dayKey][marketId][termAddress].totalStakes;
        }
      }
    }
  }

  const days = Object.keys(dailyTotals);
  const nDays = days.length;
  const dailyAirdrop = AIRDROP_SIZE / nDays;
  const airdrop: {
    [userAddress: string]: {
      lenderTotal: number;
      stakerTotal: number;
      borrowerTotal: number;
      total: number;
    };
  } = {};
  const dailyUserAirdrops: {
    [userAddress: string]: {
      [day: string]: number;
    };
  } = {};
  for (const dayKey in dailyTotals) {
    for (const userAddress in dailyTotals[dayKey].users) {
      const userData = dailyTotals[dayKey].users[userAddress];
      if (!airdrop[userAddress]) {
        airdrop[userAddress] = {
          lenderTotal: 0,
          stakerTotal: 0,
          borrowerTotal: 0,
          total: 0
        };
      }
      if (!dailyUserAirdrops[userAddress]) {
        dailyUserAirdrops[userAddress] = {};
      }

      let dailyUserAirdrop = 0;
      // borrower rewards
      let borrowerRewards =
        (dailyAirdrop * PERCENT_BORROWERS * userData.borrowBalanceUsd) / dailyTotals[dayKey].borrowBalanceUsd;
      dailyUserAirdrop += borrowerRewards;
      airdrop[userAddress].borrowerTotal += borrowerRewards;

      // lender rewards
      let lenderRewards = 0;
      Object.keys(data.marketUtilizationUsd[dayKey]).forEach((marketId) => {
        let marketFactor = Math.min(
          1,
          data.marketUtilizationUsd[dayKey][marketId] / dailyTotals[dayKey].borrowBalanceUsd
        );
        lenderRewards +=
          (marketFactor *
            dailyAirdrop *
            PERCENT_LENDERS *
            data.userData[userAddress]?.dailyBalances[dayKey][marketId]?.creditBalanceUsd || 0) /
          dailyTotals[dayKey].markets[marketId]?.creditBalanceUsd;
      });
      dailyUserAirdrop += lenderRewards;
      airdrop[userAddress].lenderTotal += lenderRewards;

      // staker rewards
      let stakerRewards = (dailyAirdrop * PERCENT_STAKERS * userData.stakePoints) / dailyTotals[dayKey].stakePoints;
      dailyUserAirdrop += stakerRewards;
      airdrop[userAddress].stakerTotal += stakerRewards;

      dailyUserAirdrops[userAddress][dayKey] = dailyUserAirdrop;
      airdrop[userAddress].total += dailyUserAirdrop;
    }
  }

  /*const txBuilderJson = {
    version: '1.0',
    chainId: '42161',
    createdAt: 1713532237649,
    meta: {
      name: 'Transactions Batch',
      description: '',
      txBuilderVersion: '1.16.5',
      createdFromSafeAddress: '0x1A1075cef632624153176CCf19Ae0175953CF010',
      createdFromOwnerAddress: '',
      checksum: '0x0'
    },
    transactions: []
  };
  for (var userAddress in airdrop) {
    let totalUser = BigInt(Math.floor(airdrop[userAddress].total * 1e18)).toString();
    if (totalUser == '0') continue;
    txBuilderJson.transactions.push({
      to: '0xe38d06840c9e527b8d40309cccf4b05af0f888a5',
      value: '0',
      data: null,
      contractMethod: {
        inputs: [
          {
            internalType: 'address',
            name: 'to',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256'
          }
        ],
        name: 'redeem',
        payable: false
      },
      contractInputsValues: {
        to: userAddress,
        amount: totalUser
      }
    });
  }
  txBuilderJson.transactions = txBuilderJson.transactions
    .sort(function (a, b) {
      return Number(a.contractInputsValues.amount) < Number(b.contractInputsValues.amount) ? 1 : -1;
    })
    .filter(function (x) {
      return Number(x.contractInputsValues.amount) > 100e18;
    });
  window.txBuilderJson = txBuilderJson;
  console.log('txBuilderJson', txBuilderJson);*/

  return (
    <div>
      <Card title="" extra="w-full mb-2 md:col-span-1 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
        <h3 className="mb-2">
          <span className="text-bold text-xl">Cycle 2 (2024-05-18 → 2024-06-14)</span>
          <span className="ml-2 inline-block rounded-md bg-green-600 px-1 py-0.5 align-middle align-text-bottom font-mono text-xs text-white ring-1 ring-inset ring-green-700 transition-all duration-150 ease-in-out">
            distributed
          </span>
        </h3>

        <p className="mb-1 italic opacity-50">
          In this epoch, a constant amount of rewards is allocated to each day. Stakers do not earn lender or borrower
          rewards on top of their staker rewards anymore, and staker rewards are proportional to interest
          pending+realized in the lending terms during the stake. Lender rewards are proportional to the utilization in
          a market relative to other markets.
        </p>
        <p className="mb-1 italic opacity-50">
          As a lender, lend in the market with highest utilization percent to maximize your rewards.
        </p>
        <p className="mb-1 italic opacity-50">
          As a staker, stake on terms with highest interest paid by borrowers (and the fewest other stakers) to maximize
          your rewards.
        </p>
        <p className="italic opacity-50">
          10M GUILD Airdrop. 70% to Lenders, 10% to Borrowers, 17% to Stakers, 3% to Liquidators.
        </p>

        <table className="airdroptable w-full">
          <thead>
            <th className="text-left">User</th>
            <th className="text-right">Total rewards</th>
            <th className="text-right">Lender rewards</th>
            <th className="text-right">Staker rewards</th>
            <th className="text-right">Borrower rewards</th>
            <th></th>
          </thead>
          <tbody>
            {Object.keys(airdrop)
              .map((userAddress) => {
                return { userAddress, airdrop: airdrop[userAddress] };
              })
              .sort((a, b) => b.airdrop.total - a.airdrop.total)
              .filter((o) => o.airdrop.total > 100)
              .map((o) => [
                <tr>
                  <td className="font-mono">
                    {false ? (
                      <a target="_blank" href={getExplorerBaseUrl(appChainId) + '/address/' + o.userAddress}>
                        {o.userAddress}
                      </a>
                    ) : null}
                    <AddressBadge address={o.userAddress as any} appChainId={appChainId} noShortening={true} />
                  </td>
                  <td className="text-right font-mono" title={o.airdrop.total.toString()}>
                    {Math.floor(o.airdrop.total).toLocaleString()}
                    <Image
                      className="ml-2 inline-block align-top"
                      src="/img/crypto-logos/guild.png"
                      title="GUILD"
                      width={24}
                      height={24}
                      alt="logo"
                    />
                  </td>
                  <td
                    className={(o.airdrop.lenderTotal == 0 ? 'opacity-30 ' : '') + 'text-right font-mono'}
                    title={o.airdrop.lenderTotal.toString()}
                  >
                    {Math.floor(o.airdrop.lenderTotal).toLocaleString()}
                    <Image
                      className="ml-2 inline-block align-top"
                      src="/img/crypto-logos/guild.png"
                      title="GUILD"
                      width={24}
                      height={24}
                      alt="logo"
                    />
                  </td>
                  <td
                    className={(o.airdrop.stakerTotal == 0 ? 'opacity-30 ' : '') + 'text-right font-mono'}
                    title={o.airdrop.stakerTotal.toString()}
                  >
                    {Math.floor(o.airdrop.stakerTotal).toLocaleString()}
                    <Image
                      className="ml-2 inline-block align-top"
                      src="/img/crypto-logos/guild.png"
                      title="GUILD"
                      width={24}
                      height={24}
                      alt="logo"
                    />
                  </td>
                  <td
                    className={(o.airdrop.borrowerTotal == 0 ? 'opacity-30 ' : '') + 'text-right font-mono'}
                    title={o.airdrop.borrowerTotal.toString()}
                  >
                    {Math.floor(o.airdrop.borrowerTotal).toLocaleString()}
                    <Image
                      className="ml-2 inline-block align-top"
                      src="/img/crypto-logos/guild.png"
                      title="GUILD"
                      width={24}
                      height={24}
                      alt="logo"
                    />
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-700 dark:ring-navy-600"
                      onClick={() => {
                        userDetail == o.userAddress ? setUserDetail('') : setUserDetail(o.userAddress);
                      }}
                    >
                      Toggle Details
                    </button>
                  </td>
                </tr>,
                <tr className={userDetail == o.userAddress ? '' : 'hidden'}>
                  <td colSpan={6} className="rounded-lg bg-gray-100 px-2 py-2 dark:bg-navy-700">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th rowSpan={2} className="text-center">
                            Day
                          </th>
                          <th rowSpan={2} className="text-center">
                            GUILD
                          </th>
                          <th rowSpan={2} className="text-center">
                            Staker Rewards
                          </th>
                          {marketsConfig[appChainId].map((marketConfig) => {
                            const creditTokenSymbol =
                              'g' +
                              marketConfig.pegToken +
                              '-' +
                              (marketConfig.marketId > 999e6 ? 'test' : marketConfig.marketId);

                            return (
                              <th className="whitespace-nowrap text-center" colSpan={2}>
                                <Image
                                  src={marketConfig.logo}
                                  width={25}
                                  height={25}
                                  alt=""
                                  className="mr-1 inline-block"
                                />
                                {creditTokenSymbol}
                              </th>
                            );
                          })}
                        </tr>
                        <tr>
                          {marketsConfig[appChainId].map(() => [
                            <th className="px-2 py-1 text-center">L</th>,
                            <th className="px-2 py-1 text-center">B</th>
                          ])}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(data.userData[o.userAddress]?.dailyBalances || {}).map((date) => (
                          <tr>
                            <td className="px-2 py-1 text-center">{date}</td>
                            <td className="px-2 py-1 text-center">
                              {formatCurrencyValue(Math.floor(dailyUserAirdrops[o.userAddress][date]))}
                            </td>
                            <td
                              className={
                                'px-2 py-1 text-center' +
                                (Math.round(
                                  (10000 * dailyTotals[date].users[o.userAddress].stakePoints) /
                                    dailyTotals[date].stakePoints
                                )
                                  ? ''
                                  : ' opacity-30')
                              }
                            >
                              <TooltipHorizon
                                extra="dark:text-gray-200 w-[240px] font-mono"
                                content={
                                  <pre>
                                    {[
                                      'UserStake (GUILD) | DailyInterest (% User / Total Staked) | LendingTerm\n',
                                      Object.keys(data.termsData[date])
                                        .map((marketId) => {
                                          return Object.keys(data.termsData[date][marketId])
                                            .map((termAddress) => {
                                              return (
                                                [
                                                  (
                                                    Math.round(
                                                      100 *
                                                        data.termsData[date][marketId][termAddress].userStakes[
                                                          o.userAddress
                                                        ] || 0
                                                    ) / 100
                                                  )
                                                    .toString()
                                                    .padEnd(17, ' '),
                                                  ' | $',
                                                  (
                                                    Math.round(
                                                      100 * data.termsData[date][marketId][termAddress].interest24hUsd
                                                    ) / 100
                                                  )
                                                    .toString()
                                                    .padEnd(27, ' '),
                                                  ' (',
                                                  (
                                                    Math.round(
                                                      (10000 *
                                                        (data.termsData[date][marketId][termAddress].userStakes[
                                                          o.userAddress
                                                        ] || 0)) /
                                                        data.termsData[date][marketId][termAddress].totalStakes
                                                    ) / 100
                                                  )
                                                    .toString()
                                                    .padStart(5, ' '),
                                                  '%)',
                                                  ' | ',
                                                  data.termsData[date][marketId][termAddress].termName || 'UNKNOWN_TERM'
                                                ].join('') + '\n'
                                              );
                                            })
                                            .join('');
                                        })
                                        .join('')
                                    ].join('')}
                                    <div>
                                      Percent of interests attributable to user stake :{' '}
                                      {Math.round(
                                        (10000 * (dailyTotals[date].users[o.userAddress].stakePoints || 0)) /
                                          dailyTotals[date].stakePoints
                                      ) / 100}
                                      %
                                    </div>
                                    <div>
                                      Daily staker rewards : {Math.round(100 * dailyAirdrop * PERCENT_STAKERS) / 100}{' '}
                                      GUILD
                                    </div>
                                    <div>
                                      User rewards :{' '}
                                      {Math.round(
                                        (100 *
                                          dailyAirdrop *
                                          PERCENT_STAKERS *
                                          (dailyTotals[date].users[o.userAddress].stakePoints || 0)) /
                                          (dailyTotals[date].stakePoints || 1)
                                      ) / 100}{' '}
                                      GUILD
                                    </div>
                                  </pre>
                                }
                                trigger={
                                  <span>
                                    {Math.round(
                                      (10000 * dailyTotals[date].users[o.userAddress].stakePoints) /
                                        dailyTotals[date].stakePoints
                                    ) / 100}
                                    %
                                  </span>
                                }
                                placement="top"
                              />
                            </td>
                            {marketsConfig[appChainId].map((marketConfig) => {
                              const d =
                                data.userData[o.userAddress].dailyBalances[date][marketConfig.marketId] || ({} as any);
                              return [
                                <td
                                  className={
                                    'px-2 py-1 text-center' + (Math.floor(d.creditBalanceUsd) ? '' : ' opacity-30')
                                  }
                                  title={[
                                    'Lent: ',
                                    formatCurrencyValue(Math.floor(d.creditBalanceUsd) || 0),
                                    '\n',
                                    'Market Lent: ',
                                    formatCurrencyValue(
                                      dailyTotals[date].markets[marketConfig.marketId]?.creditBalanceUsd || 0
                                    ),
                                    '\n',
                                    'Percent of market: ',
                                    Math.round(
                                      (10000 * d.creditBalanceUsd) /
                                        dailyTotals[date].markets[marketConfig.marketId]?.creditBalanceUsd || 0
                                    ) / 100,
                                    '%\n',
                                    'Daily market borrows: ',
                                    formatCurrencyValue(data.marketUtilizationUsd[date][marketConfig.marketId]),
                                    '\n',
                                    'Daily total borrows: ',
                                    formatCurrencyValue(dailyTotals[date].borrowBalanceUsd),
                                    '\n',
                                    'Daily market % of rewards: ',
                                    Math.round(
                                      (10000 * data.marketUtilizationUsd[date][marketConfig.marketId]) /
                                        dailyTotals[date].borrowBalanceUsd
                                    ) / 100,
                                    '%\n',
                                    'Daily lenders rewards: ',
                                    Math.round(100 * dailyAirdrop * PERCENT_LENDERS) / 100,
                                    '\n',
                                    'Daily user rewards: ',
                                    Math.round(
                                      100 *
                                        dailyAirdrop *
                                        PERCENT_LENDERS *
                                        (data.marketUtilizationUsd[date][marketConfig.marketId] /
                                          dailyTotals[date].borrowBalanceUsd) *
                                        (d.creditBalanceUsd /
                                          (dailyTotals[date].markets[marketConfig.marketId]?.creditBalanceUsd || 1))
                                    ) / 100
                                  ].join('')}
                                >
                                  {formatCurrencyValue(Math.floor(d.creditBalanceUsd) || 0)}
                                </td>,
                                <td
                                  className={
                                    'px-2 py-1 text-center' + (Math.floor(d.borrowBalanceUsd) ? '' : ' opacity-30')
                                  }
                                  title={[
                                    'Daily user borrows: ',
                                    formatCurrencyValue(Math.floor(d.borrowBalanceUsd) || 0),
                                    '\n',
                                    'Daily total borrows: ',
                                    formatCurrencyValue(dailyTotals[date].borrowBalanceUsd),
                                    '\n',
                                    'Daily borrowers rewards: ',
                                    Math.round(100 * dailyAirdrop * PERCENT_BORROWERS) / 100,
                                    '\n',
                                    'Daily user rewards: ',
                                    Math.round(
                                      (100 * dailyAirdrop * PERCENT_BORROWERS * (Math.floor(d.borrowBalanceUsd) || 0)) /
                                        (dailyTotals[date].borrowBalanceUsd || 1)
                                    ) / 100
                                  ].join('')}
                                >
                                  {formatCurrencyValue(Math.floor(d.borrowBalanceUsd) || 0)}
                                </td>
                              ];
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ])}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default AirdropCycle2;
