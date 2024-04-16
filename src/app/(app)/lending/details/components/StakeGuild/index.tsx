import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { TermABI, GuildABI } from 'lib/contracts';
import { toastError } from 'components/toast';
import { useAccount } from 'wagmi';
import { Step } from 'components/stepLoader/stepType';
import StepModal from 'components/stepLoader';
import { Abi, ContractFunctionExecutionError, formatUnits, parseEther, Address } from 'viem';
import ButtonPrimary from 'components/button/ButtonPrimary';
import DefiInputBox from 'components/box/DefiInputBox';
import { formatDecimal, formatCurrencyValue, toLocaleString } from 'utils/numbers';
import { getTitleDisabledStake, getTitleDisabledUnstake } from './helper';
import { AlertMessage } from 'components/message/AlertMessage';
import { LendingTerms } from 'types/lending';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore } from 'store';
import { getPegTokenLogo, marketsConfig } from 'config';
import Image from 'next/image';

function StakeGuild({
  debtCeiling,
  lendingTerm,
  textButton,
  guildUserGaugeWeight,
  guildBalance,
  smartContractAddress,
  guildUserWeight,
  creditMultiplier,
  reload
}: {
  debtCeiling: number;
  lendingTerm: LendingTerms;
  textButton: 'Stake' | 'Unstake';
  guildUserGaugeWeight: bigint;
  guildBalance: bigint;
  smartContractAddress: string;
  guildUserWeight: bigint;
  creditMultiplier: bigint;
  reload: Dispatch<SetStateAction<boolean>>;
}) {
  const { appMarketId, appChainId, coinDetails, contractsList } = useAppStore();
  const [value, setValue] = useState<string>('');
  const { isConnected } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [debtDelta, setDebtDelta] = useState(0);

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const creditTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);

  const creditMultiplierNumber = Number(formatUnits(creditMultiplier, 18));

  const createSteps = (): Step[] => {
    const baseSteps = [
      {
        name: textButton,
        status: 'Not Started'
      }
    ];

    return baseSteps;
  };
  const [steps, setSteps] = useState<Step[]>(createSteps());

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as string);

      await getDebtCeilingDelta(inputValue);
    }
  };

  async function handleVote(): Promise<void> {
    const updateStepStatus = (stepName: string, status: Step['status']) => {
      setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
    };

    if (Number(value) == 0) {
      toastError('Please enter a value');
      return;
    }
    if (isConnected == false) {
      toastError('Please connect your wallet');
      return;
    }
    if (textButton === 'Stake') {
      if (Number(value) > Number(formatUnits(guildBalance, 18)) - Number(formatUnits(guildUserWeight, 18))) {
        toastError('Not enough guild');
        return;
      } else {
        try {
          setShowModal(true);
          updateStepStatus('Stake', 'In Progress');
          const hash = await writeContract(wagmiConfig, {
            address: contractsList.guildAddress,
            abi: GuildABI,
            functionName: 'incrementGauge',
            args: [smartContractAddress, parseEther(value.toString())]
          });
          const checkAllocate = await waitForTransactionReceipt(wagmiConfig, {
            hash: hash
          });
          if (checkAllocate.status != 'success') {
            updateStepStatus('Stake', 'Error');
            return;
          }
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
      if (Number(value) > Number(formatUnits(guildUserGaugeWeight, 18))) {
        toastError('Not enough GUILD allocated');
        return;
      } else {
        setShowModal(true);
        updateStepStatus('Unstake', 'In Progress');
        try {
          const hash = await writeContract(wagmiConfig, {
            address: contractsList.guildAddress,
            abi: GuildABI,
            functionName: 'decrementGauge',
            args: [smartContractAddress, parseEther(value.toString())]
          });
          const checkUnstack = await waitForTransactionReceipt(wagmiConfig, {
            hash: hash
          });
          if (checkUnstack.status != 'success') {
            updateStepStatus('Unstake', 'Error');
            return;
          }
          updateStepStatus('Unstake', 'Success');
          setValue('');
          setTimeout(function () {
            reload(true);
          }, 3000);
        } catch (e) {
          if (e instanceof ContractFunctionExecutionError) {
            console.log(e.shortMessage, 'error');
            console.log(typeof e);
            updateStepStatus('Unstake', `Error : ${e.shortMessage.split(':')[1] + e.shortMessage.split(':')[2]}`);
            return;
          } else {
            console.log(e);
            updateStepStatus('Unstake', 'Error');
            return;
          }
        }
      }
    }
  }
  /** Setters and Getters **/
  async function getDebtCeilingDelta(value) {
    if (
      (Number(value) > Number(formatUnits(guildBalance, 18)) - Number(formatUnits(guildUserWeight, 18)) &&
        textButton == 'Stake') ||
      (Number(value) > Number(formatUnits(guildUserGaugeWeight, 18)) && textButton == 'Unstake')
    ) {
      setDebtDelta(0);
      return;
    }

    let amount: bigint;

    if (textButton == 'Stake') {
      amount = parseEther(value);
    } else {
      amount = -parseEther(value);
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

  const setMax = () => {
    if (textButton == 'Stake') {
      setValue((Number(formatUnits(guildBalance, 18)) - Number(formatUnits(guildUserWeight, 18))).toString());
    } else {
      setValue(formatUnits(guildUserGaugeWeight, 18));
    }
  };

  const setAvailable = (): string => {
    return textButton == 'Stake'
      ? formatDecimal(Number(formatUnits(guildBalance, 18)) - Number(formatUnits(guildUserWeight, 18)), 2)
      : formatDecimal(Number(formatUnits(guildUserGaugeWeight, 18)), 2);
  };

  /** End Setters and Getters **/

  if (guildBalance == undefined || guildUserGaugeWeight == undefined || guildUserWeight == undefined) {
    return null;
  }

  return (
    <div>
      {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}
      <div className="mb-2 flex flex-col items-center gap-2">
        <DefiInputBox
          topLabel={'Amount of GUILD to ' + textButton.toLowerCase()}
          currencyLogo="/img/crypto-logos/guild.png"
          currencySymbol="GUILD"
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
              ? getTitleDisabledStake(value, guildBalance, guildUserWeight)
              : getTitleDisabledUnstake(value, guildUserGaugeWeight)
          }
          extra="w-full !rounded-xl"
          onClick={handleVote}
          disabled={
            (Number(value) > Number(formatUnits(guildBalance, 18)) - Number(formatUnits(guildUserWeight, 18)) &&
              textButton == 'Stake') ||
            (Number(value) > Number(formatUnits(guildUserGaugeWeight, 18)) && textButton == 'Unstake') ||
            Number(value) <= 0 ||
            !value
          }
        />

        <AlertMessage
          type="info"
          message={
            textButton === 'Stake' ? (
              <>
                <p>
                  Your stake will increase borrow cap by{' '}
                  <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                  <span className="font-bold">
                    {formatDecimal(debtDelta * creditMultiplierNumber, creditTokenDecimalsToDisplay)}
                  </span>{' '}
                  {pegToken.symbol}
                </p>
              </>
            ) : (
              <>
                <p>
                  Your unstake will decrease borrow cap by{' '}
                  <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
                  <span className="font-bold">
                    {' '}
                    {formatDecimal(debtDelta * creditMultiplierNumber, creditTokenDecimalsToDisplay)}
                  </span>{' '}
                  {pegToken.symbol}
                </p>
              </>
            )
          }
        />
      </div>
    </div>
  );
}

export default StakeGuild;
