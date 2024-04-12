import React, { useEffect, useState } from 'react';
import { RadioGroup } from '@headlessui/react';
import { getPublicClient, readContracts, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { toastError } from 'components/toast';
import { OnboardVetoCreditABI, OnboardVetoGuildABI, GuildABI, OnboardTimelockABI } from 'lib/contracts';
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
import { MdCheckCircle, MdChevronLeft, MdChevronRight, MdOpenInNew } from 'react-icons/md';
import Spinner from 'components/spinner';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { useAccount } from 'wagmi';
import { formatCurrencyValue, formatDecimal, toLocaleString } from 'utils/numbers';
import { ActivOnboardingVetoVotes } from 'types/governance';
import { fromNow } from 'utils/date';
import moment from 'moment';
import { Address, decodeFunctionData, formatUnits } from 'viem';
import { QuestionMarkIcon, TooltipHorizon } from 'components/tooltip';
import { BLOCK_LENGTH_MILLISECONDS, FROM_BLOCK } from 'utils/constants';
import { checkVetoVoteValidity, getProposalIdFromActionId, getVotableTerms } from './helper';
import Progress from 'components/progress';
import clsx from 'clsx';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore } from 'store';

function Veto({ creditVotingWeight, guildVotingWeight }: { creditVotingWeight: bigint; guildVotingWeight: bigint }) {
  const { contractsList, coinDetails, appMarketId } = useAppStore();
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [activeVetoVotes, setActiveVetoVotes] = useState<ActivOnboardingVetoVotes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentBlock, setCurrentBlock] = useState<BigInt>();
  const [selectHolderType, setSelectHolderType] = useState<'guild' | 'credit'>('credit');
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const creditTokenSymbol = 'g' + pegToken.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);

  useEffect(() => {
    address && fetchActiveOnboardingVetoVotes();
  }, [address]);

  /* Getters */
  const fetchActiveOnboardingVetoVotes = async () => {
    setLoading(true);
    const currentBlockNumber = await getPublicClient(wagmiConfig).getBlockNumber();

    setCurrentBlock(currentBlockNumber);

    //logs are returned from oldest to newest
    const logs = await getPublicClient(wagmiConfig).getLogs({
      address: contractsList.onboardTimelockAddress as Address,
      event: {
        type: 'event',
        name: 'CallScheduled',
        inputs: [
          { indexed: true, name: 'id', type: 'bytes32' },
          { indexed: true, name: 'index', type: 'uint256' },
          { indexed: false, name: 'target', type: 'address' },
          { indexed: false, name: 'value', type: 'uint256' },
          { indexed: false, name: 'data', type: 'bytes' },
          { indexed: false, name: 'predecessor', type: 'bytes32' },
          { indexed: false, name: 'delay', type: 'uint256' }
        ]
      },
      fromBlock: BigInt(FROM_BLOCK),
      toBlock: currentBlockNumber
    });

    const termsCreated = await getVotableTerms(contractsList);
    const activeVetoVotes = await Promise.all(
      logs
        .map((log) => {
          return {
            id: log.args.id,
            target: log.args.target,
            data: log.args.data,
            delay: Number(log.args.delay),
            timestamp: Number(log.blockNumber)
          };
        })
        .reduce((acc, item) => {
          const existing = acc.find((i) => i.timelockId === item.id);
          if (existing) {
            existing.targets.push(item.target);
            existing.datas.push(item.data);
          } else {
            acc.push({
              timelockId: item.id,
              targets: [item.target],
              datas: [item.data],
              timestamp: item.timestamp,
              onboardIn: item.delay + item.timestamp
            });
          }
          return acc;
        }, [] as { timelockId: string; targets: Address[]; datas: string[]; timestamp: number; onboardIn: number }[])
        .filter((item) => checkVetoVoteValidity(contractsList, item.targets, item.datas))
        .map((item) => {
          //TODO : get term name decoding data[0]
          const { functionName, args } = decodeFunctionData({
            abi: GuildABI,
            data: item.datas[0] as `0x${string}`
          });

          // get TermCreated logs
          const term = termsCreated.find((term) => term.termAddress.toLowerCase() === args[1].toLowerCase());

          // TODO : transform action id to proposalID
          const proposalId = getProposalIdFromActionId(contractsList, item.timelockId);

          return {
            ...item,
            termAddress: term.termAddress,
            termName: term.termName,
            proposalId: proposalId
          };
        })
        .map(async (item) => {
          //get proposal votes
          const data = await readContracts(wagmiConfig, {
            contracts: [
              {
                address: contractsList.marketContracts[appMarketId].onboardVetoCreditAddress,
                abi: OnboardVetoCreditABI,
                functionName: 'proposalVotes',
                args: [item.proposalId]
              },
              {
                address: contractsList.marketContracts[appMarketId].onboardVetoCreditAddress,
                abi: OnboardVetoCreditABI,
                functionName: 'quorum',
                args: [item.timestamp]
              },
              {
                address: contractsList.marketContracts[appMarketId].onboardVetoCreditAddress,
                abi: OnboardVetoCreditABI,
                functionName: 'state',
                args: [item.proposalId]
              },
              {
                address: contractsList.onboardVetoGuildAddress,
                abi: OnboardVetoGuildABI,
                functionName: 'proposalVotes',
                args: [item.proposalId]
              },
              {
                address: contractsList.onboardVetoGuildAddress,
                abi: OnboardVetoGuildABI,
                functionName: 'quorum',
                args: [item.timestamp]
              },
              {
                address: contractsList.onboardVetoGuildAddress,
                abi: OnboardVetoGuildABI,
                functionName: 'state',
                args: [item.proposalId]
              },
              {
                address: contractsList.onboardTimelockAddress,
                abi: OnboardTimelockABI,
                functionName: 'isOperationPending',
                args: [item.timelockId]
              },
              {
                address: contractsList.onboardTimelockAddress,
                abi: OnboardTimelockABI,
                functionName: 'isOperationReady',
                args: [item.timelockId]
              },
              {
                address: contractsList.onboardTimelockAddress,
                abi: OnboardTimelockABI,
                functionName: 'isOperationDone',
                args: [item.timelockId]
              },
              {
                address: contractsList.marketContracts[appMarketId].onboardVetoCreditAddress,
                abi: OnboardVetoCreditABI,
                functionName: 'hasVoted',
                args: [item.proposalId, address]
              },
              {
                address: contractsList.onboardVetoGuildAddress,
                abi: OnboardVetoGuildABI,
                functionName: 'hasVoted',
                args: [item.proposalId, address]
              }
            ]
          });

          return {
            ...item,
            creditVeto: {
              supportVotes: data[0].result[0],
              quorum: data[1].result,
              state: data[2].status == 'success' ? Number(data[2].result) : 'Reverts',
              hasVoted: data[9].result
            },
            guildVeto: {
              supportVotes: data[3].result[0],
              quorum: data[4].result,
              state: data[5].status == 'success' ? Number(data[5].result) : 'Reverts',
              hasVoted: data[10].result
            },
            timelock: {
              isOperationPending: data[6].status == 'success' ? data[6].result : false,
              isOperationReady: data[7].status == 'success' ? data[7].result : false,
              isOperationDone: data[8].status == 'success' ? data[8].result : false
            }
          };
        })
    );

    setLoading(false);
    setActiveVetoVotes(activeVetoVotes);
  };
  /* End Getters*/

  /* Smart Contract Writes */
  const castVote = async (proposalId: BigInt, vote: number): Promise<void> => {
    //Init Steps
    setSteps([
      {
        name: 'Support Veto against Term Proposal ' + proposalId.toString().slice(0, 6) + '...',
        status: 'Not Started'
      }
    ]);

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus(
        'Support Veto against Term Proposal ' + proposalId.toString().slice(0, 6) + '...',
        'In Progress'
      );

      const targetContract =
        selectHolderType == 'credit'
          ? {
              address: contractsList.marketContracts[appMarketId].onboardVetoCreditAddress,
              abi: OnboardVetoCreditABI
            }
          : {
              address: contractsList.onboardVetoGuildAddress,
              abi: OnboardVetoGuildABI
            };

      const hash = await writeContract(wagmiConfig, {
        ...targetContract,
        functionName: 'castVote',
        args: [proposalId, vote]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Support Veto against Term Proposal ' + proposalId.toString().slice(0, 6) + '...', 'Error');
        return;
      }

      updateStepStatus('Support Veto against Term Proposal ' + proposalId.toString().slice(0, 6) + '...', 'Success');
      await fetchActiveOnboardingVetoVotes();
    } catch (e: any) {
      console.log(e);
      updateStepStatus('Support Veto against Term Proposal ' + proposalId.toString().slice(0, 6) + '...', 'Error');
      toastError(e.shortMessage);
    }
  };

  const createVeto = async (timelockId: bigint): Promise<void> => {
    //Init Steps
    setSteps([
      {
        name: 'Create Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...',
        status: 'Not Started'
      }
    ]);

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Create Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...', 'In Progress');
      const targetContract =
        selectHolderType == 'credit'
          ? {
              address: contractsList.marketContracts[appMarketId].onboardVetoCreditAddress,
              abi: OnboardVetoCreditABI
            }
          : {
              address: contractsList.onboardVetoGuildAddress,
              abi: OnboardVetoGuildABI
            };

      const hash = await writeContract(wagmiConfig, {
        ...targetContract,
        functionName: 'createVeto',
        args: [timelockId]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Create Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...', 'Error');
        return;
      }

      updateStepStatus('Create Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...', 'Success');
      await fetchActiveOnboardingVetoVotes();
    } catch (e: any) {
      console.log(e);
      updateStepStatus('Create Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...', 'Error');
      toastError(e.shortMessage);
    }
  };

  const executeVeto = async (timelockId: number): Promise<void> => {
    //Init Steps
    setSteps([
      {
        name: 'Execute Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...',
        status: 'Not Started'
      }
    ]);

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Execute Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...', 'In Progress');
      const targetContract =
        selectHolderType == 'credit'
          ? {
              address: contractsList.marketContracts[appMarketId].onboardVetoCreditAddress,
              abi: OnboardVetoCreditABI
            }
          : {
              address: contractsList.onboardVetoGuildAddress,
              abi: OnboardVetoGuildABI
            };

      const hash = await writeContract(wagmiConfig, {
        ...targetContract,
        functionName: 'executeVeto',
        args: [timelockId]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Execute Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...', 'Error');
        return;
      }

      updateStepStatus('Execute Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...', 'Success');
      await fetchActiveOnboardingVetoVotes();
    } catch (e: any) {
      console.log(e);
      updateStepStatus('Execute Veto for Term Proposal ' + timelockId.toString().slice(0, 6) + '...', 'Error');
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
  const columnHelper = createColumnHelper<ActiveVetoVotes>();

  const columns = [
    columnHelper.accessor('termName', {
      id: 'term',
      header: 'Term',
      enableSorting: true,
      cell: (info) => {
        return (
          <a
            className="flex items-center gap-1 pl-2 text-center text-sm font-bold text-gray-600 hover:text-brand-500 dark:text-white"
            target="__blank"
            href={`${process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_ADDRESS}/${info.row.original.termAddress}`}
          >
            {info.getValue()}
            <MdOpenInNew />
          </a>
        );
      }
    }),
    columnHelper.accessor('onboardIn', {
      id: 'onboardIn',
      header: 'Onboard in',
      enableSorting: true,
      cell: (info) => {
        return (
          <p className="text-sm font-bold text-gray-600 dark:text-white">
            {Number(info.getValue()) - Number(currentBlock) > 0 && !info.row.original.timelock.isOperationDone
              ? fromNow(
                  Number(
                    moment().add(
                      (Number(info.getValue()) - Number(currentBlock)) * BLOCK_LENGTH_MILLISECONDS,
                      'milliseconds'
                    )
                  )
                )
              : 'Onboarded'}
          </p>
        );
      }
    }),
    {
      id: 'support',
      header: 'Veto Support',
      cell: (info: any) => {
        const supportVotes = Number(
          selectHolderType == 'credit'
            ? formatUnits(info.row.original.creditVeto.supportVotes, 18)
            : formatUnits(info.row.original.guildVeto.supportVotes, 18)
        );

        const quorum =
          selectHolderType == 'credit' ? info.row.original.creditVeto.quorum : info.row.original.guildVeto.quorum;

        return (
          <div>
            <TooltipHorizon
              extra=""
              content={
                <div className="text-gray-700 dark:text-white">
                  <ul>
                    <li className="flex items-center gap-1">
                      <span className="font-semibold">Support:</span> {formatCurrencyValue(supportVotes)}
                    </li>
                    <li className="flex items-center gap-1">
                      <span className="font-semibold">Quorum:</span>{' '}
                      {formatCurrencyValue(Number(formatUnits(quorum, 18)))}
                    </li>
                  </ul>
                </div>
              }
              trigger={
                <div className="flex items-center gap-1">
                  <Progress
                    useColors={false}
                    width="w-[100px]"
                    value={Math.round((supportVotes / Number(formatUnits(quorum, 18))) * 100)}
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
      cell: (info: any) => {
        return <div className="flex items-center gap-1">{getActionButton(info.row.original)}</div>;
      }
    }
  ];

  const table = useReactTable({
    data: activeVetoVotes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
    initialState: {
      pagination: {
        pageSize: 8
      },
      sorting: [
        {
          id: 'onboardIn',
          desc: true
        }
      ]
    }
  });
  /* End Create Table */

  const getActionButton = (item: ActivOnboardingVetoVotes) => {
    const state = selectHolderType == 'credit' ? item.creditVeto.state : item.guildVeto.state;

    const hasVoted = selectHolderType == 'credit' ? item.creditVeto.hasVoted : item.guildVeto.hasVoted;

    if (Number(item.onboardIn) - Number(currentBlock) < 0 || item.timelock.isOperationDone) {
      return (
        <span className="items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-500">
          Veto failed
        </span>
      );
    }

    if (state == 'Reverts') {
      return <ButtonPrimary variant="xs" title="Create Veto" onClick={() => createVeto(item.timelockId)} />;
    }

    if (state == 0) {
      return <ButtonPrimary variant="xs" title="Create Veto" onClick={() => createVeto(item.timelockId)} />;
    }

    if (state == 1 && !hasVoted) {
      return <ButtonPrimary variant="xs" title="Support Veto" onClick={() => castVote(item.proposalId, 0)} />;
    }

    if (state == 1 && hasVoted) {
      return (
        <span className="items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
          Already voted
        </span>
      );
    }

    if (state == 3) {
      return (
        <span className="items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-500">
          Veto failed
        </span>
      );
    }

    if (state == 4) {
      return <ButtonPrimary variant="xs" title="Execute Veto" onClick={() => executeVeto(item.timelockId)} />;
    }

    if (state == 7) {
      return (
        <span className="items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
          Veto Successfull
        </span>
      );
    }

    return null;
  };

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
      <div className="text-gray-700 dark:text-gray-100">
        <RadioGroup value={selectHolderType} onChange={setSelectHolderType}>
          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
            <RadioGroup.Option
              key={'credit'}
              value={'credit'}
              className={({ active }) =>
                clsx(
                  active ? 'border-brand-300' : 'border-gray-100',
                  'relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none'
                )
              }
            >
              {({ checked, active }) => (
                <>
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <RadioGroup.Label as="span" className="font-semilight block text-gray-700">
                        Use my {creditTokenSymbol} voting power
                      </RadioGroup.Label>
                      <RadioGroup.Description as="span" className="mt-2 text-xl font-medium text-gray-700">
                        {toLocaleString(formatDecimal(Number(formatUnits(creditVotingWeight, 18)), 2))}{' '}
                        {creditTokenSymbol}
                      </RadioGroup.Description>
                    </span>
                  </span>
                  <MdCheckCircle
                    className={clsx(!checked ? 'invisible' : '', 'h-5 w-5 text-brand-300')}
                    aria-hidden="true"
                  />
                  <span
                    className={clsx(
                      'border-2',
                      checked ? 'border-brand-300' : 'border-transparent',
                      'pointer-events-none absolute -inset-px rounded-lg'
                    )}
                    aria-hidden="true"
                  />
                </>
              )}
            </RadioGroup.Option>
            <RadioGroup.Option
              key={'guild'}
              value={'guild'}
              className={({ active }) =>
                clsx(
                  active ? 'border-brand-300' : 'border-gray-300',
                  'relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none'
                )
              }
            >
              {({ checked, active }) => (
                <>
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <RadioGroup.Label as="span" className="font-semilight block text-gray-700">
                        Use my GUILD voting power
                      </RadioGroup.Label>
                      <RadioGroup.Description as="span" className="mt-2 text-xl font-medium text-gray-700">
                        {toLocaleString(formatDecimal(Number(formatUnits(guildVotingWeight, 18)), 2))} GUILD
                      </RadioGroup.Description>
                    </span>
                  </span>
                  <MdCheckCircle
                    className={clsx(!checked ? 'invisible' : '', 'h-5 w-5 text-brand-300')}
                    aria-hidden="true"
                  />
                  <span
                    className={clsx(
                      'border-2',
                      checked ? 'border-brand-300' : 'border-transparent',
                      'pointer-events-none absolute -inset-px rounded-lg'
                    )}
                    aria-hidden="true"
                  />
                </>
              )}
            </RadioGroup.Option>
          </div>
        </RadioGroup>

        <p className="mt-4">
          Using {selectHolderType == 'credit' ? `${creditTokenSymbol}` : 'GUILD'} veto power will cancel the onboarding
          of a lending term that GUILD votes successfully voted to add.
        </p>
        <div>
          {loading ? (
            <div className="mt-4 flex flex-grow flex-col items-center justify-center gap-2">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="overflow-auto">
                <table className="mt-2 w-full">
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

export default Veto;
