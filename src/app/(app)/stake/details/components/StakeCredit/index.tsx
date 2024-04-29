import React, { useState } from 'react';
import { readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { toastError } from 'components/toast';
import { TermABI, CreditABI, SurplusGuildMinterABI } from 'lib/contracts';
import { formatCurrencyValue, toLocaleString } from 'utils/numbers';
import { TooltipHorizon } from 'components/tooltip';
import { useAccount } from 'wagmi';
import { Step } from 'components/stepLoader/stepType';
import StepModal from 'components/stepLoader';
import { Abi, ContractFunctionExecutionError, formatUnits, parseEther, Address } from 'viem';
import { QuestionMarkIcon } from 'components/tooltip';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { formatDecimal } from 'utils/numbers';
import { AlertMessage } from 'components/message/AlertMessage';
import DefiInputBox from 'components/box/DefiInputBox';
import { getTitleDisabledStake, getTitleDisabledUnstake } from './helper';
import { LendingTerms } from 'types/lending';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore } from 'store';
import { getPegTokenLogo, marketsConfig } from 'config';
import Image from 'next/image';
import { approvalStepsFlow } from 'utils/approvalHelper';

function StakeCredit({
  debtCeiling,
  lendingTerm,
  creditAllocated,
  textButton,
  creditBalance,
  termAddress,
  sgmMintRatio,
  sgmRewardRatio,
  creditMultiplier,
  reload
}: {
  debtCeiling: number;
  lendingTerm: LendingTerms;
  creditAllocated: bigint;
  textButton: 'Stake' | 'Unstake';
  creditBalance: bigint;
  termAddress: string;
  sgmMintRatio: number;
  sgmRewardRatio: number;
  creditMultiplier: bigint;
  reload: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    appMarketId,
    appChainId,
    coinDetails,
    lendingTerms,
    contractsList,
    fetchLendingTermsUntilBlock,
    minimumCreditStake
  } = useAppStore();
  const [value, setValue] = useState<string>('');
  const { address, isConnected } = useAccount();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [debtDelta, setDebtDelta] = useState(0);

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const creditAddress = contractsList?.marketContracts[appMarketId].creditAddress;
  const surplusGuildMinterAddress = contractsList?.marketContracts[appMarketId].surplusGuildMinterAddress;
  const creditTokenSymbol = 'g' + pegToken.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  const creditTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);
  const creditMultiplierNumber = Number(formatUnits(creditMultiplier, 18));

  const createSteps = (): Step[] => {
    const baseSteps: Step[] = [];
    if (textButton === 'Stake') {
      baseSteps.push({ name: `Check ${creditTokenSymbol} allowance`, status: 'Not Started' });
      baseSteps.push({ name: `Approve ${creditTokenSymbol}`, status: 'Not Started' });
      baseSteps.push({ name: textButton, status: 'Not Started' });
    } else {
      baseSteps.push({
        name: textButton,
        status: 'Not Started'
      });
    }

    return baseSteps;
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^[0-9]*\.?[0-9]*$/i.test(inputValue)) {
      setValue(inputValue as string);

      await getDebtCeilingDelta(inputValue);
    }
  };

  async function handlestake(): Promise<void> {
    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    if (textButton === 'Stake') {
      if (isConnected == false) {
        toastError('Please connect your wallet');
        return;
      }
      if (Number(value) == 0) {
        toastError('Please enter a value');
        return;
      }

      if (Number(value) > creditBalance) {
        toastError(`Not enough ${creditTokenSymbol}`);
        return;
      } else {
        setShowModal(true);
        try {
          const approvalSuccess = await approvalStepsFlow(
            address,
            surplusGuildMinterAddress,
            creditAddress,
            parseEther(value.toString()),
            appChainId,
            updateStepStatus,
            `Check ${creditTokenSymbol} allowance`,
            `Approve ${creditTokenSymbol}`,
            wagmiConfig
          );

          if (!approvalSuccess) {
            updateStepStatus(`Approve ${creditTokenSymbol}`, 'Error');
            return;
          }
        } catch (e) {
          if (e instanceof ContractFunctionExecutionError) {
            console.log(e.shortMessage, 'error');
            console.log(typeof e);
            updateStepStatus(
              `Approve ${creditTokenSymbol}`,
              e.shortMessage.split(':')[1] + e.shortMessage.split(':')[2]
            );
            return;
          } else {
            updateStepStatus(`Approve ${creditTokenSymbol}`, 'Error');
            return;
          }
        }
        updateStepStatus('Stake', 'In Progress');

        try {
          const hash = await writeContract(wagmiConfig, {
            address: surplusGuildMinterAddress,
            abi: SurplusGuildMinterABI,
            functionName: 'stake',
            args: [termAddress, parseEther(value.toString())]
          });

          const checkStake = await waitForTransactionReceipt(wagmiConfig, {
            hash: hash
          });

          if (checkStake.status != 'success') {
            updateStepStatus('Stake', 'Error');
            return;
          }

          const minedBlock = checkStake.blockNumber;

          updateStepStatus('Stake', 'Waiting confirmation...');
          await fetchLendingTermsUntilBlock(minedBlock, appMarketId, appChainId);
        } catch (e) {
          if (e instanceof ContractFunctionExecutionError) {
            console.log(e.shortMessage, 'error');
            console.log(typeof e);
            updateStepStatus('Stake', `Error : ${e.shortMessage.split(':')[1] + e.shortMessage.split(':')[2]}`);
            return;
          } else {
            updateStepStatus('Stake', 'Error');
            return;
          }
        }
        updateStepStatus('Stake', 'Success');
        setValue('');
        setTimeout(function () {
          reload(true);
        }, 3000);
      }
    } else if (textButton === 'Unstake') {
      if (Number(value) > creditAllocated) {
        toastError(`Not enough ${creditTokenSymbol} allocated`);
        return;
      } else {
        setShowModal(true);
        updateStepStatus('Unstake', 'In Progress');
        try {
          const hash = await writeContract(wagmiConfig, {
            address: surplusGuildMinterAddress,
            abi: SurplusGuildMinterABI,
            functionName: 'unstake',
            args: [termAddress, parseEther(value.toString())]
          });

          const checkUnstake = await waitForTransactionReceipt(wagmiConfig, {
            hash: hash
          });

          if (checkUnstake.status != 'success') {
            updateStepStatus('Unstake', 'Error');
            return;
          }
        } catch (e) {
          if (e instanceof ContractFunctionExecutionError) {
            console.log(e.shortMessage, 'error');
            console.log(typeof e);
            updateStepStatus('Unstake', `Error : ${e.shortMessage.split(':')[1] + e.shortMessage.split(':')[2]}`);
            return;
          }
        }
        updateStepStatus('Unstake', 'Success');
        setValue('');
        setTimeout(function () {
          reload(true);
        }, 3000);
      }
    }
  }

  async function getDebtCeilingDelta(value) {
    let amount: bigint;

    if (textButton == 'Stake') {
      amount = parseEther((Number(value) * sgmMintRatio).toString());
    } else {
      amount = -parseEther((Number(value) * sgmMintRatio).toString());
    }

    const data = await readContract(wagmiConfig, {
      address: lendingTerm.address as Address,
      abi: TermABI as Abi,
      functionName: 'debtCeiling',
      args: [amount],
      chainId: appChainId as any
    });

    setDebtDelta(Math.abs(Number(formatUnits(data as bigint, 18)) - debtCeiling));
  }

  const setMax = async () => {
    if (textButton == 'Stake') {
      setValue(formatUnits(creditBalance, 18));
      await getDebtCeilingDelta(formatUnits(creditBalance, 18));
    } else {
      setValue(formatUnits(creditAllocated, 18));
      await getDebtCeilingDelta(formatUnits(creditAllocated, 18));
    }
  };

  const setAvailable = (): string => {
    return textButton == 'Stake'
      ? formatDecimal(Number(formatUnits(creditBalance, 18)), 2)
      : formatDecimal(Number(formatUnits(creditAllocated, 18)), 2);
  };

  if (creditAllocated == undefined || creditBalance == undefined) return null;

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
      <div>
        <div className="mb-2 flex flex-col items-center gap-2">
          <DefiInputBox
            topLabel={`Amount of ${creditTokenSymbol} to ${textButton.toLowerCase()}`}
            currencyLogo={pegTokenLogo}
            currencyLogoStyle={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
            currencySymbol={creditTokenSymbol}
            placeholder="0"
            pattern="^[0-9]*[.,]?[0-9]*$"
            inputSize="text-xl xl:text-3xl"
            value={value}
            onChange={handleInputChange}
            rightLabel={
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available: {toLocaleString(setAvailable())}
                </p>
                <button className="text-sm font-medium text-brand-500 hover:text-brand-400" onClick={(e) => setMax()}>
                  Max
                </button>
              </>
            }
          />

          <ButtonPrimary
            variant="lg"
            title={textButton}
            titleDisabled={
              textButton == 'Stake'
                ? getTitleDisabledStake(
                    value,
                    creditBalance,
                    creditTokenSymbol,
                    Number(formatUnits(minimumCreditStake, 18))
                  )
                : getTitleDisabledUnstake(value, creditAllocated, creditTokenSymbol)
            }
            extra="w-full !rounded-xl"
            onClick={handlestake}
            disabled={
              (Number(value) < Number(formatUnits(minimumCreditStake, 18)) && textButton === 'Stake') ||
              (Number(value) > Number(formatUnits(creditBalance, 18)) && textButton === 'Stake') ||
              (Number(value) > Number(formatUnits(creditAllocated, 18)) && textButton === 'Unstake') ||
              Number(value) <= 0 ||
              !value
            }
          />
          <AlertMessage
            type="info"
            message={
              textButton === 'Stake' ? (
                <>
                  <div>
                    Your stake will mint & stake{' '}
                    <Image
                      className="inline-block"
                      src="/img/crypto-logos/guild.png"
                      width={18}
                      height={18}
                      alt="logo"
                    />{' '}
                    <span className="font-bold">
                      {formatDecimal(Number(value) * sgmMintRatio, creditTokenDecimalsToDisplay)}
                    </span>{' '}
                    GUILD tokens.{' '}
                    <TooltipHorizon
                      extra=""
                      trigger={
                        <div className="inline-block">
                          <QuestionMarkIcon />
                        </div>
                      }
                      content={
                        <div className="w-[15rem] p-2">
                          <p>
                            When you stake{' '}
                            <Image
                              className="inline-block"
                              src={pegTokenLogo}
                              width={16}
                              height={16}
                              alt="logo"
                              style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                            />{' '}
                            <span className="font-semibold">{creditTokenSymbol}</span>, you provide first-loss capital
                            on this term, and in exchange an amount of{' '}
                            <Image
                              className="inline-block"
                              src="/img/crypto-logos/guild.png"
                              width={16}
                              height={16}
                              alt="logo"
                            />{' '}
                            <span className="font-semibold">GUILD</span> will be minted to vote for this term.
                          </p>
                          <p className="mt-3">
                            The{' '}
                            <Image
                              className="inline-block"
                              src="/img/crypto-logos/guild.png"
                              width={16}
                              height={16}
                              alt="logo"
                            />{' '}
                            GUILD tokens minted are held on a smart contract, and you cannot use these tokens for any
                            other purposes than increasing the debt ceiling of the term you are staking for.
                          </p>
                        </div>
                      }
                      placement="top"
                    ></TooltipHorizon>
                    <br />
                    Your stake will increase debt ceiling by{' '}
                    <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                    <span className="font-bold">
                      {formatDecimal(debtDelta * creditMultiplierNumber, creditTokenDecimalsToDisplay)}
                    </span>{' '}
                    {pegToken.symbol}.
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Your unstake will decrease debt ceiling by{' '}
                    <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                    <span className="font-bold">
                      {formatDecimal(debtDelta * creditMultiplierNumber, creditTokenDecimalsToDisplay)}
                    </span>{' '}
                    {pegToken.symbol}.
                  </p>
                </>
              )
            }
          />
        </div>
      </div>
    </>
  );
}

export default StakeCredit;
