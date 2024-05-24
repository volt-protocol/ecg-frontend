import React, { useEffect, useState } from 'react';
import { getPublicClient, waitForTransactionReceipt, writeContract, readContracts, multicall } from '@wagmi/core';
import { toastError } from 'components/toast';
import { GuildABI, OffboardGovernorGuildABI, termContract } from 'lib/contracts';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { Step } from 'components/stepLoader/stepType';
import StepModal from 'components/stepLoader';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  getPaginationRowModel
} from '@tanstack/react-table';
import { MdChevronLeft, MdChevronRight, MdOpenInNew } from 'react-icons/md';
import Spinner from 'components/spinner';
import DropdownSelect from 'components/select/DropdownSelect';
import { useAppStore } from 'store';
import { LendingTerms } from 'types/lending';
import { generateTermName } from 'utils/strings';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { useReadContracts } from 'wagmi';
import { formatCurrencyValue, formatDecimal, toLocaleString } from 'utils/numbers';
import { ActiveOffboardingPolls } from 'types/governance';
import Progress from 'components/progress';
import { fromNow } from 'utils/date';
import moment from 'moment';
import { formatUnits, Address } from 'viem';
import { QuestionMarkIcon, TooltipHorizon } from 'components/tooltip';
import { isActivePoll } from './helper';
import { wagmiConfig } from 'contexts/Web3Provider';
import { getExplorerBaseUrl, getL1BlockNumber } from 'config';

function OffboardTerm({ guildVotingWeight }: { guildVotingWeight: bigint }) {
  const {
    appChainId,
    lendingTerms,
    contractsList,
    fetchLendingTermsUntilBlock,
    appMarketId,
    offboardQuorum,
    offboardDurationBlock,
    deprecatedGauges
  } = useAppStore();
  const [selectedTerm, setSelectedTerm] = useState<LendingTerms>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [activeOffboardingPolls, setActiveOffboardingPolls] = useState<ActiveOffboardingPolls[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const data = {
    quorum: Number(formatUnits(offboardQuorum, 18)),
    pollDurationBlock: Number(offboardDurationBlock),
    deprecatedTerms: deprecatedGauges
  };

  useEffect(() => {
    fetchActiveOffboardingPolls();
  }, []);

  /* Getters */
  const fetchActiveOffboardingPolls = async () => {
    setLoading(true);
    const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber();

    const l1Block = await getL1BlockNumber(appChainId);
    //logs are returned from oldest to newest
    const logs = await getPublicClient(wagmiConfig).getLogs({
      address: contractsList.lendingTermOffboardingAddress as Address,
      event: {
        type: 'event',
        name: 'OffboardSupport',
        inputs: [
          { type: 'uint256', indexed: true, name: 'timestamp' },
          { type: 'address', indexed: true, name: 'term' },
          { type: 'uint256', indexed: true, name: 'snapshotBlock' },
          { type: 'address', indexed: false, name: 'user' },
          { type: 'uint256', indexed: false, name: 'userWeight' }
        ]
      },
      fromBlock: BigInt(0),
      toBlock: currentBlock
    });

    const activePolls = await Promise.all(
      logs
        // .filter((log) => log.args.term === selectedTerm.address)
        .map((log) => {
          return {
            term: log.args.term as Address,
            timestamp: Number(log.args.timestamp),
            userWeight: log.args.userWeight as bigint,
            snapshotBlock: Number(log.args.snapshotBlock),
            currentBlock: Number(l1Block),
            user: log.args.user as Address
          };
        })
        .filter(function (log) {
          const isMarketTerm =
            lendingTerms.find((term) => term.address.toLowerCase() === log.term.toLowerCase()) != null;
          return isMarketTerm;
        })
        .reduce((acc, item) => {
          const existing = acc.find((i) => i.snapshotBlock === item.snapshotBlock && i.term === item.term);
          if (existing) {
            existing.userWeight += item.userWeight;
          } else {
            acc.push({ ...item });
          }
          return acc;
        }, [] as ActiveOffboardingPolls[])
        .map(async (item) => {
          const termInfo = await multicall(wagmiConfig, {
            chainId: appChainId as any,
            contracts: [
              {
                ...termContract(item.term as Address),
                functionName: 'issuance'
              },
              {
                address: contractsList.lendingTermOffboardingAddress,
                abi: OffboardGovernorGuildABI,
                functionName: 'canOffboard',
                args: [item.term as Address]
              }
            ]
          });

          return {
            ...item,
            issuance: Number(formatUnits(termInfo[0].result as bigint, 18)),
            canOffboard: termInfo[1].result
          };
        })
    );

    setLoading(false);
    setActiveOffboardingPolls(activePolls);
  };
  /* End Getters*/

  /* Smart Contract Writes */
  const proposeOffboard = async (address: string): Promise<void> => {
    //Init Steps
    setSteps(createSteps());

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Propose Offboarding', 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.lendingTermOffboardingAddress,
        abi: OffboardGovernorGuildABI,
        functionName: 'proposeOffboard',
        args: [address]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Propose Offboarding', 'Error');
        return;
      }

      updateStepStatus('Propose Offboarding', 'Success');
      await fetchActiveOffboardingPolls();
    } catch (e: any) {
      console.log(e);
      updateStepStatus('Propose Offboarding', 'Error');
      toastError(e.shortMessage);
    }
  };

  const supportOffboard = async (snapshotBlock: number, term: Address): Promise<void> => {
    //Init Steps
    setSteps([{ name: 'Support Offboarding', status: 'Not Started' }]);

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Support Offboarding', 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.lendingTermOffboardingAddress,
        abi: OffboardGovernorGuildABI,
        functionName: 'supportOffboard',
        args: [snapshotBlock, term]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Support Offboarding', 'Error');
        return;
      }

      updateStepStatus('Support Offboarding', 'Success');
      await fetchActiveOffboardingPolls();
    } catch (e: any) {
      updateStepStatus('Support Offboarding', 'Error');
      toastError(e.shortMessage);
    }
  };

  const offboard = async (termAddress: Address): Promise<void> => {
    //Init Steps
    setSteps([{ name: 'Offboard Term', status: 'Not Started' }]);

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Offboard Term', 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.lendingTermOffboardingAddress,
        abi: OffboardGovernorGuildABI,
        functionName: 'offboard',
        args: [termAddress]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Offboard Term', 'Error');
        return;
      }

      const minedBlock = tx.blockNumber;
      updateStepStatus('Offboard Term', 'Waiting confirmation...');
      await fetchLendingTermsUntilBlock(minedBlock, appMarketId, appChainId);
      await fetchActiveOffboardingPolls();
      updateStepStatus('Offboard Term', 'Success');
    } catch (e: any) {
      console.log(e);
      updateStepStatus('Offboard Term', 'Error');
      toastError(e.shortMessage);
    }
  };

  const cleanup = async (termAddress: Address): Promise<void> => {
    //Init Steps
    setSteps([{ name: 'Cleanup Term', status: 'Not Started' }]);

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Cleanup Term', 'In Progress');
      const hash = await writeContract(wagmiConfig, {
        address: contractsList.lendingTermOffboardingAddress,
        abi: OffboardGovernorGuildABI,
        functionName: 'cleanup',
        args: [termAddress]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Cleanup Term', 'Error');
        return;
      }

      updateStepStatus('Cleanup Term', 'Success');
      await fetchActiveOffboardingPolls();
    } catch (e: any) {
      console.log(e);
      updateStepStatus('Cleanup Term', 'Error');
      toastError(e.shortMessage);
    }
  };
  /* End Smart Contract Writes */

  /* Create Modal Steps */
  const createSteps = (): Step[] => {
    return [{ name: 'Propose Offboarding', status: 'Not Started' }];
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());
  /* End Create Modal Steps */

  /* Create Table */
  const columnHelper = createColumnHelper<ActiveOffboardingPolls>();

  const columns = [
    columnHelper.accessor('term', {
      id: 'term',
      header: 'Term',
      enableSorting: true,
      cell: (info) => {
        const lendingTerm = lendingTerms.find((term) => term.address.toLowerCase() === info.getValue().toLowerCase());
        return (
          <a
            className="flex items-center gap-1 whitespace-nowrap pl-2 text-center text-sm font-bold text-gray-600 hover:text-brand-500 dark:text-white"
            target="__blank"
            href={`${getExplorerBaseUrl(appChainId)}/address/${info.getValue()}`}
          >
            {generateTermName(lendingTerm.collateral.symbol, lendingTerm.interestRate, lendingTerm.borrowRatio)}
            <MdOpenInNew />
          </a>
        );
      }
    }),
    columnHelper.accessor('timestamp', {
      id: 'expiry',
      header: 'Expiry',
      enableSorting: true,
      cell: (info) => {
        return (
          <p className="text-sm font-bold text-gray-600 dark:text-white">
            {info.row.original.currentBlock >= info.row.original.snapshotBlock + data.pollDurationBlock
              ? 'Expired'
              : info.row.original.snapshotBlock + data.pollDurationBlock - info.row.original.currentBlock + ' blocks'}
          </p>
        );
      }
    }),
    {
      id: 'support',
      header: 'Support',
      cell: (info: any) => {
        const userWeight = formatUnits(info.row.original.userWeight, 18);
        return (
          <div>
            <TooltipHorizon
              extra=""
              content={
                <div className="text-gray-700 dark:text-white">
                  <span className="font-semibold">Quorum:</span>{' '}
                  {data &&
                    data.quorum &&
                    formatCurrencyValue(Number(userWeight)) + '/' + formatCurrencyValue(data.quorum)}
                </div>
              }
              trigger={
                <div className="flex items-center gap-1">
                  <Progress
                    useColors={false}
                    width="w-[100px]"
                    value={
                      Math.round((Number(userWeight) / data.quorum) * 100) > 100
                        ? 100
                        : Math.round((Number(userWeight) / data.quorum) * 100)
                    }
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
    {
      id: 'action',
      header: '',
      cell: (info: any) => <div className="flex items-center">{getActionButton(info.row.original)}</div>
    }
  ];

  const table = useReactTable({
    data: activeOffboardingPolls,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
    initialState: {
      pagination: {
        pageSize: 8
      },
      sorting: [
        {
          id: 'expiry',
          desc: true
        }
      ]
    }
  });
  /* End Create Table */

  const getActionButton = (item: ActiveOffboardingPolls) => {
    if (!data || !data.pollDurationBlock || !data.quorum) return null;

    if (!isActivePoll(item.snapshotBlock, item.currentBlock, data.pollDurationBlock) && item.userWeight < data.quorum) {
      return (
        <div className="flex items-center gap-1">
          <span className="items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-500">Failed</span>
        </div>
      );
    }

    //vote active and quorum not reached yet
    if (isActivePoll(item.snapshotBlock, item.currentBlock, data.pollDurationBlock) && item.userWeight < data.quorum) {
      return (
        <ButtonPrimary
          disabled={!guildVotingWeight}
          variant="xs"
          title="Support"
          onClick={() => supportOffboard(item.snapshotBlock, item.term)}
        />
      );
    }

    if (item.userWeight >= data.quorum && !data.deprecatedTerms.includes(item.term)) {
      return <ButtonPrimary variant="xs" title="Offboard" onClick={() => offboard(item.term)} />;
    }

    if (data.deprecatedTerms.includes(item.term) && item.issuance != 0) {
      return (
        <div className="flex items-center gap-1">
          <span className="items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-500">
            Offboarded
          </span>
          <TooltipHorizon
            extra=""
            content={
              <div className="text-gray-700 dark:text-white">
                All loans have to be called before the term can be cleaned up
              </div>
            }
            trigger={
              <div>
                <QuestionMarkIcon />
              </div>
            }
            placement="left"
          />
        </div>
      );
    }

    if (data.deprecatedTerms.includes(item.term) && item.issuance == 0 && item.canOffboard) {
      //not active, above quorum and term.issuance() == 0
      return <ButtonPrimary variant="xs" title="Cleanup" onClick={() => cleanup(item.term)} />;
    }

    return (
      <div className="flex items-center gap-1">
        <span className="items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-500">
          Cleaned up
        </span>
      </div>
    );
  };

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
      <div className="text-gray-700 dark:text-gray-100">
        <div className="mt-4 flex w-full flex-col items-center gap-2 xl:flex-row">
          <DropdownSelect
            onChange={setSelectedTerm}
            options={lendingTerms}
            selectedOption={selectedTerm}
            getLabel={(item) => {
              return generateTermName(item.collateral.symbol, item.interestRate, item.borrowRatio);
            }}
            textNoOptionSelected="Select Term"
          />
          <ButtonPrimary
            title="Propose Offboard"
            disabled={!selectedTerm}
            onClick={() => proposeOffboard(selectedTerm.address as Address)}
          />
        </div>
        <div className="mt-4 flex flex-col 3xl:flex-row 3xl:items-center 3xl:justify-between">
          <p>
            Your GUILD voting weight:{' '}
            <span className="font-semibold">
              {guildVotingWeight != undefined &&
                toLocaleString(formatDecimal(Number(formatUnits(guildVotingWeight, 18)), 2))}
            </span>
          </p>
          <p>Active Offboarding polls: </p>
        </div>
        <div>
          {loading ? (
            <div className="mt-4 flex flex-grow flex-col items-center justify-center gap-2">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="overflow-auto">
                <table className="mt-4 w-full">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="!border-px !border-gray-400">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            colSpan={header.colSpan}
                            onClick={header.column.getToggleSortingHandler()}
                            className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pt-4 text-center text-start dark:border-gray-400"
                          >
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-500 dark:text-white">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </p>
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
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 transition-all duration-150 ease-in-out last:border-none hover:cursor-pointer hover:bg-gray-50 dark:border-gray-500 dark:hover:bg-navy-700"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="relative min-w-[85px] border-white/0 py-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
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
          )}
        </div>
      </div>
    </>
  );
}

export default OffboardTerm;
