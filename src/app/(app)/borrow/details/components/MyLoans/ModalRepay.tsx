'use client';

import { Fragment, use, useEffect, useState } from 'react';
import { Dialog, Switch, Transition } from '@headlessui/react';
import { MdWarning } from 'react-icons/md';
import ButtonPrimary from 'components/button/ButtonPrimary';
import DefiInputBox from 'components/box/DefiInputBox';
import { formatDecimal } from 'utils/numbers';
import { formatUnits, parseUnits } from 'viem';
import { getTitleDisabled } from './helper';
import Link from 'next/link';
import { getPegTokenLogo, lendingTermConfig } from 'config';
import { RangeSlider } from 'components/rangeSlider/RangeSlider';
import { CurrencyTypes } from 'components/switch/ToggleCredit';
import { parse } from 'path';
import clsx from 'clsx';
import { useAppStore } from 'store';
import { marketsConfig } from 'config';

export default function ModalRepay({
  isOpen,
  setOpen,
  creditBalance,
  pegTokenBalance,
  creditMultiplier,
  rowData,
  repay,
  partialRepay,
  repayGateway,
  partialRepayGateway,
  repayGatewayLeverage,
  minBorrow,
  currencyType
}: {
  isOpen: boolean;
  setOpen: (arg: boolean) => void;
  creditBalance: bigint;
  pegTokenBalance: bigint;
  creditMultiplier: bigint;
  rowData: any;
  repay: (id: string) => void;
  partialRepay: (id: string, amount: string) => void;
  repayGateway: (id: string) => void;
  partialRepayGateway: (id: string, amount: string) => void;
  repayGatewayLeverage: (id: string) => void;
  minBorrow: bigint;
  currencyType: CurrencyTypes;
}) {
  const [value, setValue] = useState<string>('');
  const [match, setMatch] = useState<boolean>(false);
  const [withLeverage, setWithLeverage] = useState<boolean>(false);
  const { appMarketId, appChainId, coinDetails, contractsList } = useAppStore();

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const creditTokenSymbol = 'g' + pegToken.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  const creditTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);
  const normalizer = BigInt('1' + '0'.repeat(36 - pegToken.decimals));
  const pegTokenDebt: bigint = (BigInt(rowData?.loanDebt || 0) * creditMultiplier) / normalizer;

  // Reset value when modal opens
  useEffect(() => {
    setValue('');
    setWithLeverage(false);
  }, [isOpen]);

  useEffect(() => {
    if (withLeverage) {
      setValue(pegTokenDebt.toString());
    }
  }, [withLeverage]);

  useEffect(() => {
    if (rowData) {
      currencyType == 'pegToken'
        ? setMatch(parseUnits(value, pegToken.decimals) >= pegTokenDebt)
        : setMatch(parseUnits(value, 18) >= rowData.loanDebt);
    }
  }, [value, rowData]);

  /* Handlers */
  const setAvailable = (): string => {
    return currencyType == 'pegToken'
      ? formatDecimal(Number(formatUnits(pegTokenBalance, pegToken.decimals)), creditTokenDecimalsToDisplay)
      : formatDecimal(Number(formatUnits(creditBalance, 18)), creditTokenDecimalsToDisplay);
  };

  const setMax = () => {
    currencyType == 'pegToken'
      ? pegTokenBalance > pegTokenDebt
        ? setValue(formatUnits(pegTokenDebt, pegToken.decimals))
        : setValue(formatUnits(pegTokenBalance, pegToken.decimals))
      : creditBalance > rowData.loanDebt
      ? setValue(formatUnits(rowData.loanDebt, 18))
      : setValue(formatUnits(creditBalance, 18));
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^[0-9]+\.?[0-9]*$/i.test(inputValue)) {
      currencyType == 'pegToken'
        ? (parseUnits(inputValue, pegToken.decimals) * normalizer) / BigInt('1' + '0'.repeat(18)) > rowData.loanDebt
          ? setValue(formatUnits(pegTokenDebt, pegToken.decimals))
          : setValue(inputValue as string)
        : parseUnits(inputValue, 18) > rowData.loanDebt
        ? setValue(formatUnits(rowData.loanDebt, 18))
        : setValue(inputValue as string);
    }
  };

  const getBorrowFunction = () => {
    currencyType == 'pegToken'
      ? match
        ? withLeverage
          ? repayGatewayLeverage(rowData.id)
          : repayGateway(rowData.id)
        : partialRepayGateway(rowData.id, value)
      : match
      ? repay(rowData.id)
      : partialRepay(rowData.id, value);
  };

  /* End Handlers */

  return (
    <>
      {rowData && (
        <Transition.Root show={isOpen} as={Fragment}>
          <Dialog as="div" className="relative z-[40]" onClose={setOpen}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-navy-900/90" />
            </Transition.Child>

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                  enterTo="opacity-100 translate-y-0 sm:scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                  leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                >
                  <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-4 text-left shadow-xl transition-all dark:bg-navy-800 sm:my-8 sm:w-full sm:max-w-lg sm:p-5">
                    <h3 className="text-xl font-medium text-gray-800 dark:text-white">Repay Loan</h3>

                    <div className="mt-2 flex w-full flex-col gap-2">
                      <DefiInputBox
                        topLabel={`Amount of ${
                          currencyType == 'pegToken' ? pegToken.symbol : creditTokenSymbol
                        } to repay`}
                        currencyLogo={pegTokenLogo}
                        currencyLogoStyle={
                          currencyType == 'pegToken' ? {} : { borderRadius: '50%', border: '3px solid #3e6b7d' }
                        }
                        currencySymbol={currencyType}
                        placeholder="0"
                        pattern="^[0-9]*[.,]?[0-9]*$"
                        inputSize="text-2xl sm:text-3xl"
                        value={value}
                        onChange={handleValueChange}
                        rightLabel={
                          <>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Available: {setAvailable()}
                            </p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Debt:{' '}
                              {currencyType == 'pegToken'
                                ? formatDecimal(
                                    Number(formatUnits(pegTokenDebt, pegToken.decimals)),
                                    creditTokenDecimalsToDisplay * 2
                                  )
                                : formatDecimal(
                                    Number(formatUnits(rowData?.loanDebt, 18)),
                                    creditTokenDecimalsToDisplay * 2
                                  )}
                            </p>
                            <button
                              className="text-sm font-medium text-brand-500 hover:text-brand-400"
                              onClick={(e) => setMax()}
                            >
                              {rowData && pegTokenBalance > pegTokenDebt ? 'Full Repay' : 'Max'}
                            </button>
                          </>
                        }
                      />

                      {lendingTermConfig.find((item) => item.termAddress === rowData.termAddress)?.hasLeverage &&
                        currencyType == 'pegToken' && (
                          <div className="flex flex-col gap-4 rounded-xl bg-gray-100 py-4 dark:bg-navy-900">
                            <div className="mt w-full px-5">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Full Repay with Leverage
                                </label>
                                <Switch
                                  checked={withLeverage}
                                  onChange={setWithLeverage}
                                  className={clsx(
                                    withLeverage ? 'bg-brand-500' : 'bg-gray-200',
                                    'border-transparent relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out'
                                  )}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={clsx(
                                      withLeverage ? 'translate-x-5' : 'translate-x-0',
                                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                                    )}
                                  />
                                </Switch>
                              </div>
                            </div>
                          </div>
                        )}

                      <ButtonPrimary
                        variant="lg"
                        title={
                          rowData && parseUnits(value, pegToken.decimals) >= pegTokenDebt
                            ? 'Full Repay'
                            : 'Partial Repay'
                        }
                        titleDisabled={getTitleDisabled(
                          value,
                          rowData.loanDebt,
                          currencyType == 'pegToken' ? pegTokenBalance : creditBalance,
                          creditMultiplier,
                          minBorrow,
                          match
                        )}
                        extra="w-full !rounded-xl"
                        disabled={
                          !value ||
                          (currencyType == 'pegToken'
                            ? parseUnits(value, pegToken.decimals) > pegTokenBalance
                            : parseUnits(value, 18) > creditBalance) ||
                          (!match &&
                            rowData.loanDebt - (parseUnits(value, pegToken.decimals) * normalizer) / creditMultiplier <
                              minBorrow)
                        }
                        onClick={getBorrowFunction}
                      />

                      {/* TODO */}
                      {parseUnits(value, pegToken.decimals) > (creditBalance * creditMultiplier) / normalizer && (
                        <div className="my-1 flex items-center justify-center gap-x-3 rounded-md bg-amber-100 px-2.5 py-1.5 text-sm text-amber-500/90 dark:bg-amber-100/0 dark:text-amber-500">
                          <MdWarning className="h-5 w-5" />
                          <p>
                            You do not have enough {creditTokenSymbol}. Go to{' '}
                            <Link href="/mint" className="font-bold">
                              Lend or Redeem
                            </Link>{' '}
                            to mint more with {pegToken.symbol}.
                          </p>
                        </div>
                      )}
                      {/* END TODO */}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition.Root>
      )}
    </>
  );
}
