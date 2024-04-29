'use client';

import { useAccount } from 'wagmi';
import { useAppStore } from 'store';
import { useEffect, useState } from 'react';
import Card from 'components/card';
import { getUserLevel, getUserLoans } from './helper';
import UserLoans from './components/UserLoans';
import Spinner from 'components/spinner';
import { useSearchParams } from 'next/navigation';
import { isAddress, Address } from 'viem';
import CreditSaving from './components/CreditSaving';
import { MdCached, MdFilterAlt, MdVerified } from 'react-icons/md';
import clsx from 'clsx';
import { fromNow } from 'utils/date';
import VotingPower from './components/VotingPower';
import LastVotes from './components/LastVotes';
import { VoteLogs, getAllVotes } from 'lib/logs/votes';
import { getPublicClient } from '@wagmi/core';
import Image from 'next/image';
import LastMintEvents from './components/LastMintEvents';
import { MintRedeemLogs, getAllMintRedeemLogs } from 'lib/logs/mint-redeem';
import { shortenAddress, underscoreToString } from 'utils/strings';
import Disconnected from 'components/error/disconnected';
import { LoansObj } from 'types/lending';
import { wagmiConfig } from 'contexts/Web3Provider';
import UserStakes from './components/UserStakes';

const UserDashboard = () => {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const {
    appChainId,
    appMarketId,
    coinDetails,
    lendingTerms,
    addUserLoans,
    userData,
    addLastVotes,
    addLastMints,
    contractsList,
    loans
  } = useAppStore();
  const [userLoansData, setUserLoansData] = useState<LoansObj[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>();
  const [loadingLoans, setLoadingLoans] = useState<boolean>(true);
  const [userAddress, setUserAddress] = useState<Address>();
  const [filterActiveLoans, setFilterActiveLoans] = useState<boolean>(false);
  const [filterCloseLoans, setFilterCloseLoans] = useState<boolean>(false);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(true);
  const [lastVotes, setLastVotes] = useState<VoteLogs[]>([]);
  const [lastMints, setLastMints] = useState<MintRedeemLogs[]>([]);
  const [currentBlock, setCurrentBlock] = useState<BigInt>();

  useEffect(() => {
    const search = searchParams.get('search');
    search != '' && isAddress(search) ? setUserAddress(search as Address) : setUserAddress(address);
  }, [searchParams, address]);

  useEffect(() => {
    const asyncFunc = async () => {
      setLoadingLoans(true);
      setLoadingRecent(true);
      await getLoans(false);
      await getRecentHistory(false);
    };
    lendingTerms && userAddress && asyncFunc();
  }, [userAddress]);

  /* Read contracts */

  /* End Read Contract data  */

  /* Get Dashboard data */
  const getLoans = async (useCache: boolean) => {
    let fetchedLoans = [];

    const existingUserData = userData.find((user) => user.address == userAddress);
    //check if user loan are already stored and lastUpdated is less than 2 hours
    if (
      useCache &&
      existingUserData &&
      existingUserData.loans &&
      existingUserData.lastUpdated > Date.now() - 1000 * 60 * 120
    ) {
      const data = userData.find((user) => user.address == userAddress);
      fetchedLoans = data.loans;
      setLastUpdated(data.lastUpdated);
    } else {
      for (const term of lendingTerms) {
        const data = await getUserLoans(loans, term.address as Address, userAddress);
        fetchedLoans.push(...data);
      }

      //save user loan in store
      addUserLoans(userAddress, fetchedLoans);
      setLastUpdated(Date.now());
    }

    setUserLoansData(fetchedLoans);
    setLoadingLoans(false);
  };

  const getRecentHistory = async (useCache: boolean) => {
    let lastVotes = [];
    let lastMints = [];

    const currentBlockData = await getPublicClient(wagmiConfig).getBlockNumber();
    setCurrentBlock(currentBlockData);

    const existingUserData = userData.find((user) => user.address == userAddress);
    //check if user loan are already stored and lastUpdated is less than 2 hours
    if (
      useCache &&
      existingUserData &&
      existingUserData.lastVotes &&
      existingUserData.lastMints &&
      existingUserData.lastUpdated > Date.now() - 1000 * 60 * 120
    ) {
      const data = userData.find((user) => user.address == userAddress);
      lastVotes = data.lastVotes;
      lastMints = data.lastMints;
      setLastUpdated(data.lastUpdated);
    } else {
      //get last votes
      lastVotes = await getAllVotes(contractsList, userAddress);
      addLastVotes(userAddress, lastVotes);

      //get last mints
      lastMints = await getAllMintRedeemLogs(appMarketId, contractsList, coinDetails, userAddress);
      addLastMints(userAddress, lastMints);
    }

    setLastVotes(lastVotes);
    setLastMints(lastMints);

    setLoadingRecent(false);
  };

  const updateUserDashboard = async () => {
    setLoadingLoans(true);
    setLoadingRecent(true);
    //refecth user loans
    await getLoans(false);
    await getRecentHistory(false);
  };

  /* End get dashboard data */

  if (!isConnected) {
    return <Disconnected />;
  }

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between md:space-x-5">
        <div className="mb-4 flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="relative">
              {loadingLoans || loadingRecent ? (
                <div className="h-16 w-16 animate-pulse rounded-full bg-stone-200" />
              ) : (
                <Image
                  className="h-16 w-16 rounded-full"
                  src={`/img/avatars/${getUserLevel(userLoansData, lastMints, lastVotes)}.png`}
                  alt=""
                  width={100}
                  height={100}
                />
              )}
              <span className="absolute inset-0 rounded-full shadow-inner" aria-hidden="true" />
            </div>
          </div>
          <div className="pt-1.5">
            <p className="break-words text-xl font-semibold text-stone-700 dark:text-stone-100 sm:text-xl">
              {shortenAddress(userAddress)}
            </p>
            <div className="text-md flex items-center gap-1 font-medium text-stone-500">
              {loadingLoans || loadingRecent ? (
                <div className="h-5 w-36 animate-pulse rounded-md bg-stone-200" />
              ) : (
                <>
                  <MdVerified className="inline-block h-6 w-6 text-green-500" />
                  <span className="text-stone-700 dark:text-stone-200">
                    {underscoreToString(getUserLevel(userLoansData, lastMints, lastVotes))}
                  </span>{' '}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-1 text-xs font-light text-stone-400 dark:text-stone-100">
          <span>Data updated</span>
          <span className="font-medium text-stone-500 dark:text-stone-50">
            {lastUpdated ? fromNow(lastUpdated) : '-'}
          </span>
          {/* TODO: update data on demand */}
          <a className="cursor-pointer text-stone-400 dark:text-stone-100" onClick={updateUserDashboard}>
            <MdCached className={clsx('h-3 w-3', false && 'animate-spin')} />
          </a>
        </div>
      </div>

      <div className="my-3 grid grid-cols-1 gap-5">
        <Card
          title="Loans"
          extra="w-full min-h-[300px] md:col-span-2 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
          rightText={
            <span className="isolate inline-flex rounded-md shadow-sm">
              <div className="relative inline-flex items-center gap-x-1.5 rounded-l-md bg-white px-3 py-2 text-sm font-medium text-stone-500 ring-1 ring-inset ring-stone-200 focus:z-10 dark:bg-navy-700 dark:ring-navy-700">
                <MdFilterAlt />
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterActiveLoans(!filterActiveLoans);
                  setFilterCloseLoans(false);
                }}
                className={clsx(
                  filterActiveLoans
                    ? 'bg-brand-500 text-white hover:bg-brand-400'
                    : 'bg-white text-stone-700  hover:bg-stone-50 dark:bg-navy-700 dark:text-stone-300 dark:hover:bg-navy-600',
                  'relative -ml-px inline-flex items-center gap-x-1.5  px-3 py-2 text-sm font-medium  ring-1 ring-inset ring-stone-200 focus:z-10 dark:ring-navy-700'
                )}
              >
                <span>Active</span>
                <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-500">
                  {userLoansData && userLoansData.filter((loan) => loan.closeTime == 0).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterCloseLoans(!filterCloseLoans);
                  setFilterActiveLoans(false);
                }}
                className={clsx(
                  filterCloseLoans
                    ? 'bg-brand-500 text-white hover:bg-brand-400'
                    : 'bg-white text-stone-700  hover:bg-stone-50 dark:bg-navy-700 dark:text-stone-300 dark:hover:bg-navy-600',
                  'relative -ml-px inline-flex items-center gap-x-1.5  rounded-r-md px-3 py-2 text-sm font-medium ring-1 ring-inset ring-stone-200 focus:z-10 dark:ring-navy-700'
                )}
              >
                <span>Close</span>
                <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-500">
                  {userLoansData && userLoansData.filter((loan) => loan.closeTime != 0).length}
                </span>
              </button>
            </span>
          }
        >
          {loadingLoans ? (
            <div className="mt-20 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <UserLoans
              userAddress={userAddress}
              data={userLoansData.filter((loan) => {
                if (filterActiveLoans) {
                  return loan.closeTime == 0;
                } else if (filterCloseLoans) {
                  return loan.closeTime != 0;
                } else {
                  return loan;
                }
              })}
            />
          )}
        </Card>
      </div>
      <div className="my-3 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card title="Your stakes" extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
          <UserStakes />
        </Card>
        <Card title="Voting Power" extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
          <VotingPower userAddress={userAddress} />
        </Card>
      </div>
      <div className="my-3 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card title="Last Mints & Redeems" extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
          {loadingRecent ? (
            <div className="mt-20 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <LastMintEvents userAddress={userAddress} data={lastMints} currentBlock={currentBlock} />
          )}
        </Card>
        <Card title="Last Votes" extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
          {loadingRecent ? (
            <div className="mt-20 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <LastVotes userAddress={userAddress} data={lastVotes} currentBlock={currentBlock} />
          )}
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;
