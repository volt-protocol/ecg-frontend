'use client';

import React, { useEffect } from 'react';
import ImageWithFallback from 'components/image/ImageWithFallback';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
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
import { formatDecimal } from 'utils/numbers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';
import { Abi, formatUnits, Address } from 'viem';
import { useReadContracts } from 'wagmi';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore } from 'store';

export default function LendingTermsTable(props: { tableData: LendingTerms[] }) {
  const { appChainId, appMarketId, contractsList, coinDetails } = useAppStore();
  const { tableData } = props;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const columnHelper = createColumnHelper<LendingTerms>();
  const [data, setData] = React.useState<LendingTerms[]>([]);

  const router = useRouter();

  useEffect(() => {
    setData([...tableData]);
  }, [tableData]);

  /* Smart contract reads */
  const {
    data: contractData,
    isError,
    isLoading,
    refetch
  } = useReadContracts({
    contracts: [
      {
        address: contractsList?.marketContracts[appMarketId].creditAddress,
        abi: CreditABI,
        functionName: 'totalSupply',
        args: [],
        chainId: appChainId
      },
      {
        address: contractsList?.marketContracts[appMarketId].profitManagerAddress,
        abi: ProfitManagerABI as Abi,
        functionName: 'creditMultiplier',
        chainId: appChainId
      }
    ],
    query: {
      select: (contractData) => {
        return {
          creditTotalSupply: Number(formatUnits(contractData[0].result as bigint, 18)),
          creditMultiplier: Number(formatUnits(contractData[1].result as bigint, 18))
        };
      }
    }
  });
  /* End Smart contract reads */

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const pegTokenSymbol = pegToken?.symbol;
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);

  useEffect(() => {
    async function fetchDataForTerms() {
      const enrichedTableData = await Promise.all(
        tableData.map(async (term) => {
          const extraData = await getExtraTermData(term);
          // Add these values to your term
          return {
            ...term,
            gaugeWeight: Number(formatUnits(extraData[0].result, 18)),
            totalWeight: Number(formatUnits(extraData[1].result, 18)),
            creditTotalSupply: contractData.creditTotalSupply,
            currentDebt: Number(formatUnits(extraData[2].result, 18)),
            debtCeiling: Number(formatUnits(extraData[3].result, 18))
          };
        })
      );
      setData(enrichedTableData);
    }
    tableData && contractData && fetchDataForTerms();
  }, [tableData, contractData]);

  async function getExtraTermData(term: LendingTerms): Promise<any> {
    const result = await readContracts(wagmiConfig, {
      contracts: [
        {
          address: contractsList.guildAddress,
          abi: GuildABI,
          functionName: 'getGaugeWeight',
          args: [term.address], // Assuming each term has a unique contractAddress
          chainId: appChainId as any
        },
        {
          address: contractsList.guildAddress,
          abi: GuildABI,
          functionName: 'totalTypeWeight',
          args: [appMarketId],
          chainId: appChainId as any
        },
        {
          address: term.address as Address,
          abi: TermABI as Abi,
          functionName: 'issuance',
          chainId: appChainId as any
        },
        {
          address: term.address as Address,
          abi: TermABI as Abi,
          functionName: 'debtCeiling',
          chainId: appChainId as any
        }
      ]
    });

    return result;
  }

  /* eslint-disable */
  const columns = [
    columnHelper.accessor('collateral.symbol', {
      id: 'collateral',
      enableSorting: true,
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
            src={info.row.original.collateral.logo}
            fallbackSrc="/img/crypto-logos/unk.png"
            width={32}
            height={32}
            alt={'logo'}
          />
          <p className="text-sm font-bold text-gray-700 dark:text-white">{info.getValue()}</p>
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
        const collateralAddress = info.row.original.collateral.address.toLowerCase();
        const collateralToken = coinDetails.find((item) => item.address.toLowerCase() === collateralAddress);
        const priceRatio = pegToken.price / (collateralToken.price || 1);
        const decimalsToDisplay = Math.max(Math.ceil(Math.log10(priceRatio * 100)), 0);
        const ltv = (info.row.original.borrowRatio * pegToken.price) / (collateralToken.price || 1);

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
                    Current {pegToken.symbol} price:{' $'}
                    <span className="font-semibold">{pegToken.price}</span>
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
                      LTV detail : {formatDecimal(info.getValue() / contractData?.creditMultiplier, decimalsToDisplay)}{' '}
                      * {pegToken.price || '?'} / {collateralToken.price || '?'} = {ltv ? formatDecimal(ltv, 3) : '?'}
                    </i>
                  </p>
                </div>
              }
              trigger={
                <div className="ml-3 text-center">
                  <p className="text-sm font-bold text-gray-700 dark:text-white">
                    {formatDecimal(info.getValue() / contractData?.creditMultiplier, decimalsToDisplay)}
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

        return (
          <div>
            <TooltipHorizon
              extra=""
              content={
                <div className="text-gray-700 dark:text-white">
                  <p>
                    Debt Ceiling:{' '}
                    <span className="font-semibold">
                      {formatDecimal(debtCeilling * contractData?.creditMultiplier, pegTokenDecimalsToDisplay)}
                    </span>{' '}
                    <span className="text-sm font-medium text-gray-600 dark:text-white">{pegTokenSymbol}</span>
                  </p>
                  <p>
                    Current Debt:{' '}
                    <span className="font-semibold">
                      {' '}
                      {formatDecimal(
                        info.row.original.currentDebt * contractData?.creditMultiplier,
                        pegTokenDecimalsToDisplay
                      )}
                    </span>{' '}
                    <span className="text-sm font-medium text-gray-600 dark:text-white">{pegTokenSymbol}</span>
                  </p>
                  <p>
                    Available Debt:{' '}
                    <span className="font-semibold">
                      {' '}
                      {formatDecimal(
                        debtCeilling - info.row.original.currentDebt > 0
                          ? (debtCeilling - info.row.original.currentDebt) * contractData?.creditMultiplier
                          : 0,
                        pegTokenDecimalsToDisplay
                      )}
                    </span>{' '}
                    <span className="text-sm font-medium text-gray-600 dark:text-white">{pegTokenSymbol}</span>
                  </p>
                </div>
              }
              trigger={
                <div className="flex items-center justify-center gap-1">
                  <Progress
                    useColors={true}
                    width="w-[110px]"
                    value={
                      debtCeilling
                        ? info.row.original.currentDebt > debtCeilling
                          ? 100
                          : (info.row.original.currentDebt / debtCeilling) * 100
                        : 0
                    }
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
    },

    columnHelper.accessor('currentDebt', {
      id: 'currentDebt',
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="ml-8 text-center text-sm font-medium text-gray-500 dark:text-white">Current Debt</p>
          </a>
        </div>
      ),
      cell: (info) => (
        <div className="flex items-center justify-center gap-1">
          <p className="ml-3 text-center text-sm font-bold text-gray-600 dark:text-white">
            {formatDecimal(info.getValue() * contractData?.creditMultiplier, pegTokenDecimalsToDisplay)}
          </p>
          <span className="text-sm font-medium text-gray-600 dark:text-white">{pegTokenSymbol}</span>
        </div>
      )
    }),

    columnHelper.accessor('openingFee', {
      id: 'openingFee',
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="ml-8 text-center text-sm font-medium text-gray-500 dark:text-white">Opening Fee</p>
          </a>
        </div>
      ),
      cell: (info) => (
        <p className="ml-3 text-center text-sm font-bold text-gray-600 dark:text-white">
          {formatDecimal(info.getValue() * 100, 2)}%
        </p>
      )
    }),

    columnHelper.accessor('maxDelayBetweenPartialRepay', {
      id: 'maxDelayBetweenPartialRepay',
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="ml-8 text-center text-sm font-medium text-gray-500 dark:text-white">Periodic Payments</p>
          </a>
        </div>
      ),
      cell: (info) => (
        <div className="ml-3 text-center text-sm font-bold text-gray-600 dark:text-white">
          {info.getValue() != 0 ? (
            <div className="flex items-center justify-center gap-1">
              Yes{' '}
              <TooltipHorizon
                extra=""
                content={
                  <div className="text-gray-700 dark:text-white">
                    <p>
                      Periodic Payment minimum size :{' '}
                      <span className="font-semibold">
                        {formatDecimal(info.row.original.minPartialRepayPercent, 4)}%
                      </span>
                    </p>
                    <p>
                      Periodic Payment maximum interval :{' '}
                      <span className="font-semibold">
                        {secondsToAppropriateUnit(info.row.original.maxDelayBetweenPartialRepay)}
                      </span>
                    </p>
                    <p>
                      <br />
                      <i>As a borrower, if you miss Periodic Payments, your loan will be called.</i>
                    </p>
                  </div>
                }
                trigger={
                  <div className="">
                    <QuestionMarkIcon />
                  </div>
                }
                placement="right"
              />
            </div>
          ) : (
            'No'
          )}
        </div>
      )
    }),
    {
      id: 'action',
      header: () => <></>,
      enableSorting: false,
      cell: (info) => (
        <div className="text-center font-medium text-gray-600 dark:text-white">
          <Link href={`/lending/details?term=${info.row.original.address}`}>
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
    data,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true
  });

  return (
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
                            asc: <FaSortDown />,
                            desc: <FaSortUp />,
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
          {table
            .getRowModel()
            .rows.slice(0, 20)
            .map((row) => {
              return (
                <tr
                  onClick={() => router.push(`/lending/details?term=${row.original.address}`)}
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
  );
}
