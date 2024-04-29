import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState
} from '@tanstack/react-table';
import { formatDecimal } from 'utils/numbers';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useAppStore } from 'store';
import ImageWithFallback from 'components/image/ImageWithFallback';
import { getPegTokenLogo } from 'config';
import { LendingTerms } from 'types/lending';
import { QuestionMarkIcon, TooltipHorizon } from 'components/tooltip';
import { Address, formatUnits } from 'viem';
import Progress from 'components/progress';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GuildABI } from 'lib/contracts';
import { multicall } from '@wagmi/core';
import { wagmiConfig } from 'contexts/Web3Provider';

interface UserStake {
  collateralSymbol: string;
  collateralAddress: string;
  collateralLogo: string;
  termAddress: string;
  userStake: number;
  debtCeiling: number;
  currentDebt: number;
  interestRate: number;
  borrowRatio: number;
}

export default function UserStakes() {
  const { address } = useAccount();
  const { appMarketId, coinDetails, contractsList, lendingTerms, appChainId, creditMultiplier } = useAppStore();
  const columnHelper = createColumnHelper<UserStake>();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [userStakes, setUserStakes] = useState<UserStake[]>([]);
  const router = useRouter();

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken?.price * 100)), 0);

  useEffect(() => {
    const fetchUserStakes = async () => {
      if (lendingTerms.length == 0) {
        setUserStakes([]);
        return;
      }
      const stakes: UserStake[] = [];

      const contractCalls = [];

      for (const term of lendingTerms.filter((_) => _.debtCeiling > 0)) {
        contractCalls.push({
          address: contractsList.guildAddress,
          abi: GuildABI,
          functionName: 'getUserGaugeWeight',
          args: [address, term.address]
        });
      }

      // console.log(`fetchUserStakes: multicall for ${contractCalls.length} gauges`);
      // @ts-ignore
      const userStakesData = await multicall(wagmiConfig, {
        chainId: appChainId as any,
        contracts: contractCalls
      });

      // re read in the same order
      let cursor = 0;
      for (const term of lendingTerms.filter((_) => _.debtCeiling > 0)) {
        const userGaugeWeightNorm = Number(formatUnits(userStakesData[cursor++].result as bigint, 18));
        stakes.push({
          collateralAddress: term.collateral.address,
          collateralSymbol: term.collateral.symbol,
          debtCeiling: term.debtCeiling,
          currentDebt: term.currentDebt,
          termAddress: term.address,
          userStake: userGaugeWeightNorm,
          collateralLogo: term.collateral.logo,
          borrowRatio: term.borrowRatio,
          interestRate: term.interestRate
        });
      }

      setUserStakes(stakes);
      setSorting([
        {
          id: 'userStake',
          desc: true
        }
      ]);
    };

    fetchUserStakes();
  }, []);

  if (!lendingTerms) {
    return <UserStakeSkeleton />;
  }

  /* eslint-disable */
  const columns = [
    columnHelper.accessor('collateralSymbol', {
      id: 'collateralSymbol',
      enableSorting: true,
      sortingFn: 'alphanumeric',
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Collateral Token</p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="ml-3 flex items-center gap-2 text-center">
          <ImageWithFallback
            src={info.row.original.collateralLogo}
            fallbackSrc="/img/crypto-logos/unk.png"
            width={32}
            height={32}
            alt={'logo'}
          />
          <p className="text-sm font-bold text-gray-700 dark:text-white">{info.getValue()}</p>
        </div>
      )
    }),
    columnHelper.accessor('userStake', {
      id: 'userStake',
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="ml-8 text-center text-sm font-medium text-gray-500 dark:text-white">Your stake</p>
          </a>
        </div>
      ),
      cell: (info) => (
        <div className="flex items-center justify-center gap-1">
          <p className="ml-3 text-center text-sm font-bold text-gray-600 dark:text-white">
            {formatDecimal(info.row.original.userStake, 2)}
          </p>
          <span className="text-sm font-medium text-gray-600 dark:text-white">GUILD</span>
        </div>
      )
    }),
    columnHelper.accessor('interestRate', {
      id: 'interestRate',
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="ml-3 text-center text-sm font-medium text-gray-500 dark:text-white">Interest Rate</p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="ml-3 text-center">
          <p className="text-sm font-bold text-gray-700 dark:text-white">{(info.getValue() * 100).toFixed(2)}%</p>
        </div>
      )
    }),
    columnHelper.accessor('borrowRatio', {
      id: 'borrowRatio',
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="ml-3 text-center text-sm font-medium text-gray-500 dark:text-white">Borrow Ratio</p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const collateralAddress = info.row.original.collateralAddress.toLowerCase();
        const collateralToken = coinDetails.find((item) => item.address.toLowerCase() === collateralAddress);
        const priceRatio = pegToken?.price / (collateralToken.price || 1);
        const decimalsToDisplay = Math.max(Math.ceil(Math.log10(priceRatio * 100)), 0);
        const ltv = (info.row.original.borrowRatio * pegToken?.price) / (collateralToken.price || 1);

        return (
          <div>
            <TooltipHorizon
              extra=""
              content={
                <div className="text-gray-700 dark:text-white">
                  <p>
                    LTV (Loan-to-Value):{' '}
                    <span className="font-semibold">
                      {collateralToken.price ? formatDecimal(100 * ltv, 1) : '-.--'}
                      {'%'}
                    </span>
                  </p>
                  <p>
                    <br />
                    Current {collateralToken.symbol} price:{' $'}
                    <span className="font-semibold">{collateralToken.price}</span>
                    <i>&nbsp;(DefiLlama)</i>
                  </p>
                  <p>
                    Current {pegToken?.symbol} price:{' $'}
                    <span className="font-semibold">{pegToken?.price}</span>
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
                    <br />
                    <i>
                      LTV detail :{' '}
                      {formatDecimal(info.getValue() / Number(formatUnits(creditMultiplier, 18)), decimalsToDisplay)} *{' '}
                      {pegToken?.price || '?'} / {collateralToken.price || '?'} = {ltv ? formatDecimal(ltv, 3) : '?'}
                    </i>
                  </p>
                </div>
              }
              trigger={
                <div className="ml-3 text-center">
                  <p className="text-sm font-bold text-gray-700 dark:text-white">
                    {formatDecimal(info.getValue() / Number(formatUnits(creditMultiplier, 18)), decimalsToDisplay)}
                  </p>
                </div>
              }
              placement="top"
            />
          </div>
        );
      }
    }),
    {
      id: 'usage',
      header: () => <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Utilization</p>,
      cell: (info: any) => {
        const debtCeilling = info.row.original.debtCeiling;
        const currentDebt = info.row.original.currentDebt;
        const creditMultiplierNorm = Number(formatUnits(creditMultiplier, 18));

        return (
          <div>
            <TooltipHorizon
              extra=""
              content={
                <div className="text-gray-700 dark:text-white">
                  <p>
                    Debt Ceiling:{' '}
                    <span className="font-semibold">
                      {formatDecimal(debtCeilling * creditMultiplierNorm, pegTokenDecimalsToDisplay)}
                    </span>{' '}
                    <span className="text-sm font-medium text-gray-600 dark:text-white">{pegToken.symbol}</span>
                  </p>
                  <p>
                    Current Debt:{' '}
                    <span className="font-semibold">
                      {' '}
                      {formatDecimal(currentDebt * creditMultiplierNorm, pegTokenDecimalsToDisplay)}
                    </span>{' '}
                    <span className="text-sm font-medium text-gray-600 dark:text-white">{pegToken.symbol}</span>
                  </p>
                  <p>
                    Available Debt:{' '}
                    <span className="font-semibold">
                      {' '}
                      {formatDecimal(
                        debtCeilling - currentDebt > 0 ? (debtCeilling - currentDebt) * creditMultiplierNorm : 0,
                        pegTokenDecimalsToDisplay
                      )}
                    </span>{' '}
                    <span className="text-sm font-medium text-gray-600 dark:text-white">{pegToken.symbol}</span>
                  </p>
                </div>
              }
              trigger={
                <div className="flex items-center justify-center gap-1">
                  <Progress
                    useColors={true}
                    width="w-[110px]"
                    value={debtCeilling ? (currentDebt > debtCeilling ? 100 : (currentDebt / debtCeilling) * 100) : 0}
                    max={debtCeilling}
                  />
                  <div className="ml-1">
                    <QuestionMarkIcon />
                  </div>
                </div>
              }
              placement="top"
            />
          </div>
        );
      }
    }
  ];
  /* eslint-enable */

  const table = useReactTable({
    data: userStakes,
    columns,
    state: {
      sorting
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 5
      }
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
                      <div className="flex items-center justify-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.columnDef.enableSorting && (
                          <span className="text-sm text-gray-400">
                            {{
                              asc: <FaSortUp />,
                              desc: <FaSortDown />,
                              null: <FaSort />
                            }[header.column.getIsSorted() as string] ?? <FaSort />}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              return (
                <tr
                  onClick={() => router.push(`/lending/details?term=${row.original.termAddress}`)}
                  key={row.id}
                  className="border-b border-gray-100 transition-all duration-200 ease-in-out last:border-none hover:cursor-pointer hover:bg-stone-100/80 dark:border-gray-500 dark:hover:bg-navy-700"
                >
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td key={cell.id} className="relative min-w-[150px] border-white/0 py-5">
                        <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>
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

const UserStakeSkeleton = () => {
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
