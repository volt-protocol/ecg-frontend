import { waitForTransactionReceipt, writeContract } from '@wagmi/core';
import StepModal from 'components/stepLoader';
import { Step } from 'components/stepLoader/stepType';
import { PsmUsdcABI, CreditABI } from 'lib/contracts';
import React, { useEffect, useState } from 'react';
import { Address, erc20Abi, parseUnits, formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import { Switch, Tab } from '@headlessui/react';
import clsx from 'clsx';
import DefiInputBox from 'components/box/DefiInputBox';
import { formatDecimal } from 'utils/numbers';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { AlertMessage } from 'components/message/AlertMessage';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore } from 'store';
import { getPegTokenLogo, marketsConfig, getExplorerBaseUrl } from 'config';
import Image from 'next/image';
import { MdOpenInNew } from 'react-icons/md';

function MintOrRedeem({
  reloadMintRedeem,
  pegTokenBalance,
  creditTokenBalance,
  creditMultiplier,
  pegTokenPSMBalance,
  isRebasing
}: {
  reloadMintRedeem: React.Dispatch<React.SetStateAction<boolean>>;
  pegTokenBalance: bigint;
  creditTokenBalance: bigint;
  creditMultiplier: bigint;
  pegTokenPSMBalance: bigint;
  isRebasing: boolean;
}) {
  const { contractsList, appChainId, coinDetails, appMarketId } = useAppStore();
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [value, setValue] = useState<string>('');
  const [show, setShow] = useState<boolean>(false);

  const creditAddress = contractsList?.marketContracts[appMarketId].creditAddress;
  const pegTokenAddress = contractsList?.marketContracts[appMarketId].pegTokenAddress;
  const psmAddress = contractsList?.marketContracts[appMarketId].psmAddress;

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const creditTokenSymbol = 'g' + pegToken.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);

  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);

  const pegTokenBalanceNumber = Number(formatUnits(pegTokenBalance, pegToken.decimals));
  const creditMultiplierNumber = Number(formatUnits(creditMultiplier, 18));
  const pegTokenPSMBalanceNumber = Number(formatUnits(pegTokenPSMBalance, pegToken.decimals));
  const creditTokenBalanceNumber = Number(formatUnits(creditTokenBalance, 18));

  function getTitleDisabled(type: 'Mint' | 'Redeem', value: number, max: number) {
    if (!value || value <= 0) {
      return type == 'Mint' ? `Enter ${pegToken.symbol} amount` : `Enter ${creditTokenSymbol} amount`;
    }
    if (value > max) {
      return type == 'Mint' ? `Insufficient ${pegToken.symbol} balance` : `Insufficient ${creditTokenSymbol} balance`;
    }
  }

  useEffect(() => {
    setShow(!isRebasing);
  }, [isRebasing]);

  const createSteps = (): Step[] => {
    const baseSteps = [
      { name: 'Approve', status: 'Not Started' },
      { name: 'Mint', status: 'Not Started' }
    ];

    return baseSteps;
  };

  const [steps, setSteps] = useState<Step[]>(createSteps());

  const updateStepStatus = (stepName: string, status: Step['status']) => {
    setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
  };
  function updateStepName(oldName: string, newName: string) {
    setSteps((prevSteps) => prevSteps.map((step) => (step.name === oldName ? { ...step, name: newName } : step)));
  }

  /* Smart contract writes */
  async function mint() {
    setShowModal(true);
    try {
      updateStepStatus('Approve', 'In Progress');
      // approve collateral first
      const hash = await writeContract(wagmiConfig, {
        address: pegTokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [psmAddress as Address, parseUnits(value.toString(), pegToken.decimals)]
      });

      const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkApprove.status != 'success') {
        updateStepStatus('Approve', 'Error');
        return;
      }
      updateStepStatus('Approve', 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus('Approve', 'Error');
      return;
    }
    try {
      updateStepStatus('Mint', 'In Progress');
      const hash = await writeContract(wagmiConfig, {
        address: psmAddress,
        abi: PsmUsdcABI,
        functionName: 'mint',
        args: [address, parseUnits(value.toString(), pegToken.decimals)]
      });
      const checkmint = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkmint.status === 'success') {
        updateStepStatus('Mint', 'Success');
        reloadMintRedeem(true);
        setValue('');
        return;
      } else updateStepStatus('Mint', 'Error');
    } catch (e) {
      updateStepStatus('Mint', 'Error');
      console.log(e);
    }
  }

  async function mintAndEnterRebase() {
    setShowModal(true);
    try {
      updateStepStatus('Approve', 'In Progress');
      updateStepName('Mint', 'Mint and Enter Rebase');

      // approve collateral first
      const hash = await writeContract(wagmiConfig, {
        address: pegTokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [psmAddress as Address, parseUnits(value.toString(), pegToken.decimals)]
      });

      const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkApprove.status != 'success') {
        updateStepStatus('Approve', 'Error');
        return;
      }
      updateStepStatus('Approve', 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus('Approve', 'Error');
      return;
    }
    try {
      updateStepStatus('Mint and Enter Rebase', 'In Progress');
      const hash = await writeContract(wagmiConfig, {
        address: psmAddress,
        abi: PsmUsdcABI,
        functionName: 'mintAndEnterRebase',
        args: [parseUnits(value.toString(), pegToken.decimals)]
      });
      const checkmint = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkmint.status === 'success') {
        updateStepStatus('Mint and Enter Rebase', 'Success');
        reloadMintRedeem(true);
        setValue('');
        return;
      } else updateStepStatus('Mint and Enter Rebase', 'Error');
    } catch (e) {
      updateStepStatus('Mint and Enter Rebase', 'Error');
      console.log(e);
    }
  }

  async function redeem() {
    try {
      setShowModal(true);
      updateStepStatus('Approve', 'In Progress');
      updateStepName('Mint', 'Redeem');

      // approve collateral first
      const hash = await writeContract(wagmiConfig, {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'approve',
        args: [psmAddress as Address, parseUnits(value.toString(), 18)]
      });

      const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkApprove.status != 'success') {
        updateStepStatus('Approve', 'Error');
        return;
      }
      updateStepStatus('Approve', 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus('Approve', 'Error');
      return;
    }
    try {
      updateStepStatus('Redeem', 'In Progress');
      const hash = await writeContract(wagmiConfig, {
        address: psmAddress,
        abi: PsmUsdcABI,
        functionName: 'redeem',
        args: [address, parseUnits(value.toString(), 18)]
      });
      const checkredeem = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkredeem.status === 'success') {
        reloadMintRedeem(true);
        setValue('');
        updateStepStatus('Redeem', 'Success');
        return;
      } else updateStepStatus('Redeem', 'Error');
    } catch (e) {
      updateStepStatus('Redeem', 'Error');
      console.log(e);
    }
  }
  /* End Smart contract writes */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^[0-9]*\.?[0-9]*$/i.test(inputValue)) {
      setValue(inputValue as string);
    }
  };

  return (
    <>
      <div>
        {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}

        <div className="mb-3 mt-4 rounded-md bg-gray-100 text-sm">
          <a
            className="block p-1 text-center text-gray-500"
            target="__blank"
            href={`${getExplorerBaseUrl(appChainId)}/address/${address}`}
          >
            Your balances <MdOpenInNew className="inline" />
          </a>
          <div className="flex space-x-1 rounded-md pb-2">
            <div className="w-full text-center">
              <Image className="inline-block align-top" src={pegTokenLogo} width={20} height={20} alt="logo" />{' '}
              <strong>
                {pegTokenBalanceNumber ? formatDecimal(pegTokenBalanceNumber, pegTokenDecimalsToDisplay) : 0}
              </strong>{' '}
              {pegToken.symbol}
            </div>
            <div className="w-full text-center">
              <Image
                className="inline-block align-top"
                src={pegTokenLogo}
                width={20}
                height={20}
                alt="logo"
                style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
              />{' '}
              <strong>
                {creditTokenBalanceNumber ? formatDecimal(creditTokenBalanceNumber, pegTokenDecimalsToDisplay) : 0}
              </strong>{' '}
              {creditTokenSymbol}
            </div>
          </div>
        </div>

        <Tab.Group
          onChange={(index) => {
            setValue('');
          }}
        >
          <Tab.List className="flex space-x-1 rounded-md bg-brand-100/50 p-1 dark:bg-navy-700">
            <Tab
              key="mint"
              className={({ selected }) =>
                clsx(
                  'w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base',
                  selected
                    ? 'bg-white font-semibold text-brand-500 dark:bg-navy-600/70'
                    : 'font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50'
                )
              }
            >
              Mint
            </Tab>
            <Tab
              key="redeem"
              className={({ selected }) =>
                clsx(
                  'w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base',
                  selected
                    ? 'bg-white font-semibold text-brand-500 dark:bg-navy-600/70'
                    : 'font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50'
                )
              }
            >
              Redeem
            </Tab>
          </Tab.List>
          <Tab.Panels className="mt-2">
            <Tab.Panel key="mint" className={'px-3 py-1'}>
              <div className="flex flex-col items-center gap-2">
                <DefiInputBox
                  topLabel={`Mint ${creditTokenSymbol} from ${pegToken.symbol}`}
                  currencyLogo={pegTokenLogo}
                  currencySymbol={pegToken.symbol}
                  placeholder="0"
                  pattern="^[0-9]*[.,]?[0-9]*$"
                  inputSize="text-2xl sm:text-3xl"
                  value={value}
                  onChange={handleInputChange}
                  rightLabel={
                    <>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Available:{' '}
                        {pegTokenBalance ? formatDecimal(pegTokenBalanceNumber, pegTokenDecimalsToDisplay) : 0}
                      </p>
                      <button
                        className="text-sm font-medium text-brand-500 hover:text-brand-400"
                        onClick={(e) => setValue(formatUnits(pegTokenBalance, pegToken.decimals))}
                      >
                        Max
                      </button>
                    </>
                  }
                />
                <div className="flex w-full flex-col rounded-xl bg-gray-100 py-4 dark:bg-navy-900">
                  <div className="sm:w-ha flex w-full items-center justify-between px-5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {!isRebasing ? (
                        <span>Enter Saving Rate</span>
                      ) : (
                        <span>
                          <span className="line-through">Enter Saving Rate</span>{' '}
                          <span className="opacity-50">Already entered savings rate! 🚀</span>
                        </span>
                      )}
                    </label>
                    <Switch
                      disabled={isRebasing}
                      checked={show}
                      onChange={setShow}
                      className={clsx(
                        show ? 'bg-brand-500' : 'bg-gray-200',
                        isRebasing ? 'cursor-not-allowed' : 'cursor-pointer',
                        'border-transparent relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          show ? 'translate-x-5' : 'translate-x-0',
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                        )}
                      />
                    </Switch>
                  </div>
                </div>
                <ButtonPrimary
                  variant="lg"
                  title={show ? 'Mint and Enter Rebase' : 'Mint'}
                  titleDisabled={getTitleDisabled('Mint', Number(value), pegTokenBalanceNumber)}
                  extra="w-full !rounded-xl"
                  onClick={show ? mintAndEnterRebase : mint}
                  disabled={Number(value) > pegTokenBalanceNumber || Number(value) <= 0 || !value}
                />
                <AlertMessage
                  type="info"
                  message={
                    <>
                      <p>
                        You will receive{' '}
                        <Image
                          className="inline-block align-top"
                          src={pegTokenLogo}
                          width={20}
                          height={20}
                          alt="logo"
                          style={{ borderRadius: '50%', border: '2px solid #3e6b7d' }}
                        />{' '}
                        <span className="font-bold">
                          {formatDecimal(Number(value) / creditMultiplierNumber, pegTokenDecimalsToDisplay)}
                        </span>{' '}
                        {creditTokenSymbol}
                      </p>
                    </>
                  }
                />
              </div>
            </Tab.Panel>
            <Tab.Panel key="redeem" className={'px-3 py-1'}>
              <div className="flex flex-col items-center gap-2">
                <DefiInputBox
                  topLabel={`Redeem ${pegToken.symbol} from ${creditTokenSymbol}`}
                  currencyLogo={pegTokenLogo}
                  currencyLogoStyle={{ borderRadius: '50%', border: '3px solid #3e6b7d' }}
                  currencySymbol={creditTokenSymbol}
                  placeholder="0"
                  pattern="^[0-9]*[.,]?[0-9]*$"
                  inputSize="text-2xl sm:text-3xl"
                  value={value}
                  onChange={handleInputChange}
                  rightLabel={
                    <>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Available:{' '}
                        {creditTokenBalanceNumber
                          ? formatDecimal(creditTokenBalanceNumber, pegTokenDecimalsToDisplay)
                          : 0}
                      </p>
                      <button
                        className="text-sm font-medium text-brand-500 hover:text-brand-400"
                        onClick={(e) => setValue(formatUnits(creditTokenBalance, 18))}
                      >
                        Max
                      </button>
                    </>
                  }
                />
                <div className="flex w-full flex-col rounded-xl bg-gray-100 py-4 dark:bg-navy-900">
                  <div className="sm:w-ha w-full text-center">
                    <a
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      target="__blank"
                      href={`${getExplorerBaseUrl(appChainId)}/address/${psmAddress}`}
                    >
                      PSM Balance (max. redeemable) :{' '}
                      <Image
                        className="inline-block align-bottom"
                        src={pegTokenLogo}
                        width={22}
                        height={22}
                        alt="logo"
                      />{' '}
                      <span className="font-bold">
                        {formatDecimal(pegTokenPSMBalanceNumber, pegTokenDecimalsToDisplay)}
                      </span>{' '}
                      {pegToken.symbol} <MdOpenInNew className="inline" />
                    </a>
                  </div>
                </div>
                <ButtonPrimary
                  variant="lg"
                  title={'Redeem'}
                  titleDisabled={getTitleDisabled('Redeem', Number(value), pegTokenPSMBalanceNumber)}
                  extra="w-full !rounded-xl"
                  onClick={redeem}
                  disabled={Number(value) > pegTokenPSMBalanceNumber || !value ? true : false}
                />
                <AlertMessage
                  type="info"
                  message={
                    <>
                      <p>
                        You will receive{' '}
                        <Image
                          className="inline-block align-top"
                          src={pegTokenLogo}
                          width={20}
                          height={20}
                          alt="logo"
                        />{' '}
                        <span className="font-bold">
                          {formatDecimal(Number(value) * creditMultiplierNumber, pegTokenDecimalsToDisplay)}
                        </span>{' '}
                        {pegToken.symbol}
                      </p>
                    </>
                  }
                />
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </>
  );
}

export default MintOrRedeem;
