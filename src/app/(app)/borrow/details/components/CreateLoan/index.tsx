import { readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import StepModal from 'components/stepLoader';
import { Step } from 'components/stepLoader/stepType';
import { ERC20PermitABI, TermABI, GatewayABI, UniswapRouterABI } from 'lib/contracts';
import React, { useEffect, useState } from 'react';
import { erc20Abi, Abi, Address, formatUnits, parseUnits } from 'viem';
import moment from 'moment';
import { formatCurrencyValue, formatDecimal, usdcToGUsdc, toLocaleString } from 'utils/numbers';
import { AlertMessage } from 'components/message/AlertMessage';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { LendingTerms } from 'types/lending';
import { getTitleDisabled } from './helper';
import { simpleBorrow } from './helper/simpleBorrow';
import DefiInputBox from 'components/box/DefiInputBox';
import { wagmiConfig } from 'contexts/Web3Provider';
import { RangeSlider } from 'components/rangeSlider/RangeSlider';
import { useAccount, useReadContracts } from 'wagmi';
import { lendingTermConfig, permitConfig } from 'config';
import { signPermit } from 'lib/transactions/signPermit';
import { getAllowBorrowedCreditCall, getPullCollateralCalls } from './helper/borrowWithLeverage';
import { toastError } from 'components/toast';
import { useAppStore } from 'store';
import { marketsConfig } from 'config';
import { secondsToAppropriateUnit } from 'utils/date';
import { QuestionMarkIcon, TooltipHorizon } from 'components/tooltip';
import { getPegTokenLogo } from 'config';
import { approvalStepsFlow } from 'utils/approvalHelper';

function CreateLoan({
  lendingTerm,
  availableDebt,
  creditMultiplier,
  creditBalance,
  pegTokenBalance,
  creditTokenNonces,
  minBorrow,
  setReload,
  reload
}: {
  lendingTerm: LendingTerms;
  availableDebt: number;
  creditMultiplier: bigint;
  creditBalance: bigint;
  pegTokenBalance: bigint;
  creditTokenNonces: bigint;
  minBorrow: number;
  reload: boolean;
  setReload: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { contractsList, coinDetails, appMarketId, appChainId, psmPegTokenBalance } = useAppStore();
  const { address } = useAccount();
  const [borrowAmount, setBorrowAmount] = useState<bigint>(BigInt(0));
  const [collateralAmount, setCollateralAmount] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [minToRepay, setMinToRepay] = useState<string>('');
  const [withLeverage, setWithLeverage] = useState<boolean>(false);
  const [leverageValue, setLeverageValue] = useState<number>(1);
  const [withOverCollateralization, setWithOverCollateralization] = useState<boolean>(true);
  const [overCollateralizationValue, setOverCollateralizationValue] = useState<number>(
    Math.round(105 + lendingTerm.openingFee * 100)
  );
  const [flashLoanBorrowAmount, setFlashLoanBorrowAmount] = useState<bigint>(BigInt(0));
  const [flashLoanCollateralAmount, setFlashLoanCollateralAmount] = useState<bigint>(BigInt(0));
  const updateStepStatus = (stepName: string, status: Step['status'], description?: any[]) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.name === stepName ? { ...step, status, description: description } : step))
    );
  };
  const [steps, setSteps] = useState<Step[]>([]);

  const creditAddress = contractsList?.marketContracts[appMarketId].creditAddress;
  const psmAddress = contractsList?.marketContracts[appMarketId].psmAddress;

  /* Smart contract reads */
  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: lendingTerm.collateral.address as Address,
        abi: erc20Abi as Abi,
        functionName: 'balanceOf',
        args: [address],
        chainId: appChainId
      },
      {
        address: lendingTerm.collateral.address as Address,
        abi: ERC20PermitABI as Abi,
        functionName: 'nonces',
        args: [address],
        chainId: appChainId
      },
      {
        address: lendingTerm.collateral.address as Address,
        abi: erc20Abi as Abi,
        functionName: 'name',
        chainId: appChainId
      },
      {
        address: creditAddress as Address,
        abi: erc20Abi as Abi,
        functionName: 'name',
        chainId: appChainId
      }
    ],
    query: {
      select: (data) => {
        return {
          collateralBalance: formatUnits(data[0].result as bigint, lendingTerm.collateral.decimals),
          collateralNonces: data[1].result as bigint,
          collaternalTokenName: data[2].result as string,
          creditTokenName: data[3].result as string
        };
      }
    }
  });
  /* End Smart contract reads */

  useEffect(() => {
    if (borrowAmount) {
      getMinToRepay();
    }
  }, [borrowAmount]);

  useEffect(() => {
    if (reload) {
      refetch();
      setReload(false);
    }
  }, [reload]);

  /* Calculate borrow amount */
  useEffect(() => {
    const borrowAmount: bigint = calculateBorrowAmount(collateralAmount);
    const flashLoanBorrowAmount: bigint = calculateBorrowAmount(
      (Number(collateralAmount) * (leverageValue - 1)).toString()
    );

    const flashLoanCollateralAmount =
      (parseUnits(collateralAmount, lendingTerm.collateral.decimals) * parseUnits((leverageValue - 1).toString(), 1)) /
      BigInt(10);

    setBorrowAmount(borrowAmount);
    setFlashLoanBorrowAmount(flashLoanBorrowAmount);
    setFlashLoanCollateralAmount(flashLoanCollateralAmount);
  }, [collateralAmount, overCollateralizationValue, leverageValue]);

  /****** Smart contract writes *******/

  async function borrowGateway() {
    setShowModal(true);

    const checkStepName = `Check ${lendingTerm.collateral.symbol} allowance`;
    const approveStepName = `Approve ${lendingTerm.collateral.symbol}`;

    const createSteps = (): Step[] => {
      const baseSteps: Step[] = [];
      if (
        permitConfig.find((item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase())
          ?.hasPermit
      ) {
        baseSteps.push({
          name: `Sign Permit for ${lendingTerm.collateral.symbol}`,
          status: 'Not Started'
        });
      } else {
        baseSteps.push({ name: checkStepName, status: 'Not Started' });
        baseSteps.push({ name: approveStepName, status: 'Not Started' });
      }

      baseSteps.push({ name: `Sign Permit for ${creditTokenSymbol}`, status: 'Not Started' });
      baseSteps.push({ name: 'Borrow + Redeem (Multicall)', status: 'Not Started' });

      return baseSteps;
    };
    setSteps(createSteps());

    let signatureCollateral: any;
    let permitSigCreditToken: any;

    /* Set allowance for collateral token */
    if (
      permitConfig.find((item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase())
        ?.hasPermit
    ) {
      try {
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'In Progress');

        signatureCollateral = await signPermit({
          contractAddress: lendingTerm.collateral.address,
          erc20Name: data?.collaternalTokenName,
          ownerAddress: address,
          spenderAddress: contractsList.gatewayAddress as Address,
          value: parseUnits(collateralAmount, lendingTerm.collateral.decimals),
          deadline: BigInt(Math.floor((Date.now() + 15 * 60 * 1000) / 1000)),
          nonce: data?.collateralNonces,
          chainId: appChainId,
          version: '1'
        });

        if (!signatureCollateral) {
          updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'Error');
          return;
        }
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'Success');
      } catch (e) {
        console.log(e);
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'Error');
        return;
      }
    } else {
      try {
        const approvalSuccess = await approvalStepsFlow(
          address,
          contractsList.gatewayAddress,
          lendingTerm.collateral.address,
          parseUnits(collateralAmount, lendingTerm.collateral.decimals),
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
    }

    /* Set allowance for credit token */
    try {
      updateStepStatus(`Sign Permit for ${creditTokenSymbol}`, 'In Progress');

      permitSigCreditToken = await signPermit({
        contractAddress: creditAddress as Address,
        erc20Name: data?.creditTokenName,
        ownerAddress: address,
        spenderAddress: contractsList.gatewayAddress as Address,
        value: borrowAmount,
        deadline: BigInt(Math.floor((Date.now() + 15 * 60 * 1000) / 1000)),
        nonce: creditTokenNonces,
        chainId: appChainId,
        version: '1'
      });

      if (!permitSigCreditToken) {
        updateStepStatus(`Sign Permit for ${creditTokenSymbol}`, 'Error');
        return;
      }
      updateStepStatus(`Sign Permit for ${creditTokenSymbol}`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus(`Sign Permit for ${creditTokenSymbol}`, 'Error');
      return;
    }

    /* Call gateway.multicall() */
    try {
      const calls = simpleBorrow(
        address,
        lendingTerm,
        borrowAmount,
        parseUnits(collateralAmount, lendingTerm.collateral.decimals),
        signatureCollateral,
        permitSigCreditToken,
        creditAddress,
        psmAddress
      );

      updateStepStatus(`Borrow + Redeem (Multicall)`, 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'multicall',
        args: [calls],
        gas: 1_250_000
      });

      const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkBorrow.status === 'success') {
        setTimeout(function () {
          setReload(true);
        }, 5000);
        setBorrowAmount(BigInt(0));
        setCollateralAmount('');
        updateStepStatus('Borrow + Redeem (Multicall)', 'Success');
        return;
      } else {
        updateStepStatus('Borrow + Redeem (Multicall)', 'Error');
      }

      updateStepStatus(`Borrow + Redeem (Multicall)`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus('Borrow + Redeem (Multicall)', 'Error');
      return;
    }
  }

  async function borrowGatewayLeverage() {
    setShowModal(true);

    const checkStepName = `Check ${lendingTerm.collateral.symbol} allowance`;
    const approveStepName = `Approve ${lendingTerm.collateral.symbol}`;

    const createSteps = (): Step[] => {
      const baseSteps: Step[] = [];
      if (
        permitConfig.find((item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase())
          ?.hasPermit
      ) {
        baseSteps.push({
          name: `Sign Permit for ${lendingTerm.collateral.symbol}`,
          status: 'Not Started'
        });
      } else {
        baseSteps.push({ name: checkStepName, status: 'Not Started' });
        baseSteps.push({ name: approveStepName, status: 'Not Started' });
      }

      baseSteps.push({ name: `Sign Permit for ${creditTokenSymbol}`, status: 'Not Started' });
      baseSteps.push({ name: 'Flashloan + Borrow + Redeem (Multicall)', status: 'Not Started' });

      return baseSteps;
    };

    setSteps(createSteps());

    let signatureCollateral: any;
    let permitSigCreditToken: any;
    const debtAmount = borrowAmount + flashLoanBorrowAmount;

    /* Set allowance for collateral token */
    if (
      permitConfig.find((item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase())
        ?.hasPermit
    ) {
      try {
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'In Progress');

        signatureCollateral = await signPermit({
          contractAddress: lendingTerm.collateral.address,
          erc20Name: lendingTerm.collateral.name,
          ownerAddress: address,
          spenderAddress: contractsList.gatewayAddress as Address,
          value: parseUnits(collateralAmount, lendingTerm.collateral.decimals),
          deadline: BigInt(Math.floor((Date.now() + 15 * 60 * 1000) / 1000)),
          nonce: data?.collateralNonces,
          chainId: appChainId,
          version: '1'
        });

        if (!signatureCollateral) {
          updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'Error');
          return;
        }
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'Success');
      } catch (e) {
        console.log(e);
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'Error');
        return;
      }
    } else {
      try {
        const approvalSuccess = await approvalStepsFlow(
          address,
          contractsList.gatewayAddress,
          lendingTerm.collateral.address,
          parseUnits(collateralAmount, lendingTerm.collateral.decimals),
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
    }

    /* Set allowance for CREDIT token */
    try {
      updateStepStatus(`Sign Permit for ${creditTokenSymbol}`, 'In Progress');

      permitSigCreditToken = await signPermit({
        contractAddress: creditAddress as Address,
        erc20Name: data?.creditTokenName,
        ownerAddress: address,
        spenderAddress: contractsList.gatewayAddress as Address,
        value: debtAmount,
        deadline: BigInt(Math.floor((Date.now() + 15 * 60 * 1000) / 1000)),
        nonce: creditTokenNonces,
        chainId: appChainId,
        version: '1'
      });

      if (!permitSigCreditToken) {
        updateStepStatus(`Sign Permit for ${creditTokenSymbol}`, 'Error');
        return;
      }
      updateStepStatus(`Sign Permit for ${creditTokenSymbol}`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus(`Sign Permit for ${creditTokenSymbol}`, 'Error');
      return;
    }

    /* Call gateway.multicall() */
    try {
      const pullCollateralCalls = getPullCollateralCalls(
        lendingTerm,
        parseUnits(collateralAmount, lendingTerm.collateral.decimals),
        signatureCollateral
      );

      const allowBorrowedCreditCall = getAllowBorrowedCreditCall(
        debtAmount,
        permitSigCreditToken,
        contractsList,
        appMarketId
      );

      updateStepStatus(`Flashloan + Borrow + Redeem (Multicall)`, 'In Progress');

      /*** Calculate maxLoanDebt with 1% slippage ***/
      const path = [pegToken.address, lendingTerm.collateral.address];

      //get min amount of pegToken to swap with collateral from uniswap
      const result = await readContract(wagmiConfig, {
        address: contractsList.uniswapRouterAddress,
        abi: UniswapRouterABI,
        functionName: 'getAmountsIn',
        args: [flashLoanCollateralAmount, path],
        chainId: appChainId as any
      });
      const minUsdcAmount = usdcToGUsdc(result[0], creditMultiplier);
      const maxLoanDebt = minUsdcAmount + minUsdcAmount / BigInt(100);

      /*** End Calculate maxLoanDebt ***/

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'borrowWithBalancerFlashLoan',
        args: [
          lendingTerm.address,
          psmAddress,
          contractsList.uniswapRouterAddress,
          lendingTerm.collateral.address,
          pegToken.address,
          parseUnits(collateralAmount, lendingTerm.collateral.decimals),
          flashLoanCollateralAmount,
          maxLoanDebt,
          pullCollateralCalls,
          ...allowBorrowedCreditCall
        ]
      });

      const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkBorrow.status === 'success') {
        setTimeout(function () {
          setReload(true);
        }, 5000);
        setBorrowAmount(BigInt(0));
        setCollateralAmount('');
        updateStepStatus('Flashloan + Borrow + Redeem (Multicall)', 'Success');
        return;
      } else {
        updateStepStatus('Flashloan + Borrow + Redeem (Multicall)', 'Error');
      }

      updateStepStatus(`Flashloan + Borrow + Redeem (Multicall)`, 'Success');
    } catch (e) {
      console.log(e);
      toastError(e.shortMessage);
      updateStepStatus('Flashloan + Borrow + Redeem (Multicall)', 'Error');
      return;
    }
  }

  /* End Smart contract writes */

  /* Handlers and getters */
  const calculateBorrowAmount = (collateralAmount: string) => {
    let borrowAmount: bigint =
      overCollateralizationValue != 0
        ? (((parseUnits(collateralAmount, lendingTerm.collateral.decimals) *
            BigInt(10 ** (18 - lendingTerm.collateral.decimals)) *
            parseUnits(lendingTerm.borrowRatio.toString(), 18)) /
            creditMultiplier) *
            parseUnits('1', 18)) /
          parseUnits(Number(overCollateralizationValue / 100).toString(), 18)
        : (parseUnits(collateralAmount, lendingTerm.collateral.decimals) *
            BigInt(10 ** (18 - lendingTerm.collateral.decimals)) *
            parseUnits(lendingTerm.borrowRatio.toString(), 18)) /
          creditMultiplier;
    return borrowAmount;
  };

  const handleCollateralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Verify input is a number
    if (/^[0-9]+\.?[0-9]*$/i.test(inputValue)) {
      setCollateralAmount(inputValue as string);
    }
  };

  const setMax = () => {
    //max borrow of credit given the collateral amount in wallet
    /*const maxBorrow =
      (Number(data?.collateralBalance) * lendingTerm.borrowRatio) /
      Number(formatUnits(creditMultiplier, 18))*/

    setCollateralAmount(data?.collateralBalance.toString());

    /*setCollateralAmount(
      maxBorrow < availableDebt
        ? data?.collateralBalance.toString()
        : (
            (availableDebt / lendingTerm.borrowRatio) *
            Number(formatUnits(creditMultiplier, 18))
          ).toString()
    )*/
  };

  async function getMinToRepay() {
    setMinToRepay(((lendingTerm.minPartialRepayPercent * Number(formatUnits(borrowAmount, 18))) / 100).toString());
  }

  const getBorrowFunction = () => {
    withLeverage && leverageValue > 0 ? borrowGatewayLeverage() : borrowGateway();
  };
  /* End Handlers and getters */

  const collateralToken = coinDetails.find(
    (item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase()
  );
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const creditTokenSymbol = 'g' + pegToken.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const creditTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} setSteps={setSteps} />}

      <div className="h-full rounded-md text-gray-700 dark:text-gray-200">
        <div className="mt-2 flex flex-col gap-2">
          <DefiInputBox
            topLabel={'Amount of' + ' ' + lendingTerm.collateral.symbol + ' ' + 'to deposit'}
            currencyLogo={lendingTerm.collateral.logo}
            currencySymbol={lendingTerm.collateral.symbol}
            placeholder="0"
            pattern="[0-9]*\.[0-9]"
            inputSize="text-2xl xl:text-3xl"
            value={collateralAmount}
            onChange={handleCollateralChange}
            leftLabel={
              <span className="text-sm font-medium text-gray-400 dark:text-gray-700">
                ≈ ${formatDecimal(collateralToken.price * Number(collateralAmount), 2)}
              </span>
            }
            rightLabel={
              <span style={{ whiteSpace: 'nowrap' }}>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available: {formatDecimal(Number(data?.collateralBalance), pegTokenDecimalsToDisplay)}
                </span>{' '}
                <button className="text-sm font-medium text-brand-500 hover:text-brand-400" onClick={(e) => setMax()}>
                  Max
                </button>
              </span>
            }
          />

          <DefiInputBox
            disabled={true}
            topLabel={`Amount of ${pegToken.symbol} to borrow`}
            currencyLogo={pegTokenLogo}
            currencySymbol={pegToken.symbol}
            placeholder="0"
            pattern="[0-9]*\.[0-9]"
            inputSize="text-2xl xl:text-3xl"
            value={formatDecimal(
              Number(formatUnits(borrowAmount + flashLoanBorrowAmount, 18)) * Number(formatUnits(creditMultiplier, 18)),
              creditTokenDecimalsToDisplay
            )}
            leftLabel={
              <span className="text-sm font-medium text-gray-400 dark:text-gray-700">
                ≈ $
                {formatDecimal(
                  pegToken.price *
                    Number(formatUnits(borrowAmount + flashLoanBorrowAmount, 18)) *
                    Number(formatUnits(creditMultiplier, 18)),
                  2
                )}
              </span>
            }
            rightLabel={
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Balance:{' '}
                  {formatDecimal(Number(formatUnits(pegTokenBalance, pegToken.decimals)), creditTokenDecimalsToDisplay)}
                </p>
              </>
            }
          />

          <div className="flex flex-col gap-4 rounded-xl bg-gray-100 py-4 dark:bg-navy-900">
            <div className="w-full px-5">
              <RangeSlider
                withSwitch={true}
                title={`Over-collateralization: ${overCollateralizationValue}%`}
                value={overCollateralizationValue}
                onChange={(value) => setOverCollateralizationValue(value)}
                min={Math.round(105 + lendingTerm.openingFee * 100)}
                max={300}
                step={1}
                show={withOverCollateralization}
                setShow={() => {
                  setOverCollateralizationValue(
                    withOverCollateralization ? 0 : Math.round(105 + lendingTerm.openingFee * 100)
                  );
                  setWithOverCollateralization(!withOverCollateralization);
                  setWithLeverage(false);
                  setLeverageValue(1);
                }}
              />
              {overCollateralizationValue == 0 ? (
                <AlertMessage type="warning" message={<span>Your loan might be called instantly</span>} />
              ) : (
                <div className="mt-4">
                  <AlertMessage
                    type="info"
                    message={
                      <TooltipHorizon
                        extra=""
                        content={
                          <div className="w-[20rem] p-2 dark:text-white">
                            <p>
                              With interests accruing at {formatDecimal(100 * lendingTerm.interestRate, 2)} % APR, and
                              an overcollateralization of {overCollateralizationValue}%, the interests will make your
                              position go above the max borrow ratio after{' '}
                              {secondsToAppropriateUnit(
                                Math.floor(
                                  ((overCollateralizationValue / 100 - 1) / lendingTerm.interestRate) *
                                    365.25 *
                                    3600 *
                                    24
                                )
                              )}
                              .
                            </p>
                            <p className="mt-3">
                              When your loan is above the max borrow ratio, it might be called at any time.
                            </p>
                            <p className="mt-3">
                              You can add collateral or do a partial repay at any time to improve your borrow ratio.
                            </p>
                          </div>
                        }
                        trigger={
                          <span>
                            Runway before call :{' '}
                            <strong>
                              {secondsToAppropriateUnit(
                                Math.floor(
                                  ((overCollateralizationValue / 100 - 1) / lendingTerm.interestRate) *
                                    365.25 *
                                    3600 *
                                    24
                                )
                              )}
                            </strong>
                          </span>
                        }
                        placement="top"
                      />
                    }
                  />
                </div>
              )}
            </div>

            {lendingTermConfig.find((item) => item.termAddress === lendingTerm.address)?.maxLeverage && (
              <div className="mt w-full px-5">
                <RangeSlider
                  withSwitch={true}
                  title={`Leverage: ${leverageValue}x`}
                  value={leverageValue}
                  onChange={(value) => setLeverageValue(value)}
                  min={1}
                  max={lendingTermConfig.find((item) => item.termAddress === lendingTerm.address)?.maxLeverage}
                  step={0.1}
                  show={withLeverage}
                  setShow={() => {
                    setLeverageValue(1);
                    setWithLeverage(!withLeverage);
                    setWithOverCollateralization(false);
                    setOverCollateralizationValue(0);
                  }}
                />
              </div>
            )}
          </div>
          <ButtonPrimary
            variant="lg"
            title="Borrow"
            titleDisabled={getTitleDisabled(
              pegToken?.symbol,
              Number(collateralAmount),
              Number(formatUnits(borrowAmount, 18)),
              Number(data?.collateralBalance),
              availableDebt,
              (Number(data?.collateralBalance) * lendingTerm.borrowRatio) / Number(formatUnits(creditMultiplier, 18)),
              minBorrow,
              Number(formatUnits(borrowAmount, 18)) * Number(formatUnits(creditMultiplier, 18)),
              Number(formatUnits(psmPegTokenBalance, pegToken.decimals)),
              withLeverage
            )}
            extra="w-full !rounded-xl"
            onClick={getBorrowFunction}
            disabled={
              getTitleDisabled(
                pegToken?.symbol,
                Number(collateralAmount),
                Number(formatUnits(borrowAmount, 18)),
                Number(data?.collateralBalance),
                availableDebt,
                (Number(data?.collateralBalance) * lendingTerm.borrowRatio) / Number(formatUnits(creditMultiplier, 18)),
                minBorrow,
                Number(formatUnits(borrowAmount, 18)) * Number(formatUnits(creditMultiplier, 18)),
                Number(formatUnits(psmPegTokenBalance, pegToken.decimals)),
                withLeverage
              ).length != 0
            }
          />

          {lendingTerm.openingFee > 0 && Number(formatUnits(borrowAmount, 18)) >= minBorrow && (
            <AlertMessage
              type="warning"
              message={
                <p>
                  <span className="font-bold">
                    {' '}
                    {toLocaleString(
                      formatDecimal(
                        Number(formatUnits(borrowAmount, 18)) *
                          lendingTerm.openingFee *
                          Number(formatUnits(creditMultiplier, 18)),
                        2
                      )
                    )}{' '}
                    {pegToken?.symbol}{' '}
                  </span>{' '}
                  of interest will accrue instantly after opening the loan.
                </p>
              }
            />
          )}
          {lendingTerm.maxDelayBetweenPartialRepay > 0 && Number(formatUnits(borrowAmount, 18)) >= minBorrow && (
            <AlertMessage
              type="warning"
              message={
                <p className="">
                  You will have to repay{' '}
                  <strong>{formatDecimal(Number(minToRepay), 2) * Number(formatUnits(creditMultiplier, 18))}</strong>{' '}
                  {pegToken?.symbol} by{' '}
                  <strong>
                    {moment().add(lendingTerm.maxDelayBetweenPartialRepay, 'seconds').format('DD/MM/YYYY HH:mm:ss')}
                  </strong>{' '}
                  or your loan will be <strong> called</strong>.
                </p>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

export default CreateLoan;
