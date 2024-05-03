'use client';

import React, { useEffect } from 'react';
import ImageWithFallback from 'components/image/ImageWithFallback';
import Image from 'next/image';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { toLocaleString } from 'utils/numbers';
import { secondsToAppropriateUnit } from 'utils/date';
import { LendingTerms } from 'types/lending';
import Progress from 'components/progress';
import { TooltipHorizon, QuestionMarkIcon } from 'components/tooltip';
import { CreditABI, GuildABI, ProfitManagerABI, TermABI } from 'lib/contracts';
import { readContracts } from '@wagmi/core';
import { formatDecimal, formatCurrencyValue } from 'utils/numbers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';
import { Abi, formatUnits, Address } from 'viem';
import { useReadContracts } from 'wagmi';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore } from 'store';
import { MdChevronLeft, MdChevronRight, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { generateTermName } from 'utils/strings';
import { getPegTokenLogo } from 'config';

export default function StakeLendingTermsTable(props: { tableData: LendingTerms[]; showFilters?: boolean }) {
  const { appChainId, appMarketId, contractsList, coinDetails, creditMultiplier } = useAppStore();
  const { tableData } = props;
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const creditMultiplierNumber = Number(formatUnits(creditMultiplier, 18));
  const pegTokenSymbol = pegToken?.symbol;
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken?.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);
  const tableDataWithAdditionalInfo = tableData.map((term) => {
    const collateralAddress = term.collateral.address.toLowerCase();
    const collateralToken = coinDetails.find((item) => item.address.toLowerCase() === collateralAddress);
    const ltv = (term.borrowRatio * pegToken?.price) / (collateralToken.price || 1);
    const debtCeilling = term.debtCeiling;
    const utilization = debtCeilling
      ? term.currentDebt > debtCeilling
        ? 100
        : (term.currentDebt / debtCeilling) * 100
      : 0;
    const annualInterest = term.issuance * term.interestRate * pegToken.price * creditMultiplierNumber;
    const guildPerCredit = term.gaugeWeight / (annualInterest || 0.00000000000001);

    return {
      ...term,
      annualInterest,
      guildPerCredit,
      utilization,
      ltv
    };
  });
  const [showNoDebtCeilingTerms, setShowNoDebtCeilingTerms] = React.useState<boolean>(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const columnHelper = createColumnHelper<LendingTerms>();
  const [data, setData] = React.useState<LendingTerms[]>(tableDataWithAdditionalInfo);
  const [filteredData, setFilteredData] = React.useState<LendingTerms[]>(
    tableDataWithAdditionalInfo.filter((_) => _.debtCeiling > 0)
  );

  const router = useRouter();

  useEffect(() => {
    setFilteredData(
      (data || []).filter(function (term: any) {
        if (showNoDebtCeilingTerms || !props.showFilters) {
          return true;
        }
        return term.debtCeiling != 0;
      })
    );
  }, [showNoDebtCeilingTerms, data]);

  /* eslint-disable */
  const columns = [
    columnHelper.accessor('collateral.symbol', {
      id: 'collateral',
      enableSorting: true,
      sortingFn: 'alphanumeric',
      header: () => (
        <a href="#" className="block pl-5 text-left text-sm font-medium text-gray-500 dark:text-white">
          Lending Term
        </a>
      ),
      cell: (info: any) => (
        <div className="ml-3 flex items-center gap-2 text-center">
          <ImageWithFallback
            src={info.row.original.collateral.logo}
            fallbackSrc="/img/crypto-logos/unk.png"
            width={32}
            height={32}
            alt={'logo'}
          />
          <p className="text-sm font-bold text-gray-700 dark:text-white">
            {generateTermName(
              info.row.original.collateral.symbol,
              info.row.original.interestRate,
              info.row.original.borrowRatio
            )}
          </p>
        </div>
      )
    }),
    columnHelper.accessor('ltv', {
      id: 'ltv',
      enableSorting: true,
      header: () => (
        <a href="#" className="text-center text-sm font-medium text-gray-500 dark:text-white">
          LTV
        </a>
      ),
      cell: (info: any) => {
        const collateralAddress = info.row.original.collateral.address.toLowerCase();
        const collateralToken = coinDetails.find((item) => item.address.toLowerCase() === collateralAddress);

        return (
          <TooltipHorizon
            extra=""
            content={
              <div className="text-gray-700 dark:text-white">
                <p>
                  Borrow Ratio: <span className="font-semibold">{info.row.original.borrowRatio}</span>
                </p>
                <p>
                  Current {collateralToken.symbol} price:{' $'}
                  <span className="font-semibold">{formatDecimal(collateralToken.price, 2)}</span>
                  <i>&nbsp;(DefiLlama)</i>
                </p>
                <p>
                  Current {pegToken?.symbol} price:{' $'}
                  <span className="font-semibold">{formatDecimal(pegToken?.price, 2)}</span>
                  <i>&nbsp;(DefiLlama)</i>
                </p>
                <p>
                  <br />
                  <i>
                    Price info & LTV provided on this front-end for information only.
                    <br />
                    The set of lending terms and liquidation thresholds are not based
                    <br />
                    on real-time price feeds in the Ethereum Credit Guild.
                  </i>
                </p>
              </div>
            }
            trigger={
              <div className="text-center text-sm font-bold text-gray-700 dark:text-white">
                {info.getValue() ? formatDecimal(100 * info.getValue(), 1) : '-.--'}%
              </div>
            }
            placement="top"
          />
        );
      }
    }),
    columnHelper.accessor('utilization', {
      id: 'utilization',
      enableSorting: true,
      header: () => (
        <a href="#" className="text-center text-sm font-medium text-gray-500 dark:text-white">
          Utilization
        </a>
      ),
      cell: (info: any) => {
        const getColor = (value) => {
          if (value >= 95) return 'text-red-700 dark:text-red-700';
          if (value >= 70) return 'text-orange-700 dark:text-orange-700';
          return 'text-green-700 dark:text-green-700';
        };

        return (
          <div className={`text-center text-sm font-bold ${getColor(info.row.original.utilization)}`}>
            {info.row.original.utilization == 100 ? '≥' : ''}
            {formatDecimal(info.row.original.utilization, 1)} %
          </div>
        );
      }
    }),

    columnHelper.accessor('gaugeWeight', {
      id: 'gaugeWeight',
      enableSorting: true,
      header: () => (
        <a href="#" className="block pl-5 text-left text-sm font-medium text-gray-500 dark:text-white">
          GUILD staked
        </a>
      ),
      cell: (info: any) => (
        <div className="text-left text-sm font-bold">
          <Image src="/img/crypto-logos/guild.png" width={22} height={22} alt={''} className="mr-1 inline-block" />
          {formatCurrencyValue(info.row.original.gaugeWeight)}
        </div>
      )
    }),

    columnHelper.accessor('termSurplusBuffer', {
      id: 'termSurplusBuffer',
      enableSorting: true,
      header: () => (
        <a href="#" className="block pl-5 text-left text-sm font-medium text-gray-500 dark:text-white">
          First-loss capital
        </a>
      ),
      cell: (info: any) => (
        <div className="text-left text-sm font-bold">
          <Image src={pegTokenLogo} width={22} height={22} alt={''} className="mr-1 inline-block" />
          {formatCurrencyValue(info.row.original.termSurplusBuffer * creditMultiplierNumber)}
          <span className="text-xs font-medium text-gray-500" style={{ paddingLeft: '6px' }}>
            ≈ $ {formatCurrencyValue(info.row.original.termSurplusBuffer * creditMultiplierNumber * pegToken?.price)}
          </span>
        </div>
      )
    }),

    columnHelper.accessor('guildPerCredit', {
      id: 'guildPerCredit',
      enableSorting: true,
      header: () => (
        <a href="#" className="block pl-5 text-left text-sm font-medium text-gray-500 dark:text-white">
          Stake / Interest
        </a>
      ),
      cell: (info: any) => (
        <TooltipHorizon
          extra=""
          content={
            <div className="text-gray-700 dark:text-white">
              <p>
                Borrowed:{' '}
                <span className="font-semibold">
                  {formatDecimal(info.row.original.issuance * creditMultiplierNumber, pegTokenDecimalsToDisplay)}
                </span>{' '}
                {pegTokenSymbol}
              </p>
              <p>
                APR: <span className="font-semibold">{formatDecimal(100 * info.row.original.interestRate, 2)} %</span>
              </p>
              <p>
                Current {pegTokenSymbol} price:{' $'}
                <span className="font-semibold">{formatDecimal(pegToken.price, 2)}</span>
                <i>&nbsp;(DefiLlama)</i>
              </p>
              <p>
                Annual interests paid by borrowers:{' $'}
                <span className="font-semibold">{formatDecimal(info.row.original.annualInterest, 2)}</span>
              </p>
              <p>
                GUILD staked: <span className="font-semibold">{formatDecimal(info.row.original.gaugeWeight, 0)}</span>
              </p>
              <p>
                GUILD staked per $ of yearly interest paid by borrowers:{' '}
                <span className="font-semibold">
                  {info.row.original.guildPerCredit > 10e9
                    ? '∞'
                    : formatCurrencyValue(info.row.original.guildPerCredit)}
                </span>
              </p>
              <p className="mt-2">
                <i>
                  A lower value implies higher yield for your stake,
                  <br />
                  but the term might be more risky.
                  <br />
                  Define your staking strategy accordingly :-)
                </i>
              </p>
            </div>
          }
          trigger={
            <div className="text-left text-sm font-bold">
              {info.row.original.guildPerCredit > 10e9 ? '∞' : formatCurrencyValue(info.row.original.guildPerCredit)}
            </div>
          }
          placement="top"
        />
      )
    }),

    {
      id: 'action',
      header: () => <></>,
      enableSorting: false,
      cell: (info) => (
        <div className="text-center font-medium text-gray-600 dark:text-white">
          <Link href={`/stake/details?term=${info.row.original.address}`}>
            <button
              type="button"
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-700 dark:ring-navy-600"
            >
              Details
            </button>
          </Link>
        </div>
      )
    }
  ];
  /* eslint-enable */

  const table = useReactTable({
    data: filteredData || data,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false
  });

  return (
    <>
      <div className="mt-4 overflow-auto">
        {props.showFilters ? (
          <div style={{ position: 'absolute', right: '1em', top: '1em' }}>
            {showNoDebtCeilingTerms ? (
              <button
                onClick={() => setShowNoDebtCeilingTerms(false)}
                type="button"
                className="mr-2 inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm text-stone-600 shadow-sm transition-all duration-150 ease-in-out hover:bg-brand-100/30 hover:text-stone-800 dark:bg-navy-700 dark:text-stone-200 dark:hover:bg-navy-600"
              >
                <span className="hidden lg:block">Show terms with 0 Debt Ceiling</span>
                <MdVisibility className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <button
                onClick={() => setShowNoDebtCeilingTerms(true)}
                type="button"
                className="mr-2 inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm text-stone-600 shadow-sm transition-all duration-150 ease-in-out hover:bg-brand-100/30 hover:text-stone-800 dark:bg-navy-700 dark:text-stone-200 dark:hover:bg-navy-600"
              >
                <span className="hidden lg:block">Hide terms with 0 Debt Ceiling</span>
                <MdVisibilityOff className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : null}
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="!border-px !border-gray-400 ">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pt-4 text-start dark:border-gray-400"
                    >
                      <div className="relative whitespace-nowrap text-center">
                        {header.column.columnDef.enableSorting && (
                          <span
                            className="absolute left-0 inline-block text-sm text-gray-400"
                            style={{ top: '50%', marginTop: '-7px', height: '14px;' }}
                          >
                            {{
                              asc: <FaSortDown />,
                              desc: <FaSortUp />,
                              null: <FaSort />
                            }[header.column.getIsSorted() as string] ?? <FaSort />}
                          </span>
                        )}
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table
              .getRowModel()
              .rows.slice(0, 20)
              .map((row) => {
                return (
                  <tr
                    onClick={() => router.push(`/stake/details?term=${row.original.address}`)}
                    key={row.id}
                    className="border-b border-gray-100 transition-all duration-200 ease-in-out last:border-none hover:cursor-pointer hover:bg-stone-100/80 dark:border-gray-500 dark:hover:bg-navy-700"
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <td key={cell.id} className="relative min-w-[150px] border-white/0 py-5">
                          {cell.column.id != 'usage' && cell.column.id != 'maxDelayBetweenPartialRepay' ? (
                            <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <nav
        className="flex w-full items-center justify-between border-t border-gray-200 px-2 py-3 text-gray-400"
        aria-label="Pagination"
      >
        <div className="hidden sm:block">
          <p className="text-sm ">
            Showing page <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span> of{' '}
            <span className="font-semibold">{table.getPageCount()}</span>
          </p>
        </div>
        <div className="flex flex-1 justify-between sm:justify-end">
          <button
            onClick={() => table.previousPage()}
            className="relative inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
            disabled={!table.getCanPreviousPage()}
          >
            <MdChevronLeft />
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            className="relative ml-3 inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
            disabled={!table.getCanNextPage()}
          >
            Next
            <MdChevronRight />
          </button>
        </div>
      </nav>
    </>
  );
}
