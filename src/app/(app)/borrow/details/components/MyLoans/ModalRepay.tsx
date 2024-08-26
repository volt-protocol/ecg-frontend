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
import { getPegTokenLogo, getLeverageConfig } from 'config';
import clsx from 'clsx';
import { useAppStore, useUserPrefsStore } from 'store';
import Image from 'next/image';
import { TooltipHorizon } from 'components/tooltip';
import { getCreditTokenSymbol } from 'utils/strings';

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
  getRepayGatewayLeverageData,
  minBorrow
}: {
  isOpen: boolean;
  setOpen: (arg: boolean) => void;
  creditBalance: bigint;
  pegTokenBalance: bigint;
  creditMultiplier: bigint;
  rowData: any;
  repay: (id: string) => void;
  partialRepay: (id: string, amount: string) => void;
  repayGateway: (id: string, amount: string) => void;
  partialRepayGateway: (id: string, amount: string) => void;
  repayGatewayLeverage: (id: string) => void;
  getRepayGatewayLeverageData: (id: string) => any;
  minBorrow: bigint;
}) {
  const [value, setValue] = useState<string>('');
  const [match, setMatch] = useState<boolean>(false);
  const [leverageData, setLeverageData] = useState<any>(null);
  const [loadingLeverageData, setLoadingLeverageData] = useState<any>(false);
  const [withLeverage, setWithLeverage] = useState<boolean>(false);
  const { coinDetails, contractsList, lendingTerms } = useAppStore();
  const { appMarketId, appChainId } = useUserPrefsStore();

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const creditTokenSymbol = getCreditTokenSymbol(coinDetails, appMarketId, contractsList);
  const creditTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);
  const normalizer = BigInt('1' + '0'.repeat(36 - pegToken.decimals));
  const pegTokenDebt: bigint = (BigInt(rowData?.loanDebt || 0) * creditMultiplier) / normalizer;
  const lendingTerm = lendingTerms.find((item) => item.address.toLowerCase() == rowData?.termAddress.toLowerCase());
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const collateralToken = coinDetails.find(
    (item) => item.address.toLowerCase() === lendingTerm?.collateral.address.toLowerCase()
  );
  const collateralTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(collateralToken?.price * 100)), 0);

  if (rowData && withLeverage && !leverageData && !loadingLeverageData) {
    setLoadingLeverageData(true);
    getRepayGatewayLeverageData(rowData?.id).then(function (data) {
      setLeverageData(data);
      setLoadingLeverageData(false);
    });
  }

  // Reset value when modal opens
  useEffect(() => {
    setValue('');
    setWithLeverage(false);
  }, [isOpen]);

  useEffect(() => {
    if (rowData) {
      setMatch(parseUnits(value, pegToken.decimals) >= pegTokenDebt);
    }
  }, [value, rowData]);

  /* Handlers */
  const setAvailable = (): string => {
    return formatDecimal(Number(formatUnits(pegTokenBalance, pegToken.decimals)), creditTokenDecimalsToDisplay);
  };

  const setMax = () => {
    pegTokenBalance > pegTokenDebt
      ? setValue(formatUnits(pegTokenDebt, pegToken.decimals))
      : setValue(formatUnits(pegTokenBalance, pegToken.decimals));
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Verify input is a number
    if (/^[0-9]+\.?[0-9]*$/i.test(inputValue)) {
      (parseUnits(inputValue, pegToken.decimals) * normalizer) / BigInt('1' + '0'.repeat(18)) > rowData.loanDebt
        ? setValue(formatUnits(pegTokenDebt, pegToken.decimals))
        : setValue(inputValue as string);
    }
  };

  const doRepay = () => {
    withLeverage
      ? repayGatewayLeverage(rowData.id)
      : match
      ? repayGateway(rowData.id, value)
      : partialRepayGateway(rowData.id, value);
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
                      {!withLeverage && (
                        <DefiInputBox
                          topLabel={`Amount of ${pegToken.symbol} to repay`}
                          currencyLogo={pegTokenLogo}
                          currencySymbol={pegToken.symbol}
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
                                {formatDecimal(
                                  Number(formatUnits(pegTokenDebt, pegToken.decimals)),
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
                      )}

                      {getLeverageConfig(
                        lendingTerm,
                        coinDetails,
                        contractsList?.marketContracts[appMarketId].pegTokenAddress
                      ).maxLeverage && (
                        <div className="flex flex-col gap-4 rounded-xl bg-gray-100 py-4 dark:bg-navy-900">
                          <div className="mt w-full px-5">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Full Repay with Flashloan
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
                            {withLeverage && (
                              <div>
                                <div className="mt-1 text-sm opacity-50 dark:text-white">
                                  This will not use any tokens in your wallet. Instead, you will take a flashloan of the
                                  amount of your debt, repay your debt, and swap as much collateral as needed to repay
                                  the flashloan. This option will only work if your loan is overcollateralized. The
                                  remaining collateral and debt tokens will be sent to your wallet if any.
                                </div>
                                {loadingLeverageData ? (
                                  <div className="mt-2 flex items-center justify-center">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500"></div>
                                    <span className="ml-2 text-sm opacity-50 dark:text-white">
                                      Finding the optimal swap parameters...
                                    </span>
                                  </div>
                                ) : null}
                                {leverageData && (
                                  <div className="mt-1 text-sm dark:text-white">
                                    <div className="px-5">
                                      <div className="text-xs">
                                        <span className="font-mono">1.</span>{' '}
                                        <Image
                                          src="/img/balancer.png"
                                          width={24}
                                          height={24}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        Flashloan{' '}
                                        <Image
                                          src={pegTokenLogo}
                                          width={18}
                                          height={18}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        {formatDecimal(
                                          Number(formatUnits(leverageData.input.pegTokenDebt, pegToken?.decimals)),
                                          pegTokenDecimalsToDisplay
                                        )}{' '}
                                        {pegToken?.symbol}
                                      </div>
                                      <div className="text-xs">
                                        <span className="font-mono">2.</span>{' '}
                                        <Image
                                          src="/img/crypto-logos/guild.png"
                                          width={24}
                                          height={24}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        Repay debt{' '}
                                      </div>
                                      <div className="text-xs">
                                        <span className="font-mono">3.</span>{' '}
                                        {getLeverageConfig(
                                          lendingTerm,
                                          coinDetails,
                                          contractsList?.marketContracts[appMarketId].pegTokenAddress
                                        ).leverageDex === 'pendle' ? (
                                          <Image
                                            src="/img/crypto-logos/pendle.png"
                                            width={24}
                                            height={24}
                                            alt={''}
                                            className="mr-1 inline-block rounded-full align-middle"
                                          />
                                        ) : (
                                          <Image
                                            src="/img/kyberswap.png"
                                            width={24}
                                            height={24}
                                            alt={''}
                                            className="mr-1 inline-block rounded-full align-middle"
                                          />
                                        )}
                                        Swap{' '}
                                        <Image
                                          src={lendingTerm.collateral.logo}
                                          width={18}
                                          height={18}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        {false ? (
                                          <span>
                                            {formatDecimal(
                                              Math.round(
                                                1e6 *
                                                  Number(
                                                    formatUnits(
                                                      leverageData.input.collateralAmount -
                                                        leverageData.input.minCollateralRemaining,
                                                      collateralToken?.decimals
                                                    )
                                                  )
                                              ) / 1e6,
                                              collateralTokenDecimalsToDisplay
                                            )}{' '}
                                          </span>
                                        ) : null}
                                        {collateralToken?.symbol} for{' '}
                                        <Image
                                          src={pegTokenLogo}
                                          width={18}
                                          height={18}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        {pegToken?.symbol} (
                                        <TooltipHorizon
                                          extra=""
                                          content={
                                            <div className="p-2 dark:text-white">
                                              Amount in: ${formatDecimal(leverageData.output.amountInUsd, 2)}
                                              <br />
                                              Amount out: ${formatDecimal(leverageData.output.amountOutUsd, 2)}
                                              <br />
                                              <br />
                                              Amount in:{' '}
                                              {formatDecimal(
                                                Number(
                                                  formatUnits(
                                                    leverageData.input.collateralAmount -
                                                      leverageData.input.minCollateralRemaining,
                                                    collateralToken?.decimals
                                                  )
                                                ),
                                                collateralTokenDecimalsToDisplay
                                              )}{' '}
                                              {collateralToken?.symbol}
                                              <br />
                                              Amount out: ≈{' '}
                                              {formatDecimal(
                                                Number(formatUnits(leverageData.output.amountOut, pegToken?.decimals)),
                                                pegTokenDecimalsToDisplay
                                              )}{' '}
                                              {pegToken?.symbol}
                                            </div>
                                          }
                                          trigger={
                                            !leverageData.output.amountInUsd ? null : (
                                              <span>
                                                {leverageData.output.amountOutUsd >= leverageData.output.amountInUsd
                                                  ? '+'
                                                  : '-'}
                                                {Math.round(
                                                  10000 *
                                                    Math.abs(
                                                      1 -
                                                        leverageData.output.amountOutUsd /
                                                          leverageData.output.amountInUsd
                                                    )
                                                ) / 100}
                                                %
                                              </span>
                                            )
                                          }
                                          placement="top"
                                        />
                                        )
                                      </div>
                                      <div className="pl-10 font-mono text-xs">
                                        -{' '}
                                        {formatDecimal(
                                          Number(
                                            formatUnits(
                                              leverageData.input.collateralAmount -
                                                leverageData.input.minCollateralRemaining,
                                              collateralToken?.decimals
                                            )
                                          ),
                                          collateralTokenDecimalsToDisplay
                                        )}{' '}
                                        {collateralToken?.symbol}
                                        <br />+{' '}
                                        {formatDecimal(
                                          Number(formatUnits(leverageData.output.amountOut, pegToken?.decimals)),
                                          pegTokenDecimalsToDisplay
                                        )}{' '}
                                        {pegToken?.symbol} (estimated)
                                      </div>
                                      <div className="text-xs">
                                        <span className="font-mono">4.</span>{' '}
                                        <Image
                                          src="/img/balancer.png"
                                          width={24}
                                          height={24}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        Repay Flashloan
                                      </div>
                                      <div className="text-xs">
                                        <span className="font-mono">5.</span>{' '}
                                        <Image
                                          src="/img/crypto-logos/guild.png"
                                          width={24}
                                          height={24}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        Receive at least{' '}
                                        <Image
                                          src={lendingTerm.collateral.logo}
                                          width={18}
                                          height={18}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        {formatDecimal(
                                          Math.round(
                                            1e6 *
                                              Number(
                                                formatUnits(
                                                  leverageData.input.minCollateralRemaining,
                                                  collateralToken?.decimals
                                                )
                                              )
                                          ) / 1e6,
                                          collateralTokenDecimalsToDisplay
                                        )}{' '}
                                        {collateralToken?.symbol}
                                      </div>
                                      <div className="text-xs">
                                        <span className="font-mono">6.</span>{' '}
                                        <Image
                                          src="/img/crypto-logos/guild.png"
                                          width={24}
                                          height={24}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        Receive approximately{' '}
                                        <Image
                                          src={pegTokenLogo}
                                          width={18}
                                          height={18}
                                          alt={''}
                                          className="mr-1 inline-block rounded-full align-middle"
                                        />
                                        {formatDecimal(
                                          Math.round(
                                            1e6 *
                                              (Number(formatUnits(leverageData.output.amountOut, pegToken?.decimals)) -
                                                Number(
                                                  formatUnits(leverageData.input.pegTokenDebt, pegToken?.decimals)
                                                ))
                                          ) / 1e6,
                                          collateralTokenDecimalsToDisplay
                                        )}{' '}
                                        {pegToken?.symbol}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <ButtonPrimary
                        variant="lg"
                        title={
                          withLeverage
                            ? 'Full Repay with Flashloan'
                            : rowData && parseUnits(value, pegToken.decimals) >= pegTokenDebt
                            ? 'Full Repay'
                            : 'Partial Repay'
                        }
                        titleDisabled={getTitleDisabled(
                          pegToken?.symbol,
                          pegToken?.decimals,
                          value,
                          rowData.loanDebt,
                          pegTokenBalance,
                          creditMultiplier,
                          minBorrow,
                          match,
                          withLeverage
                        )}
                        extra="w-full !rounded-xl"
                        disabled={
                          getTitleDisabled(
                            pegToken?.symbol,
                            pegToken?.decimals,
                            value,
                            rowData.loanDebt,
                            pegTokenBalance,
                            creditMultiplier,
                            minBorrow,
                            match,
                            withLeverage
                          ).length != 0 || loadingLeverageData
                        }
                        onClick={doRepay}
                      />
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
