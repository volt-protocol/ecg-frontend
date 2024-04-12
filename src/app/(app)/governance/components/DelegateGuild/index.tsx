import React, { useEffect, useState } from 'react';
import { readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { toastError } from 'components/toast';
import { GuildABI } from 'lib/contracts';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { Step } from 'components/stepLoader/stepType';
import StepModal from 'components/stepLoader';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender
} from '@tanstack/react-table';
import { getTitleDisabled } from './helper';
import { MdOpenInNew, MdOutlineAccountBalance } from 'react-icons/md';
import Spinner from 'components/spinner';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import ButtonDanger from 'components/button/ButtonDanger';
import { formatDecimal, toLocaleString } from 'utils/numbers';
import { formatUnits, isAddress, parseEther } from 'viem';
import ButtonPrimary from 'components/button/ButtonPrimary';
import DefiInputBox from 'components/box/DefiInputBox';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore } from 'store';

interface Delegatee {
  address: string;
  votes: bigint;
}

function DelegateGuild({
  guildNotUsed,
  reloadGuild,
  guildBalance,
  guildVotingWeight,
  userAddress,
  isConnected
}: {
  guildNotUsed: bigint;
  reloadGuild: React.Dispatch<React.SetStateAction<boolean>>;
  guildBalance: bigint;
  guildVotingWeight: bigint;
  userAddress: string;
  isConnected: boolean;
}) {
  const { contractsList } = useAppStore();
  const { address } = useAccount();
  const [value, setValue] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [addressValue, setAddressValue] = useState<Address>();
  const [delegatees, setDelegatees] = useState<Delegatee[]>([]);
  const [isLoadingDelegations, setIsLoadingDelegations] = useState<boolean>(true);

  const createSteps = (actionType?: 'Delegate' | 'Undelegate'): Step[] => {
    if (actionType === 'Delegate') {
      return [{ name: 'Delegate GUILD', status: 'Not Started' }];
    } else {
      return [{ name: 'Undelegate GUILD', status: 'Not Started' }];
    }
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as string);
    }
  };

  async function getDelegatee(): Promise<string[]> {
    const result = await readContract(wagmiConfig, {
      address: contractsList.guildAddress,
      abi: GuildABI,
      functionName: 'delegates',
      args: [userAddress]
    });
    return result as string[];
  }

  useEffect(() => {
    const tempDelegatees: Delegatee[] = [];

    async function getDelegateeAndVotes(delegatee: string): Promise<void> {
      const result = await readContract(wagmiConfig, {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'delegatesVotesCount',
        args: [userAddress, delegatee]
      });
      tempDelegatees.push({
        address: delegatee,
        votes: result as bigint
      });
      setDelegatees(tempDelegatees);
    }

    if (isConnected) {
      setDelegatees([]);
      getDelegatee().then((result) => {
        result.forEach((delegatee) => {
          getDelegateeAndVotes(delegatee);
        });
        setIsLoadingDelegations(false);
      });
    }
  }, [isConnected, guildNotUsed]);

  /* Smart contract Write */

  async function handleDelegate(): Promise<void> {
    if (Number(value) > Number(formatUnits(guildNotUsed, 18))) {
      toastError("You can't delegate more than your available GUILD");
      return;
    }
    if (Number(value) <= 0) {
      toastError("You can't delegate 0 GUILD");
      return;
    }
    if (!isAddress(addressValue)) {
      toastError('You must enter a valid address');
      return;
    }

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      setSteps(createSteps('Delegate'));
      updateStepStatus('Delegate GUILD', 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'incrementDelegation',
        args: [addressValue, parseEther(value.toString())]
      });

      const checkdelegate = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkdelegate.status != 'success') {
        updateStepStatus('Delegate GUILD', 'Error');
        return;
      }

      updateStepStatus('Delegate GUILD', 'Success');
      setValue('');
      setAddressValue('');
      reloadGuild(true);
    } catch (e) {
      console.log(e);
      updateStepStatus('Delegate GUILD', 'Error');
      toastError('Transaction failed');
    }
  }

  async function handleUndelegate(address: string, amount: bigint): Promise<void> {
    setSteps(createSteps('Undelegate'));

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Undelegate GUILD', 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'undelegate',
        args: [address, amount]
      });

      const checkdelegate = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkdelegate.status != 'success') {
        updateStepStatus('Undelegate GUILD', 'Error');

        return;
      }

      updateStepStatus('Undelegate GUILD', 'Success');
      setValue('');
      setAddressValue('');
      reloadGuild(true);
    } catch (e) {
      console.log(e);
      updateStepStatus('Undelegate GUILD', 'Error');
      toastError('Transaction failed');
    }
  }

  /* End Smart contract Write */

  /* Table */

  const columnHelper = createColumnHelper<Delegatee>();

  const columns = [
    columnHelper.accessor('address', {
      id: 'delegatee',
      header: 'Delegatee',
      enableSorting: true,
      cell: (info) => (
        <a
          className="flex items-center gap-1 pl-3 text-center text-sm font-bold text-gray-600 hover:text-brand-500 dark:text-gray-200"
          target="__blank"
          href={`${process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_ADDRESS}/${info.getValue()}`}
        >
          {info.getValue() == address ? 'Yourself' : info.getValue().slice(0, 4) + '...' + info.getValue().slice(-4)}{' '}
          <MdOpenInNew />
        </a>
      )
    }),
    columnHelper.accessor('votes', {
      id: 'votes',
      header: 'GUILD Delegated',
      enableSorting: true,
      cell: (info) => (
        <p className="text-sm font-bold text-gray-600 dark:text-gray-200">
          {toLocaleString(formatDecimal(Number(formatUnits(info.getValue(), 18)), 2))}
        </p>
      )
    }),
    {
      id: 'action',
      header: '',
      cell: (info: any) => (
        <div className="flex items-center justify-center">
          <ButtonDanger
            variant="xs"
            title="Undelegate"
            onClick={() => handleUndelegate(info.row.original.address, info.row.original.votes)}
          />
        </div>
      )
    }
  ];

  const table = useReactTable({
    data: delegatees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true
  });

  /* End Table */

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
      <div className="mt-4 text-gray-700 dark:text-gray-200">
        <div className="my-2 -mt-1 grid grid-cols-2 gap-y-1">
          <p className="col-span-2">
            Your GUILD balance :{' '}
            <span className="font-semibold">
              {guildBalance ? toLocaleString(formatDecimal(Number(formatUnits(guildBalance, 18)), 2)) : 0}
            </span>
          </p>
          <p className="col-span-2">
            Your GUILD voting weight:{' '}
            <span className="font-semibold">
              {guildVotingWeight ? toLocaleString(formatDecimal(Number(formatUnits(guildVotingWeight, 18)), 2)) : 0}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <DefiInputBox
            topLabel="Delegate GUILD to"
            placeholder="0x..."
            pattern="^[0-9a-fA-F]$"
            inputSize="text-xl"
            value={addressValue as Address}
            onChange={(e) => setAddressValue(e.target.value as Address)}
            rightLabel={
              <button
                className="text-sm font-medium text-brand-500 hover:text-brand-400"
                onClick={(e) => setAddressValue(address as Address)}
              >
                Delegate to myself
              </button>
            }
          />

          <DefiInputBox
            topLabel="Amount of GUILD you delegate"
            currencyLogo="/img/crypto-logos/guild.png"
            currencySymbol="GUILD"
            placeholder="0"
            pattern="^[0-9]*[.,]?[0-9]*$"
            inputSize="text-2xl sm:text-3xl"
            value={value}
            onChange={handleInputChange}
            rightLabel={
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available:{' '}
                  {guildNotUsed ? toLocaleString(formatDecimal(Number(formatUnits(guildNotUsed, 18)), 2)) : 0}
                </p>
                <button
                  className="text-sm font-medium text-brand-500 hover:text-brand-400"
                  onClick={(e) => setValue(formatUnits(guildNotUsed, 18))}
                >
                  Max
                </button>
              </>
            }
          />

          <ButtonPrimary
            variant="lg"
            title="Delegate GUILD"
            titleDisabled={getTitleDisabled(Number(value), addressValue, guildNotUsed)}
            extra="w-full mt-1 !rounded-xl"
            onClick={handleDelegate}
            disabled={
              !guildNotUsed ||
              Number(value) > Number(formatUnits(guildNotUsed, 18)) ||
              Number(value) <= 0 ||
              !value ||
              !isAddress(addressValue)
            }
          />
        </div>
        <div>
          {isLoadingDelegations ? (
            <div className="mt-4 flex flex-grow flex-col items-center justify-center gap-2">
              <Spinner />
            </div>
          ) : !isConnected ? (
            <div className="my-4 flex items-center justify-center text-gray-700 dark:text-gray-100">
              <p className="text-center">You have to connect your wallet to see your delegatees</p>
            </div>
          ) : delegatees.length === 0 ? (
            <div className="my-5 flex-col items-center justify-center opacity-40">
              <div className="flex justify-center">
                <MdOutlineAccountBalance className="h-10 w-10" />
              </div>
              <div className="mt-2 flex justify-center">
                <p>You haven't delegated any GUILD yet</p>
              </div>
            </div>
          ) : (
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
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-200">
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
          )}
        </div>
      </div>
    </>
  );
}

export default DelegateGuild;
