import { waitForTransactionReceipt, writeContract, readContract } from '@wagmi/core';
import StepModal from 'components/stepLoader';
import { Step } from 'components/stepLoader/stepType';
import { CreditABI, GatewayABI, ERC20PermitABI, PsmABI } from 'lib/contracts';
import React, { useEffect, useState } from 'react';
import { Address, parseUnits, formatUnits, encodeFunctionData, Abi } from 'viem';
import { useAccount } from 'wagmi';
import { Switch, Tab } from '@headlessui/react';
import clsx from 'clsx';
import DefiInputBox from 'components/box/DefiInputBox';
import { formatDecimal } from 'utils/numbers';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { AlertMessage } from 'components/message/AlertMessage';
import { wagmiConfig } from 'contexts/Web3Provider';
import { useAppStore, useUserPrefsStore } from 'store';
import { getPegTokenLogo, getExplorerBaseUrl, permitConfig } from 'config';
import Image from 'next/image';
import { MdOpenInNew } from 'react-icons/md';
import { signPermit } from 'lib/transactions/signPermit';
import { getCreditTokenSymbol } from 'utils/strings';

function MintOrRedeem({
  reloadMintRedeem,
  pegTokenBalance,
  creditTokenBalance,
  creditMultiplier,
  pegTokenPSMBalance,
  isRebasing,
  creditTokenNonces,
  pegTokenNonces,
  creditTokenName,
  pegTokenName
}: {
  reloadMintRedeem: React.Dispatch<React.SetStateAction<boolean>>;
  pegTokenBalance: bigint;
  creditTokenBalance: bigint;
  creditMultiplier: bigint;
  pegTokenPSMBalance: bigint;
  isRebasing: boolean;
  creditTokenNonces: bigint;
  pegTokenNonces: bigint;
  creditTokenName: string;
  pegTokenName: string;
}) {
  const { contractsList, coinDetails } = useAppStore();
  const { appMarketId, appChainId, usePermit } = useUserPrefsStore();
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
  const creditTokenSymbol = getCreditTokenSymbol(coinDetails, appMarketId, contractsList);
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
    return [];
  };
  const [steps, setSteps] = useState<Step[]>(createSteps());

  const updateStepStatus = (stepName: string, status: Step['status']) => {
    setSteps((prevSteps) => prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step)));
  };

  /* Smart contract writes */
  async function doMint() {
    const doEnterRebase: boolean = show;
    let withPermit: boolean = false;
    if (
      usePermit &&
      permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.hasPermit
    ) {
      withPermit = true;
    }
    const amount = parseUnits(value.toString(), pegToken.decimals);

    const steps = [];
    if (doEnterRebase) {
      steps.push({ name: 'Enter Savings Rate', status: 'Not Started' });
    }
    if (withPermit) {
      steps.push({ name: `Check ${pegToken.symbol} allowance`, status: 'Not Started' });
      steps.push({ name: `Permit ${pegToken.symbol}`, status: 'Not Started' });
    } else {
      steps.push({ name: `Check ${pegToken.symbol} allowance`, status: 'Not Started' });
      steps.push({ name: `Approve ${pegToken.symbol}`, status: 'Not Started' });
    }
    steps.push({ name: 'Mint', status: 'Not Started' });
    setSteps(steps);
    setShowModal(true);

    /* Enter savings rate, if needed */
    if (doEnterRebase) {
      try {
        setShowModal(true);
        updateStepStatus('Enter Savings Rate', 'In Progress');

        const hash = await writeContract(wagmiConfig, {
          address: contractsList?.marketContracts[appMarketId].creditAddress,
          abi: CreditABI,
          functionName: 'enterRebase',
          chainId: appChainId as any
        });

        const checkTx = await waitForTransactionReceipt(wagmiConfig, {
          hash: hash,
          chainId: appChainId as any
        });
        if (checkTx.status != 'success') {
          updateStepStatus('Enter Savings Rate', 'Error');
          return false;
        }
        updateStepStatus('Enter Savings Rate', 'Success');
      } catch (error) {
        updateStepStatus('Enter Savings Rate', 'Error');
        console.log(error);
        return false;
      }
    }

    /* Check allowance */
    updateStepStatus(`Check ${pegToken.symbol} allowance`, 'In Progress');
    const allowance = (await readContract(wagmiConfig, {
      chainId: appChainId as any,
      address: pegTokenAddress as Address,
      abi: ERC20PermitABI,
      functionName: 'allowance',
      args: [address, contractsList.gatewayAddress]
    })) as bigint;
    updateStepStatus(`Check ${pegToken.symbol} allowance`, 'Success');

    /* Set allowance */
    let permitSig: any;
    if (allowance < amount) {
      // set allowance with permit
      if (withPermit) {
        updateStepStatus(`Permit ${pegToken.symbol}`, 'In Progress');
        try {
          permitSig = await signPermit({
            contractAddress: pegToken.address as Address,
            erc20Name: pegTokenName,
            ownerAddress: address,
            spenderAddress: contractsList.gatewayAddress as Address,
            value: amount,
            deadline: BigInt(Math.floor((Date.now() + 15 * 60 * 1000) / 1000)),
            nonce: pegTokenNonces,
            chainId: appChainId,
            version:
              permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.version || '1'
          });

          if (!permitSig) {
            updateStepStatus(`Permit ${pegToken.symbol}`, 'Error');
            return false;
          }
          updateStepStatus(`Permit ${pegToken.symbol}`, 'Success');
        } catch (e) {
          console.log(e);
          updateStepStatus(`Permit ${pegToken.symbol}`, 'Error');
          return false;
        }
      }
      // set allowance with approve
      else {
        updateStepStatus(`Approve ${pegToken.symbol}`, 'In Progress');
        const hash = await writeContract(wagmiConfig, {
          address: pegTokenAddress as Address,
          abi: ERC20PermitABI,
          functionName: 'approve',
          args: [contractsList.gatewayAddress, amount],
          chainId: appChainId as any
        });
        const checkTx = await waitForTransactionReceipt(wagmiConfig, {
          hash: hash,
          chainId: appChainId as any
        });

        if (checkTx.status != 'success') {
          updateStepStatus(`Approve ${pegToken.symbol}`, 'Error');
          return false;
        }
        updateStepStatus(`Approve ${pegToken.symbol}`, 'Success');
      }
    } else {
      if (withPermit) {
        updateStepStatus(`Permit ${pegToken.symbol}`, 'Success');
      } else {
        updateStepStatus(`Approve ${pegToken.symbol}`, 'Success');
      }
    }

    /* Gateway call */
    updateStepStatus('Mint', 'In Progress');
    try {
      //build multicall
      const calls = [];

      // pull pegToken on gateway
      if (withPermit && permitSig) {
        calls.push(
          encodeFunctionData({
            abi: GatewayABI as Abi,
            functionName: 'consumePermit',
            args: [pegToken.address, amount, permitSig.deadline, permitSig.v, permitSig.r, permitSig.s]
          })
        );
      }
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'consumeAllowance',
          args: [pegToken.address, amount]
        })
      );

      // do psm.mint
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'callExternal',
          args: [
            pegToken.address,
            encodeFunctionData({
              abi: ERC20PermitABI,
              functionName: 'approve',
              args: [psmAddress, amount]
            })
          ]
        })
      );
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'callExternal',
          args: [
            psmAddress,
            encodeFunctionData({
              abi: PsmABI,
              functionName: 'mint',
              args: [address, amount]
            })
          ]
        })
      );

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'multicall',
        args: [calls],
        gas: 750_000
      });

      const checkTx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
        chainId: appChainId as any
      });

      if (checkTx.status === 'success') {
        updateStepStatus('Mint', 'Success');
        reloadMintRedeem(true);
        setValue('');
        return true;
      } else {
        updateStepStatus('Mint', 'Error');
        return false;
      }
    } catch (e) {
      console.log(e);
      updateStepStatus('Mint', 'Error');
      return false;
    }
  }

  async function doRedeem() {
    const amount = parseUnits(value.toString(), 18);

    const steps = [];
    if (usePermit) {
      steps.push({ name: `Check ${creditTokenSymbol} allowance`, status: 'Not Started' });
      steps.push({ name: `Permit ${creditTokenSymbol}`, status: 'Not Started' });
    } else {
      steps.push({ name: `Check ${creditTokenSymbol} allowance`, status: 'Not Started' });
      steps.push({ name: `Approve ${creditTokenSymbol}`, status: 'Not Started' });
    }
    steps.push({ name: 'Redeem', status: 'Not Started' });
    setSteps(steps);
    setShowModal(true);

    /* Check allowance */
    updateStepStatus(`Check ${creditTokenSymbol} allowance`, 'In Progress');
    const allowance = (await readContract(wagmiConfig, {
      chainId: appChainId as any,
      address: creditAddress as Address,
      abi: ERC20PermitABI,
      functionName: 'allowance',
      args: [address, contractsList.gatewayAddress]
    })) as bigint;
    updateStepStatus(`Check ${creditTokenSymbol} allowance`, 'Success');

    /* Set allowance */
    let permitSig: any;
    if (allowance < amount) {
      // set allowance with permit
      if (usePermit) {
        updateStepStatus(`Permit ${creditTokenSymbol}`, 'In Progress');
        try {
          permitSig = await signPermit({
            contractAddress: creditAddress as Address,
            erc20Name: creditTokenName,
            ownerAddress: address,
            spenderAddress: contractsList.gatewayAddress as Address,
            value: amount,
            deadline: BigInt(Math.floor((Date.now() + 15 * 60 * 1000) / 1000)),
            nonce: creditTokenNonces,
            chainId: appChainId,
            version:
            permitConfig.find((item) => item.address.toLowerCase() === creditAddress.toLowerCase())?.version || '1'
          });

          if (!permitSig) {
            updateStepStatus(`Permit ${creditTokenSymbol}`, 'Error');
            return false;
          }
          updateStepStatus(`Permit ${creditTokenSymbol}`, 'Success');
        } catch (e) {
          console.log(e);
          updateStepStatus(`Permit ${creditTokenSymbol}`, 'Error');
          return false;
        }
      }
      // set allowance with approve
      else {
        updateStepStatus(`Approve ${creditTokenSymbol}`, 'In Progress');
        const hash = await writeContract(wagmiConfig, {
          address: creditAddress as Address,
          abi: ERC20PermitABI,
          functionName: 'approve',
          args: [contractsList.gatewayAddress, amount],
          chainId: appChainId as any
        });
        const checkTx = await waitForTransactionReceipt(wagmiConfig, {
          hash: hash,
          chainId: appChainId as any
        });

        if (checkTx.status != 'success') {
          updateStepStatus(`Approve ${creditTokenSymbol}`, 'Error');
          return false;
        }
        updateStepStatus(`Approve ${creditTokenSymbol}`, 'Success');
      }
    } else {
      if (usePermit) {
        updateStepStatus(`Permit ${creditTokenSymbol}`, 'Success');
      } else {
        updateStepStatus(`Approve ${creditTokenSymbol}`, 'Success');
      }
    }

    /* Gateway call */
    updateStepStatus('Redeem', 'In Progress');
    try {
      //build multicall
      const calls = [];

      // pull pegToken on gateway
      if (usePermit && permitSig) {
        calls.push(
          encodeFunctionData({
            abi: GatewayABI as Abi,
            functionName: 'consumePermit',
            args: [creditAddress, amount, permitSig.deadline, permitSig.v, permitSig.r, permitSig.s]
          })
        );
      }
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'consumeAllowance',
          args: [creditAddress, amount]
        })
      );

      // do psm.mint
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'callExternal',
          args: [
            creditAddress,
            encodeFunctionData({
              abi: ERC20PermitABI,
              functionName: 'approve',
              args: [psmAddress, amount]
            })
          ]
        })
      );
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'callExternal',
          args: [
            psmAddress,
            encodeFunctionData({
              abi: PsmABI,
              functionName: 'redeem',
              args: [address, amount]
            })
          ]
        })
      );

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'multicall',
        args: [calls],
        gas: 750_000
      });

      const checkTx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
        chainId: appChainId as any
      });

      if (checkTx.status === 'success') {
        updateStepStatus('Redeem', 'Success');
        reloadMintRedeem(true);
        setValue('');
        return true;
      } else {
        updateStepStatus('Redeem', 'Error');
        return false;
      }
    } catch (e) {
      console.log(e);
      updateStepStatus('Redeem', 'Error');
      return false;
    }
  }
  /* End Smart contract writes */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Verify input is a number
    if (/^[0-9]+\.?[0-9]*$/i.test(inputValue)) {
      setValue(inputValue as string);
    }
  };

  return (
    <>
      <div>
        {showModal && <StepModal steps={steps} close={setShowModal} initialStep={createSteps} setSteps={setSteps} />}

        <div className="mb-3 mt-4 rounded-md bg-gray-100 text-sm dark:bg-navy-900">
          <a
            className="block p-1 text-center text-gray-500 dark:text-gray-200"
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
                  title={show ? 'Mint and start saving' : 'Mint'}
                  titleDisabled={getTitleDisabled('Mint', Number(value), pegTokenBalanceNumber)}
                  extra="w-full !rounded-xl"
                  onClick={doMint}
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
                  onClick={doRedeem}
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
