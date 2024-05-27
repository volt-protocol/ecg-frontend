'use client';

import React, { useEffect, useState } from 'react';
import Card from 'components/card';
import StakeLendingTermsTable from './components/StakeLendingTermsTable';
import { fromNow } from 'utils/date';
import { MdCached } from 'react-icons/md';
import clsx from 'clsx';
import { useAppStore, useUserPrefsStore } from 'store';

const Lending = () => {
  const { appMarketId, appChainId } = useUserPrefsStore();
  const { lendingTerms, lastUpdatedTerms, fetchLendingTerms } = useAppStore();

  if (!lendingTerms) return <LendingSkeleton />;

  return (
    <div>
      <div className="mt-3 flex justify-end">
        <div className="flex items-center gap-1 text-xs font-light text-gray-400 dark:text-gray-100">
          <span>Data updated</span>
          <span className="font-medium text-gray-500 dark:text-gray-50">
            {lastUpdatedTerms ? fromNow(lastUpdatedTerms) : '-'}
          </span>
          <a
            className="cursor-pointer text-gray-400 dark:text-gray-100"
            onClick={() => fetchLendingTerms(appMarketId, appChainId)}
          >
            <MdCached className={clsx('h-3 w-3', false && 'animate-spin')} />
          </a>
        </div>
      </div>

      <div className="mt-3">
        <Card title="Currently Active Lending Terms" extra="w-full h-full sm:overflow-auto px-6 py-4">
          <StakeLendingTermsTable showFilters={true} tableData={lendingTerms.filter((_) => _.status == 'live')} />
        </Card>
      </div>
      {lendingTerms.filter((loan) => loan.status == 'deprecated').length != 0 && (
        <div className="mt-6">
          <Card title="Deprecated Lending Terms" extra="w-full h-full sm:overflow-auto px-6 py-4">
            <StakeLendingTermsTable tableData={lendingTerms.filter((_) => _.status == 'deprecated')} />
          </Card>
        </div>
      )}
    </div>
  );
};

const LendingSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="mt-3">
        <div className="h-72 w-full animate-pulse rounded-md bg-gray-200/60 dark:bg-navy-900"></div>
      </div>
      <div className="mt-3">
        <div className="h-72 w-full animate-pulse rounded-md bg-gray-200/60 dark:bg-navy-900"></div>
      </div>
    </div>
  );
};

export default Lending;
