'use client';

import React, { useEffect, useState } from 'react';
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
import { AuctionHouseABI, CreditABI } from 'lib/contracts';
import { waitForTransactionReceipt, writeContract, readContract } from '@wagmi/core';
import { formatDecimal, toLocaleString } from 'utils/numbers';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';
import { formatUnits, parseUnits, Address } from 'viem';
import moment from 'moment';
import { MdChevronLeft, MdChevronRight, MdOpenInNew, MdShowChart } from 'react-icons/md';
import { getPegTokenLogo } from 'config';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { Step } from 'components/stepLoader/stepType';
import StepModal from 'components/stepLoader';
import { toastError } from 'components/toast';
import { useAccount } from 'wagmi';
import { wagmiConfig } from 'contexts/Web3Provider';
import { ConnectWeb3Button } from 'components/button/ConnectWeb3Button';
import { TransactionBadge } from 'components/badge/TransactionBadge';
import { ItemIdBadge } from 'components/badge/ItemIdBadge';
import { useAppStore } from 'store';
import { shortenUint } from 'utils/strings';
import { Auction, AuctionHouse } from '../../../../store/slices/auctions';
import { getExplorerBaseUrl } from 'config';
import { approvalStepsFlow } from 'utils/approvalHelper';

export default function AuctionsTable({
  auctions,
  auctionHouses,
  setOpenAuction,
  setReload
}: {
  auctions: Auction[];
  auctionHouses: AuctionHouse[];
  setOpenAuction: (arg: Auction) => void;
  setReload: (arg: boolean) => void;
}) {
  const { appMarketId, appChainId, coinDetails, contractsList, lendingTerms, fetchAuctionsUntilBlock } = useAppStore();
  const { address, isConnected } = useAccount();
  const columnHelper = createColumnHelper<Auction>();
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = React.useState<Auction[]>([]);

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const creditAddress = contractsList?.marketContracts[appMarketId]?.creditAddress;
  const creditTokenSymbol = 'g' + pegToken?.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);
  const creditTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken?.price * 100)), 0);

  /* Create Modal Steps */
  const createSteps = (): Step[] => {
    return [{ name: 'Bid', status: 'Not Started' }];
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());
  /* End Create Modal Steps */

  const updateStepStatus = (stepName: string, status: Step['status']) => {
    setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
  };

  useEffect(() => {
    setData([...auctions]);
  }, [auctions]);

  const getActionButton = (auction: Auction) => {
    if (!isConnected) {
      return (
        <>
          <ConnectWeb3Button />
        </>
      );
    }

    const collateralToken = coinDetails.find(
      (item) => item.address.toLowerCase() === auction.collateralTokenAddress.toLowerCase()
    );
    const collateralTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(collateralToken.price * 100)), 0);
    const lendingTerm = lendingTerms.find(
      (item) => item.address.toLowerCase() == auction.lendingTermAddress.toLowerCase()
    );
    const debtRecoveredPegToken =
      Number(formatUnits(BigInt(auction.debtRecovered), 18)) * (Number(auction.callCreditMultiplier) / 1e18);

    if (auction.status == 'closed') {
      return (
        <div className="flex flex-col items-center gap-1">
          <p className="flex items-center justify-center gap-1 text-sm text-gray-700 dark:text-white">
            Collateral Sold:
            <ImageWithFallback
              src={lendingTerm.collateral.logo}
              fallbackSrc="/img/crypto-logos/unk.png"
              width={20}
              height={20}
              alt={'logo'}
            />{' '}
            <span className="font-semibold">
              {formatDecimal(
                Number(formatUnits(BigInt(auction.collateralSold), collateralToken.decimals)),
                collateralTokenDecimalsToDisplay
              )}
            </span>
          </p>
          <p className="flex items-center justify-center gap-1 text-sm text-gray-700 dark:text-white">
            Debt Recovered: <Image src={pegTokenLogo} width={20} height={20} alt={'logo'} />{' '}
            <span className="font-semibold">{formatDecimal(debtRecoveredPegToken, creditTokenDecimalsToDisplay)}</span>
          </p>
        </div>
      );
    }

    const auctionHouse = auctionHouses.find(
      (item) => item.address.toLowerCase() == auction.auctionHouseAddress.toLowerCase()
    );
    const auctionEnd = auction.startTime + auctionHouse.duration * 1000;

    if (Date.now() > auctionEnd) {
      return <ButtonPrimary variant="xs" title="Forgive" onClick={() => forgive(auctionHouse, auction)} extra="mt-1" />;
    } else {
      return <ButtonPrimary variant="xs" title="Bid" onClick={() => bid(auctionHouse, auction)} extra="mt-1" />;
    }
  };

  /* Smart contract writes */
  const bid = async (auctionHouse: AuctionHouse, auction: Auction): Promise<void> => {
    const loanId: string = auction.loanId;
    setShowModal(true);

    const checkStepName = `Check ${creditTokenSymbol} allowance`;
    const approveStepName = `Approve ${creditTokenSymbol}`;
    //Init Steps
    setSteps([
      { name: checkStepName, status: 'Not Started' },
      { name: approveStepName, status: 'Not Started' },
      {
        name: 'Bid for loan ' + shortenUint(loanId),
        status: 'Not Started'
      }
    ]);

    try {
      const approvalSuccess = await approvalStepsFlow(
        address,
        auction.lendingTermAddress,
        creditAddress,
        BigInt(auction.callDebt),
        appChainId,
        updateStepStatus,
        checkStepName,
        approveStepName,
        wagmiConfig
      );

      if (!approvalSuccess) {
        updateStepStatus(approveStepName, 'Error');
        return;
      }
    } catch (e) {
      console.log(e);
      updateStepStatus(approveStepName, 'Error');
      return;
    }

    try {
      updateStepStatus('Bid for loan ' + shortenUint(loanId), 'In Progress');
      const hash = await writeContract(wagmiConfig, {
        address: auctionHouse.address,
        abi: AuctionHouseABI,
        functionName: 'bid',
        args: [loanId]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Bid for loan ' + shortenUint(loanId), 'Error');
        return;
      }
      updateStepStatus('Bid for loan ' + shortenUint(loanId), 'Waiting for confirmation...');
      const minedBlock = tx.blockNumber;
      await fetchAuctionsUntilBlock(minedBlock, appMarketId, appChainId);

      updateStepStatus('Bid for loan ' + shortenUint(loanId), 'Success');
      setTimeout(function () {
        setReload(true);
      }, 3000);
    } catch (e: any) {
      console.log(e);
      updateStepStatus('Bid for loan ' + shortenUint(loanId), 'Error');
      toastError(e.shortMessage);
      setShowModal(false);
    }
  };

  const forgive = async (auctionHouse: AuctionHouse, auction: Auction): Promise<void> => {
    const loanId: string = auction.loanId;
    //Init Steps
    setSteps([
      {
        name: 'Forgive for loan  ' + shortenUint(loanId),
        status: 'Not Started'
      }
    ]);

    try {
      setShowModal(true);
      updateStepStatus('Forgive for loan  ' + shortenUint(loanId), 'In Progress');
      const hash = await writeContract(wagmiConfig, {
        address: auctionHouse.address,
        abi: AuctionHouseABI,
        functionName: 'forgive',
        args: [loanId]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Forgive for loan  ' + shortenUint(loanId), 'Error');
        return;
      }

      updateStepStatus('Forgive for loan  ' + shortenUint(loanId), 'Success');
      setTimeout(function () {
        setReload(true);
      }, 3000);
    } catch (e: any) {
      console.log(e);
      updateStepStatus('Forgive for loan  ' + shortenUint(loanId), 'Error');
      toastError(e.shortMessage);
      setShowModal(false);
    }
  };

  /* eslint-disable */
  const columns = [
    columnHelper.accessor('loanId', {
      id: 'loanId',
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Loan ID</p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="flex items-center justify-center gap-1">
          <div className="ml-3">
            <ItemIdBadge id={info.getValue()} />
          </div>
        </div>
      )
    }),
    columnHelper.accessor('collateralTokenAddress', {
      id: 'collateralTokenAddress',
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="ml-3 text-center text-sm font-medium text-gray-500 dark:text-white">Collateral Token</p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const collateralToken = coinDetails.find(
          (item) => item.address.toLowerCase() === info.getValue().toLowerCase()
        );

        return (
          <a
            className="flex items-center justify-center gap-1 pl-2 text-sm font-bold text-gray-600 hover:text-brand-500 dark:text-white"
            target="__blank"
            href={`${getExplorerBaseUrl(appChainId)}/address/${collateralToken.address}`}
          >
            {collateralToken.symbol}
            <MdOpenInNew />
          </a>
        );
      }
    }),
    columnHelper.accessor('collateralAmount', {
      id: 'collateralAmount',
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Collateral Amount</p>
          </a>
        </div>
      ),
      cell: (info) => {
        const collateralToken = coinDetails.find(
          (item) => item.address.toLowerCase() === info.row.original.collateralTokenAddress.toLowerCase()
        );
        const collateralTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(collateralToken.price * 100)), 0);
        const lendingTerm = lendingTerms.find(
          (item) => item.address.toLowerCase() == info.row.original.lendingTermAddress.toLowerCase()
        );

        return (
          <>
            <div className="flex items-center justify-center gap-1">
              <ImageWithFallback
                src={lendingTerm.collateral.logo}
                fallbackSrc="/img/crypto-logos/unk.png"
                width={20}
                height={20}
                alt={'logo'}
              />{' '}
              <span
                className="text-
              center text-sm font-semibold text-gray-700 dark:text-white"
              >
                {formatDecimal(
                  Number(formatUnits(BigInt(info.getValue()), collateralToken.decimals)),
                  collateralTokenDecimalsToDisplay
                )}
              </span>
            </div>
            <div className="text-center text-sm text-gray-400 dark:text-white">
              ≈ ${' '}
              {formatDecimal(
                Number(formatUnits(BigInt(info.getValue()), collateralToken.decimals)) * collateralToken.price,
                2
              )}
            </div>
          </>
        );
      }
    }),
    columnHelper.accessor('callDebt', {
      id: 'callDebt',
      enableSorting: true,
      header: () => (
        <div className="text-center">
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Call Debt</p>
          </a>
        </div>
      ),
      cell: (info) => {
        const callDebtPegToken =
          (Number(info.getValue()) / 1e18) * (Number(info.row.original.callCreditMultiplier) / 1e18);
        return (
          <>
            <div className="flex justify-center gap-1">
              <Image src={pegTokenLogo} width={20} height={20} alt={'logo'} />{' '}
              <p className="text-sm font-semibold text-gray-700 dark:text-white">
                {formatDecimal(callDebtPegToken, creditTokenDecimalsToDisplay)}
              </p>
            </div>
            <div className="text-center text-sm text-gray-400 dark:text-white">
              ≈ $ {formatDecimal(callDebtPegToken * pegToken?.price, 2)}
            </div>
          </>
        );
      }
    }),
    {
      id: 'chart',
      header: (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Auction Profile</p>
          </a>
        </div>
      ),
      enableSorting: false,
      cell: (info: any) => {
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => setOpenAuction(info.row.original)}
              type="button"
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-600 dark:text-gray-200 dark:ring-navy-500 dark:hover:ring-navy-300"
            >
              <div className="inline-flex items-center justify-center gap-1">
                Show Chart
                <MdShowChart />
              </div>
            </button>
          </div>
        );
      }
    },
    columnHelper.accessor('startTime', {
      id: 'startTime',
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Start</p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="flex flex-col items-center justify-center gap-1">
          <p className="text-center text-sm text-gray-700 dark:text-white">
            {moment.unix(Number(info.getValue()) / 1000).format('YYYY-MM-DD')}
            <br />
            {moment.unix(Number(info.getValue()) / 1000).format('HH:mm:ss')}
          </p>
        </div>
      )
    }),

    columnHelper.accessor('endTime', {
      id: 'endTime',
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Status</p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const auction = info.row.original;
        const auctionHouse = auctionHouses.find(
          (item) => item.address.toLowerCase() == auction.auctionHouseAddress.toLowerCase()
        );
        const auctionEnd = auction.startTime + auctionHouse.duration * 1000;

        return (
          <div className="flex items-center justify-center gap-1">
            <div className="text-center text-sm text-gray-700 dark:text-white">
              {!info.getValue() ? (
                Date.now() > auctionEnd ? (
                  <span className="inline-flex items-center gap-x-1.5 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-500">
                    Expired
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-x-1.5 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-500">
                    <svg className="h-1.5 w-1.5 animate-pulse fill-green-500" viewBox="0 0 6 6" aria-hidden="true">
                      <circle cx={3} cy={3} r={3} />
                    </svg>
                    Active
                  </span>
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <a
                    className="items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-500"
                    href={getExplorerBaseUrl(appChainId) + '/tx/' + info.row.original.bidTxHash}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Closed <MdOpenInNew className="inline" />
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      }
    }),
    {
      id: 'action',
      header: () => <></>,
      enableSorting: false,
      cell: (info: any) => {
        return <div className="flex items-center justify-center gap-1">{getActionButton(info.row.original)}</div>;
      }
    }
  ];
  /* eslint-enable */

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
    initialState: {
      pagination: {
        pageSize: 15
      },
      sorting: [
        {
          id: 'startTime',
          desc: true
        }
      ]
    }
  });

  if (auctions.length === 0)
    return (
      <div className="my-10 flex justify-center">
        <p className="text-stone-400 dark:text-gray-100">No auctions found</p>
      </div>
    );

  /*return (
    <div>
      <pre>auctionHouses: {JSON.stringify(auctionHouses, null, 2)}</pre>
      <pre>auctions: {JSON.stringify(auctions, null, 2)}</pre>
    </div>
  );*/

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
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
