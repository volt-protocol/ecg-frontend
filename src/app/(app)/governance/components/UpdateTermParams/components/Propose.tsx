import { writeContract, waitForTransactionReceipt, multicall } from '@wagmi/core';
import DropdownSelect from 'components/select/DropdownSelect';
import Spinner from 'components/spinner';
import StepModal from 'components/stepLoader';
import { Step } from 'components/stepLoader/stepType';
import { useEffect, useState } from 'react';
import { Abi, Address, formatUnits } from 'viem';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { TermParamGovernorABI, GuildABI, LendingTermFactoryABI, termContract } from 'lib/contracts';
import { MdOpenInNew } from 'react-icons/md';
import { useAccount } from 'wagmi';
import { AlertMessage } from 'components/message/AlertMessage';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore, useUserPrefsStore } from 'store';
import { getExplorerBaseUrl } from 'config';
import { LendingTerms } from 'types/lending';
import { generateTermName } from 'utils/strings';
import { formatDecimal, formatCurrencyValue } from 'utils/numbers';
import { toastError } from 'components/toast';

export default function Propose() {
  const { contractsList, lendingTerms, coinDetails } = useAppStore();
  const { appMarketId, appChainId } = useUserPrefsStore();
  const { address } = useAccount();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [reload, setReload] = useState<boolean>(false);
  const [selectedTerm, setSelectedTerm] = useState<any>(null);
  const [value, setValue] = useState<any>('');
  const [terms, setTerms] = useState<
    (LendingTerms & {
      issuance?: number;
      hardCap?: number;
      implementation?: Address;
    })[]
  >(
    JSON.parse(
      JSON.stringify(
        lendingTerms.filter(function (term) {
          return term.status === 'live';
        })
      )
    )
  );
  const [data, setData] = useState<any>({
    proposalThreshold: 0,
    guildVotes: 0
  });

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );

  const actions = [
    {
      key: 'interestRate',
      label: 'Set Interest Rate',
      function: 'proposeSetInterestRate'
    },
    {
      key: 'borrowRatio',
      label: 'Set Borrow Ratio',
      function: 'proposeSetMaxDebtPerCollateralToken'
    },
    {
      key: 'hardCap',
      label: 'Set Hard Cap',
      function: 'proposeSetHardCap'
    }
  ];
  const [action, setAction] = useState<any>(actions[0]);

  useEffect(() => {
    fetchSmartContractData();
    if (reload) {
      setReload(false);
    }
  }, [reload]);

  const fetchSmartContractData = async () => {
    setLoading(true);

    const calls = [];
    terms.forEach(function (term) {
      calls.push({
        ...termContract(term.address as Address),
        functionName: 'issuance',
        chainId: appChainId
      });
      calls.push({
        ...termContract(term.address as Address),
        functionName: 'getParameters',
        chainId: appChainId
      });
      calls.push({
        address: contractsList.lendingTermFactoryAddress as Address,
        abi: LendingTermFactoryABI as Abi,
        functionName: 'termImplementations',
        args: [term.address as Address],
        chainId: appChainId
      });
    });

    // also get proposal threshold & user votes
    calls.push({
      address: contractsList.onboardGovernorGuildAddress,
      abi: TermParamGovernorABI,
      functionName: 'proposalThreshold',
      chainId: appChainId
    });
    calls.push({
      address: contractsList.guildAddress,
      abi: GuildABI,
      functionName: 'getVotes',
      args: [address as Address],
      chainId: appChainId
    });

    const contractData = await multicall(wagmiConfig, {
      chainId: appChainId as any,
      contracts: calls
    });
    for (var i = 0; i < terms.length; i++) {
      terms[i].issuance = Number(formatUnits(contractData[i * 3 + 0].result as bigint, 18));
      terms[i].hardCap = Number(formatUnits(contractData[i * 3 + 1].result.hardCap as bigint, 18));
      terms[i].implementation = contractData[i * 3 + 2].result as Address;
    }

    data.proposalThreshold = Number(formatUnits(contractData[terms.length * 3 + 0].result as bigint, 18));
    data.guildVotes = Number(formatUnits((contractData[terms.length * 3 + 1].result as bigint) || BigInt(0), 18));

    setTerms(terms);
    setData(data);
    setLoading(false);
    setSelectedTerm(terms[0] || null);
  };

  const createSteps = (): Step[] => {
    return [{ name: 'Propose', status: 'Not Started' }];
  };
  const updateStepStatus = (stepName: string, status: Step['status']) => {
    setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
  };
  const [steps, setSteps] = useState<Step[]>([createSteps()]);

  /* Smart contract Write */
  const doPropose = async (): Promise<void> => {
    let formattedValue = BigInt(Math.floor(1e18 * Number(value || '0')));
    if (action.key == 'interestRate') {
      formattedValue = formattedValue / BigInt(100); // user inputs in percent
    } else if (action.key == 'borrowRatio') {
      // decimals correction
      formattedValue = formattedValue * BigInt(10 ** (18 - selectedTerm.collateral.decimals));
    }

    const stepLabel = 'Propose ' + action.label;
    setSteps([{ name: stepLabel, status: 'Not Started' }]);
    try {
      setShowModal(true);
      updateStepStatus(stepLabel, 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.termParamGovernorGuildAddress,
        abi: TermParamGovernorABI,
        functionName: action.function,
        args: [selectedTerm.address, formattedValue]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus(stepLabel, 'Error');
        return;
      }

      updateStepStatus(stepLabel, 'Success');
      setReload(true);
    } catch (e: any) {
      updateStepStatus(stepLabel, 'Error');
      toastError(e.shortMessage);
    }
  };
  /* End Smart contract Write */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Verify input is a number
    if (!isNaN(Number(inputValue))) {
      setValue(inputValue as string);
    }
  };

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
      <div>
        {loading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {terms && terms.length > 0 && (
              <>
                <div className="mt-2 sm:col-span-2 sm:mt-0">
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium leading-6 text-gray-500 dark:text-gray-200"
                  >
                    Select a term
                  </label>
                  {terms && terms.length > 0 && (
                    <DropdownSelect
                      options={terms}
                      selectedOption={selectedTerm}
                      onChange={setSelectedTerm}
                      getLabel={(term) =>
                        (term.issuance != 0 ? '🟢 ' : term.debtCeiling != 0 ? '🟡 ' : '🟠 ') +
                        generateTermName(term.collateral.symbol, term.interestRate, term.borrowRatio) +
                        (term.issuance
                          ? ' - ' + formatCurrencyValue(term.issuance) + ' ' + pegToken?.symbol + ' borrowed'
                          : '')
                      }
                      extra={'w-full mt-1'}
                    />
                  )}
                </div>
                <div className="mt-4 text-sm">
                  <dl className="divide-y divide-gray-100 text-gray-700 dark:text-gray-200">
                    <div className="px-1 py-0.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Contract Address</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        <a
                          className="flex items-center gap-1 transition-all duration-150 ease-in-out hover:text-brand-500"
                          href={getExplorerBaseUrl(appChainId) + '/address/' + selectedTerm?.address}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedTerm?.address} <MdOpenInNew />
                        </a>
                      </dd>
                    </div>
                    <div className="px-1 py-0.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Interest Rate</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        {formatDecimal(formatCurrencyValue(selectedTerm?.interestRate) * 100, 2)} %
                      </dd>
                    </div>
                    <div className="px-1 py-0.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Borrow Ratio</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        {formatCurrencyValue(selectedTerm?.borrowRatio)}
                      </dd>
                    </div>
                    <div className="px-1 py-0.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Hard Cap</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        {formatCurrencyValue(selectedTerm?.hardCap)}
                      </dd>
                    </div>
                  </dl>
                </div>
                {selectedTerm?.implementation.toLowerCase() == '0xd2d12e407675ec0e418bdb4dbceaa1b0c4ee6108' ? (
                  <div className="mt-4 text-center opacity-50">
                    This term is using a legacy implementation and cannot be updated.
                  </div>
                ) : (
                  <div>
                    <div className="mt-4 sm:col-span-2 sm:mt-0">
                      <label
                        htmlFor="price"
                        className="block text-sm font-medium leading-6 text-gray-500 dark:text-gray-200"
                      >
                        Parameter to update
                      </label>
                      <DropdownSelect
                        options={actions}
                        selectedOption={action}
                        onChange={setAction}
                        getLabel={(item) => item.label}
                        extra={'w-full mt-1'}
                      />
                    </div>
                    <div className="relative my-3 w-full rounded-md">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="sm:text-md text-gray-500">
                          {action.key == 'interestRate'
                            ? formatDecimal(formatCurrencyValue(selectedTerm[action.key]) * 100, 2) + ' %'
                            : formatCurrencyValue(selectedTerm[action.key])}{' '}
                          &rarr;
                        </span>
                      </div>
                      <input
                        type="number"
                        step=".01"
                        name="paramUpdateValue"
                        id="paramUpdateValue"
                        value={value}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="sm:text-md block w-full rounded-md border-0 py-1.5 pl-24 pr-2 ring-1 ring-inset ring-gray-300 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-400/80 dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-gray-300 sm:leading-6"
                      />
                    </div>
                    <div className="mt-2 flex w-full flex-col gap-2">
                      <ButtonPrimary
                        onClick={() => doPropose()}
                        type="button"
                        title={`Propose Parameter Change`}
                        extra="w-full"
                        disabled={
                          !selectedTerm ||
                          data?.guildVotes < data?.proposalThreshold ||
                          isNaN(data?.guildVotes) ||
                          value == ''
                        }
                      />
                      {data?.guildVotes < data?.proposalThreshold && (
                        <AlertMessage
                          type="danger"
                          message={
                            <>
                              {formatCurrencyValue(data?.proposalThreshold)} GUILD required to propose, you have{' '}
                              {formatCurrencyValue(data?.guildVotes)}.
                            </>
                          }
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
