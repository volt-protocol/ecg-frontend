'use client';

import React, { useState } from 'react';
import Card from 'components/card';
import { useAccount } from 'wagmi';
import { default as cycleAirdropData } from './data/cycle1.json';
import Image from 'next/image';
import { getExplorerBaseUrl } from 'config';
import { useAppStore, useUserPrefsStore } from 'store';
import { AddressBadge } from 'components/badge/AddressBadge';
import { marketsConfig, getPegTokenLogo } from 'config';
import { formatCurrencyValue } from 'utils/numbers';

interface UserDailyData {
  [userAddress: string]: DailyData;
}

interface DailyData {
  userAddress: string;
  dailyBalances: { [dayIso: string]: DayBalance };
}

interface DayBalance {
  [marketId: string]: MarketBalance;
}

interface MarketBalance {
  creditBalanceUsd: number;
  stakedBalanceUsd: number;
  borrowBalanceUsd: number;
}

function Airdrop() {
  const { address, isConnected } = useAccount();
  const { appMarketId, appChainId } = useUserPrefsStore();
  const [userDetail, setUserDetail] = useState('');

  const data = cycleAirdropData as UserDailyData;

  const AIRDROP_SIZE = 10_000_000;
  const PERCENT_LENDERS = 0.6; // 60%
  const PERCENT_BORROWERS = 0.2; // 20%
  const PERCENT_STAKERS = 0.15; // 15%

  const excludedAddresses = [
    '0x0000000000000000000000000000000000000000', // zero addr
    '0x1A1075cef632624153176CCf19Ae0175953CF010', // team msig
    '0x9722bec2524b4b4e37df3acd24f1431f66c62706', // Market 1 (USDC) ProfitManager
    '0x5D87B2f530e9C1E605EeE48e41c10534B7E29C78', // Market 3 (WETH) ProfitManager
    '0x7181e377b259d7c8d4cafdfe9fbe103dc5bfce45', // Market 4 (ARB) ProfitManager
    '0xb94aaae7472a694dd959c8497b2f09730391dc52', // Market 1 (USDC) SGM
    '0x55aB4C8a5f11f8E62d7822d5AEd778784DF12aFD', // Market 3 (WETH) SGM
    '0x6995aa07b177918423d2127b885b67e7a3cec265' // Market 4 (ARB) SGM
  ].map((_) => _.toLowerCase());

  const dailyTotals: {
    [dayKey: string]: MarketBalance & {
      users: {
        [userAddress: string]: MarketBalance;
      };
    };
  } = {};

  for (const userAddress in data) {
    // skip excluded addresses
    if (excludedAddresses.includes(userAddress.toLowerCase())) continue;
    for (const date in data[userAddress].dailyBalances) {
      for (const market in data[userAddress].dailyBalances[date]) {
        // global values
        // init object if empty
        if (!dailyTotals[date]) {
          dailyTotals[date] = {
            creditBalanceUsd: 0,
            stakedBalanceUsd: 0,
            borrowBalanceUsd: 0,
            users: {}
          };
        }
        if (!dailyTotals[date].users[userAddress]) {
          dailyTotals[date].users[userAddress] = {
            creditBalanceUsd: 0,
            stakedBalanceUsd: 0,
            borrowBalanceUsd: 0
          };
        }
        // register values in daily totals
        dailyTotals[date].creditBalanceUsd += data[userAddress].dailyBalances[date][market].creditBalanceUsd;
        dailyTotals[date].stakedBalanceUsd += data[userAddress].dailyBalances[date][market].stakedBalanceUsd;
        dailyTotals[date].borrowBalanceUsd += data[userAddress].dailyBalances[date][market].borrowBalanceUsd;
        dailyTotals[date].users[userAddress].creditBalanceUsd +=
          data[userAddress].dailyBalances[date][market].creditBalanceUsd;
        dailyTotals[date].users[userAddress].stakedBalanceUsd +=
          data[userAddress].dailyBalances[date][market].stakedBalanceUsd;
        dailyTotals[date].users[userAddress].borrowBalanceUsd +=
          data[userAddress].dailyBalances[date][market].borrowBalanceUsd;
      }
    }
  }

  // users who have more credit + staked than borrows are considered "lenders"
  // the staked amount of "lenders" count towards the total of lending
  for (const dayKey in dailyTotals) {
    for (const userAddress in dailyTotals[dayKey].users) {
      const userData = dailyTotals[dayKey].users[userAddress];
      const type =
        userData.creditBalanceUsd + userData.stakedBalanceUsd > userData.borrowBalanceUsd ? 'lender' : 'borrower';
      if (type === 'lender') {
        dailyTotals[dayKey].users[userAddress].creditBalanceUsd += userData.stakedBalanceUsd;
        dailyTotals[dayKey].creditBalanceUsd += userData.stakedBalanceUsd;
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
      dailyUserAirdrop +=
        (dailyAirdrop * PERCENT_LENDERS * userData.creditBalanceUsd) / dailyTotals[dayKey].creditBalanceUsd;
      dailyUserAirdrop +=
        (dailyAirdrop * PERCENT_STAKERS * userData.stakedBalanceUsd) / dailyTotals[dayKey].stakedBalanceUsd;
      dailyUserAirdrop +=
        (dailyAirdrop * PERCENT_BORROWERS * userData.borrowBalanceUsd) / dailyTotals[dayKey].borrowBalanceUsd;
      airdrop[userAddress].lenderTotal +=
        (dailyAirdrop * PERCENT_LENDERS * userData.creditBalanceUsd) / dailyTotals[dayKey].creditBalanceUsd;
      airdrop[userAddress].stakerTotal +=
        (dailyAirdrop * PERCENT_STAKERS * userData.stakedBalanceUsd) / dailyTotals[dayKey].stakedBalanceUsd;
      airdrop[userAddress].borrowerTotal +=
        (dailyAirdrop * PERCENT_BORROWERS * userData.borrowBalanceUsd) / dailyTotals[dayKey].borrowBalanceUsd;
      dailyUserAirdrops[userAddress][dayKey] = dailyUserAirdrop;
      airdrop[userAddress].total += dailyUserAirdrop;
    }
  }

  return (
    <div>
      <Card title="" extra="w-full mb-2 md:col-span-1 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
        <h3 className="mb-2">
          <span className="text-bold text-xl">Cycle 2 (2024-05-17 → 2024-06-17)</span>
          <span className="ml-2 inline-block rounded-md bg-gray-100 px-1 py-0.5 align-middle align-text-bottom font-mono text-xs text-gray-700 ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out">
            in progress
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
      </Card>
      <Card title="" extra="w-full min-h-[300px] md:col-span-1 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
        <h3 className="mb-2">
          <span className="text-bold text-xl">Cycle 1 (2024-04-20 → 2024-05-17)</span>
          <span className="ml-2 inline-block rounded-md bg-green-600 px-1 py-0.5 align-middle align-text-bottom font-mono text-xs text-white ring-1 ring-inset ring-green-700 transition-all duration-150 ease-in-out">
            distributed
          </span>
        </h3>

        <p className="mb-1 italic opacity-50">
          In this epoch, a constant amount of rewards is allocated to each day. Stakers who have more (lend + stake)
          than borrow on any given day are considered "lenders" for this day, and earn the lender rewards for this day,
          on top of the staker rewards.
        </p>
        <p className="mb-2 italic opacity-50">
          10M GUILD Airdrop. 60% to Lenders, 20% to Borrowers, 15% to Stakers, 5% to Liquidators.
        </p>

        <table className="w-full">
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
                          <th rowSpan={2} className="text-left">
                            Day
                          </th>
                          <th rowSpan={2} className="text-left">
                            GUILD
                          </th>
                          {marketsConfig[appChainId].map((marketConfig) => {
                            const creditTokenSymbol =
                              'g' +
                              marketConfig.pegToken +
                              '-' +
                              (marketConfig.marketId > 999e6 ? 'test' : marketConfig.marketId);

                            return (
                              <th className="whitespace-nowrap text-center" colSpan={3}>
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
                            <th className="px-2 py-1 text-left">L</th>,
                            <th className="px-2 py-1 text-left">S</th>,
                            <th className="px-2 py-1 text-left">B</th>
                          ])}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(data[o.userAddress].dailyBalances).map((date) => (
                          <tr>
                            <td className="px-2 py-1 text-left">{date}</td>
                            <td className="px-2 py-1 text-left">
                              {formatCurrencyValue(Math.floor(dailyUserAirdrops[o.userAddress][date]))}
                            </td>
                            {marketsConfig[appChainId].map((marketConfig) => {
                              const d =
                                data[o.userAddress].dailyBalances[date]['market_' + marketConfig.marketId] ||
                                ({} as any);
                              return [
                                <td
                                  className={
                                    'px-2 py-1 text-left' + (Math.floor(d.creditBalanceUsd) ? '' : ' opacity-30')
                                  }
                                >
                                  {formatCurrencyValue(Math.floor(d.creditBalanceUsd) || 0)}
                                </td>,
                                <td
                                  className={
                                    'px-2 py-1 text-left' + (Math.floor(d.stakedBalanceUsd) ? '' : ' opacity-30')
                                  }
                                >
                                  {formatCurrencyValue(Math.floor(d.stakedBalanceUsd) || 0)}
                                </td>,
                                <td
                                  className={
                                    'px-2 py-1 text-left' + (Math.floor(d.borrowBalanceUsd) ? '' : ' opacity-30')
                                  }
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

export default Airdrop;
