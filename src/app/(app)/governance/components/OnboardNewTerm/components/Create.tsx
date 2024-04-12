import DropdownSelect from 'components/select/DropdownSelect';
import StepModal from 'components/stepLoader';
import { useEffect, useState } from 'react';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ErrorMessage } from 'components/message/ErrorMessage';
import clsx from 'clsx';
import { waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { LendingTermFactoryABI, TermABI } from 'lib/contracts';
import { toastError } from 'components/toast';
import { Step } from 'components/stepLoader/stepType';
import { AbiParameter, Address, encodeAbiParameters, parseEther } from 'viem';
import { SECONDS_IN_YEAR } from 'utils/constants';
import { MdCheckCircle, MdClose } from 'react-icons/md';
import { formatNumberDecimal } from 'utils/numbers';
import getToken from 'lib/getToken';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore } from 'store';

//Define form schema
const schema = yup
  .object({
    openingFee: yup.number().moreThan(-0.000001).max(10).required(),
    interestRate: yup.number().moreThan(-0.000001).max(100).required(),
    borrowRatio: yup.number().positive().required(),
    hardCap: yup.number().positive().required()
  })
  .required();

export interface CreateTermForm {
  collateralToken: Address;
  openingFee: number;
  interestRate: number;
  borrowRatio: number;
  periodicPayments: 'None' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  hardCap: number;
}

export default function Create() {
  const { contractsList, appMarketId } = useAppStore();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('None');
  const { register, handleSubmit, watch, reset, formState } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange'
  });
  const watchBorrowRatio = watch('borrowRatio');
  const watchInterestRate = watch('interestRate');
  const [collateralTokenAddressInput, setCollateralTokenAddressInput] = useState<string>('');
  const [collateralTokenInputDisabled, setCollateralTokenInputDisabled] = useState<boolean>(false);
  const [collateralToken, setCollateralToken] = useState<{
    symbol: string;
    address: Address;
    decimals: number;
  }>({});

  const createSteps = (): Step[] => {
    return [{ name: 'Propose Offboarding', status: 'Not Started' }];
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());

  async function getTokenDetails(tokenAddress: Address): Promise<void> {
    try {
      const result = await getToken(tokenAddress);

      if (result[0].status == 'failure' || result[1].status == 'failure') {
        toastError('Collateral address is not a valid ERC20 token');
        setCollateralToken({});
        return;
      }

      setCollateralToken({
        symbol: result[1].result,
        address: tokenAddress,
        decimals: result[0].result
      });
      setCollateralTokenAddressInput(result[1].result);
      setCollateralTokenInputDisabled(true);
      return result[1].result;
    } catch (e: any) {
      setCollateralToken({});
      toastError('Collateral address is not a valid ERC20 token');
    }
  }

  useEffect(() => {
    async function checkCollateralToken() {
      if (collateralTokenAddressInput.length == 42 && collateralTokenAddressInput.match(/^0x[A-Fa-f0-9]+$/i)) {
        getTokenDetails(collateralTokenAddressInput as Address);
      }
    }
    checkCollateralToken();
  }, [collateralTokenAddressInput]);

  function enableCollateralTokenInput() {
    setCollateralTokenInputDisabled(false);
    setCollateralTokenAddressInput('');
    setCollateralToken({});
  }

  /* Form Validation */
  const onSubmit: SubmitHandler<any> = async (data) => {
    let minPartialRepayPercent;
    let maxDelayBetweenPartialRepay;
    const interestRate = parseEther((data.interestRate / 100).toString());

    switch (selectedPeriod) {
      case 'None':
        minPartialRepayPercent = 0;
        maxDelayBetweenPartialRepay = 0;
        break;
      case 'Weekly':
        minPartialRepayPercent = Math.round(Number(interestRate) / 52);
        maxDelayBetweenPartialRepay = 7 * 24 * 3600;
        break;
      case 'Monthly':
        minPartialRepayPercent = Math.round(Number(interestRate) / 12);
        maxDelayBetweenPartialRepay = SECONDS_IN_YEAR / 12;
        break;
      case 'Quarterly':
        minPartialRepayPercent = Math.round(Number(interestRate) / 4);
        maxDelayBetweenPartialRepay = SECONDS_IN_YEAR / 4;
        break;
      case 'Yearly':
        minPartialRepayPercent = interestRate;
        maxDelayBetweenPartialRepay = SECONDS_IN_YEAR;
        break;
    }

    const args = {
      collateralToken: collateralToken.address,
      maxDebtPerCollateralToken:
        BigInt(parseEther(data.borrowRatio.toString())) * BigInt(10 ** (18 - collateralToken.decimals)),
      interestRate: interestRate,
      maxDelayBetweenPartialRepay: maxDelayBetweenPartialRepay,
      minPartialRepayPercent: minPartialRepayPercent,
      openingFee: parseEther((data.openingFee / 100).toString()),
      hardCap: parseEther(data.hardCap.toString())
    };

    await createTerm(args);
  };

  /* Smart contract Write & Read */

  const createTerm = async (args: any): Promise<void> => {
    //Init Steps
    setSteps([{ name: 'Create New Term', status: 'Not Started' }]);

    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    try {
      setShowModal(true);
      updateStepStatus('Create New Term', 'In Progress');

      const encodedLendingTermParameters = encodeAbiParameters(
        [
          { name: 'collateralToken', type: 'address' },
          { name: 'maxDebtPerCollateralToken', type: 'uint256' },
          { name: 'interestRate', type: 'uint256' },
          { name: 'maxDelayBetweenPartialRepay', type: 'uint256' },
          { name: 'minPartialRepayPercent', type: 'uint256' },
          { name: 'openingFee', type: 'uint256' },
          { name: 'hardCap', type: 'uint256' }
        ],
        [
          args.collateralToken,
          args.maxDebtPerCollateralToken,
          args.interestRate,
          args.maxDelayBetweenPartialRepay,
          args.minPartialRepayPercent,
          args.openingFee,
          args.hardCap
        ]
      );

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.lendingTermFactoryAddress,
        abi: LendingTermFactoryABI,
        functionName: 'createTerm',
        args: [
          appMarketId, //gauge type
          contractsList.lendingTermV1ImplementationAddress, //implementation
          contractsList.auctionHouseAddress, //auction house
          encodedLendingTermParameters
        ]
      });

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (tx.status != 'success') {
        updateStepStatus('Create New Term', 'Error');
        return;
      }

      updateStepStatus('Create New Term', 'Success');
      reset(); // reset form
      //TODO: trigger refetch terms in offboarding page
    } catch (e: any) {
      console.error(e);
      updateStepStatus('Create New Term', 'Error');
      toastError(e.shortMessage);
    }
  };
  /* End Smart contract Write */

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
      <div className="px-1">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label htmlFor="collateralToken" className="text-md block font-medium leading-6 sm:pt-1.5">
              Collateral Token
              {collateralToken && collateralToken.address ? (
                <MdCheckCircle className="ml-1 inline text-green-500" />
              ) : (
                <MdClose className="ml-1 inline text-red-500" />
              )}
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <div className="relative">
                <input
                  value={collateralTokenAddressInput}
                  onChange={(e) => setCollateralTokenAddressInput(e.target.value)}
                  disabled={collateralTokenInputDisabled}
                  type="text"
                  name="collateralToken"
                  id="collateralToken"
                  placeholder="0xe44...7EeB"
                  className={clsx(
                    collateralTokenInputDisabled
                      ? 'text-black-400 cursor-not-allowed border border-gray-300 bg-gray-200 pl-2 text-center placeholder:text-gray-500'
                      : 'focus:ring-brand-400/80',
                    'sm:text-md block w-full rounded-md border-0 py-1.5 pl-2 pr-8 ring-1 ring-inset ring-gray-300 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:leading-6'
                  )}
                />
                {collateralTokenInputDisabled && (
                  <div
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm leading-5"
                    onClick={() => enableCollateralTokenInput()}
                  >
                    <svg
                      className="h-4 w-4 cursor-pointer text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label htmlFor="openingFee" className="text-md block font-medium leading-6 sm:pt-1.5">
              Opening Fee
            </label>
            <div className="relative mt-2 rounded-md sm:col-span-2 sm:mt-0">
              <input
                {...register('openingFee')}
                type="number"
                name="openingFee"
                id="openingFee"
                step=".1"
                placeholder="0.00"
                className={clsx(
                  formState.errors.openingFee ? 'ring-red-500' : 'focus:ring-brand-400/80',
                  'sm:text-md block w-full rounded-md border-0 py-1.5 pl-2 pr-10 ring-1 ring-inset ring-gray-300 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:ring-2 focus:ring-inset dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-gray-300 sm:leading-6'
                )}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="sm:text-md text-gray-500" id="price-currency">
                  %
                </span>
              </div>
            </div>
          </div>
          <ErrorMessage title={formState.errors.openingFee?.message} variant="error" />
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label htmlFor="interestRate" className="text-md block font-medium leading-6 sm:pt-1.5">
              Interest Rate
            </label>
            <div className="relative mt-2 rounded-md sm:col-span-2 sm:mt-0">
              <input
                {...register('interestRate')}
                type="number"
                step=".1"
                name="interestRate"
                id="interestRate"
                placeholder="0.00"
                className={clsx(
                  formState.errors.interestRate ? 'ring-red-500' : 'focus:ring-brand-400/80',
                  'sm:text-md block w-full rounded-md border-0 py-1.5 pl-2 pr-10 ring-1 ring-inset ring-gray-300 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:ring-2 focus:ring-inset dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-gray-300 sm:leading-6'
                )}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="sm:text-md text-gray-500" id="price-currency">
                  %
                </span>
              </div>
            </div>
          </div>
          <ErrorMessage title={formState.errors.interestRate?.message} variant="error" />
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label htmlFor="borrowRatio" className="text-md block font-medium leading-6 sm:pt-1.5">
              Borrow Ratio
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <input
                {...register('borrowRatio')}
                type="number"
                step=".01"
                name="borrowRatio"
                id="borrowRatio"
                placeholder="0.00"
                className={clsx(
                  formState.errors.borrowRatio ? 'ring-red-500' : 'focus:ring-brand-400/80',
                  'sm:text-md block w-full rounded-md border-0 py-1.5 pl-2 pr-10 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-gray-300 sm:leading-6'
                )}
              />
            </div>
          </div>
          <ErrorMessage title={formState.errors.borrowRatio?.message} variant="error" />
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label htmlFor="periodicPayments" className="text-md block font-medium leading-6 sm:pt-1.5">
              Periodic Payments
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <DropdownSelect
                {...register('interestRate')}
                options={['None', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']}
                selectedOption={selectedPeriod}
                onChange={setSelectedPeriod}
                getLabel={(item) => item}
                extra={'w-full'}
              />
            </div>
          </div>
          <div className="my-3 sm:grid sm:grid-cols-3 sm:items-start">
            <label htmlFor="hardCap" className="text-md block font-medium leading-6 sm:pt-1.5">
              Hard Cap
            </label>
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <input
                {...register('hardCap')}
                type="number"
                name="hardCap"
                id="hardCap"
                placeholder="1000000"
                className={clsx(
                  formState.errors.hardCap ? 'ring-red-500' : 'focus:ring-brand-400/80',
                  'sm:text-md block w-full rounded-md border-0 py-1.5 pl-2 pr-10 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-gray-300 sm:leading-6'
                )}
              />
            </div>
          </div>
          <ErrorMessage title={formState.errors.hardCap?.message} variant="error" />
          <div className="mt-6 block w-full">
            <ButtonPrimary
              type="submit"
              title={`Create New Term ${collateralToken.symbol ?? ''}${
                watchInterestRate ? '-' + formatNumberDecimal(watchInterestRate) + '%' : ''
              }${watchBorrowRatio ? '-' + formatNumberDecimal(watchBorrowRatio) : ''}`}
              extra="w-full"
              disabled={!collateralToken.decimals || !formState.isValid}
            />
          </div>
        </form>
      </div>
    </>
  );
}
