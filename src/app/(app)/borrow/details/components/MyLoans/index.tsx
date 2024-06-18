import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import ImageWithFallback from 'components/image/ImageWithFallback';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
  getPaginationRowModel
} from '@tanstack/react-table';
import { readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { TermABI, ERC20PermitABI, GatewayABI, CreditABI, PsmABI } from 'lib/contracts';
import { secondsToAppropriateUnit } from 'utils/date';
import { LendingTerms, loanObj } from 'types/lending';
import { useAccount, useReadContracts } from 'wagmi';
import { Step } from 'components/stepLoader/stepType';
import { MdOutlineError, MdOutlineHandshake } from 'react-icons/md';
import { formatDecimal, gUsdcToUsdc, usdcToGUsdc, toLocaleString } from 'utils/numbers';
import { Abi, Address, erc20Abi, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import clsx from 'clsx';
import ModalRepay from './ModalRepay';
import StepModal from 'components/stepLoader';
import Spinner from 'components/spinner';
import { wagmiConfig } from 'contexts/Web3Provider';
import { ItemIdBadge } from 'components/badge/ItemIdBadge';
import { signPermit } from 'lib/transactions/signPermit';
import moment from 'moment';
import { simpleRepay } from './helper/simpleRepay';
import { HOURS_IN_YEAR } from 'utils/constants';
import { getPegTokenLogo, getLeverageConfig, permitConfig } from 'config';
import CustomTable from 'components/table/CustomTable';
import { useAppStore, useUserPrefsStore } from 'store';
import { marketsConfig } from 'config';
import { approvalStepsFlow } from 'utils/approvalHelper';
import { getDexRouterData } from 'utils/dexApi';

function Myloans({
  lendingTerm,
  isLoadingEventLoans,
  tableData,
  creditMultiplier,
  pegTokenBalance,
  creditBalance,
  pegTokenNonces,
  setReload,
  reload,
  minBorrow
}: {
  lendingTerm: LendingTerms;
  isLoadingEventLoans: boolean;
  tableData: loanObj[];
  creditMultiplier: bigint;
  pegTokenBalance: bigint;
  creditBalance: bigint;
  pegTokenNonces: bigint;
  minBorrow: bigint;
  reload: boolean;
  setReload: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { coinDetails, contractsList } = useAppStore();
  const { appMarketId, appChainId, usePermit } = useUserPrefsStore();
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [tableDataWithDebts, setTableDataWithDebts] = useState<loanObj[]>([]);
  const [repays, setRepays] = React.useState<Record<string, number>>({});
  const [open, setOpen] = useState<boolean>(false);
  const [selectedRow, setSelectedRow] = useState<loanObj>();

  const collateralToken = coinDetails.find(
    (item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase()
  );
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const collateralTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(collateralToken.price * 100)), 0);
  const creditTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);
  const creditTokenSymbol = 'g' + pegToken.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);

  const creditAddress = contractsList?.marketContracts[appMarketId].creditAddress;
  const psmAddress = contractsList?.marketContracts[appMarketId].psmAddress;

  const [data, setData] = React.useState(() =>
    tableDataWithDebts.filter(
      (loan) => loan.closeTime !== 0 && loan.callTime === 0 && loan.loanDebt !== BigInt(0) && loan.borrower === address
    )
  );

  const updateStepStatus = (stepName: string, status: Step['status'], description?: any[]) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.name === stepName ? { ...step, status, description: description } : step))
    );
  };

  const [steps, setSteps] = useState<Step[]>([]);

  /* Smart contract reads */
  const {
    data: contractData,
    isError,
    isLoading,
    refetch
  } = useReadContracts({
    contracts: [
      {
        address: lendingTerm.collateral.address as Address,
        abi: ERC20PermitABI as Abi,
        functionName: 'nonces',
        args: [address],
        chainId: appChainId
      },
      {
        address: pegToken.address as Address,
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
      },
      {
        address: pegToken.address as Address,
        abi: erc20Abi as Abi,
        functionName: 'name',
        chainId: appChainId
      }
    ],
    query: {
      select: (data) => {
        return {
          collateralNonces: data[0].result as bigint,
          pegTokenNonces: data[1].result as bigint,
          collaternalTokenName: data[2].result as string,
          creditTokenName: data[3].result as string,
          pegTokenName: data[4].result as string
        };
      }
    }
  });
  /* End Smart contract reads */

  useEffect(() => {
    if (reload) {
      refetch();
      setReload(false);
    }
  }, [reload]);

  useEffect(() => {
    const fetchData = async () => {
      const debtPromises = tableData.map((loan) => getLoanDebt(loan.id));
      const repayPromises = tableData.map((loan) => getLoan(loan.id));

      const debts = await Promise.all(debtPromises);
      const repays = await Promise.all(repayPromises);

      const newTableData = tableData.map((loan, index) => ({
        ...loan,
        loanDebt: debts[index]
      }));

      const newRepays = repays.reduce((acc, repay, index) => {
        acc[tableData[index].id] = repay.lastPartialRepay;
        return acc;
      }, {});

      setTableDataWithDebts(newTableData);
      setRepays(newRepays);
    };

    fetchData();
  }, [tableData, reload]);

  useEffect(() => {
    setData(
      tableDataWithDebts.filter(
        (loan) =>
          // loan.status !== "closed" &&
          loan.callTime === 0 && loan.borrowAmount + loan.loanDebt !== BigInt(0) && loan.borrower === address
      )
    );
  }, [tableDataWithDebts]);

  async function getLoanDebt(loanId: string): Promise<bigint> {
    const result = await readContract(wagmiConfig, {
      address: lendingTerm.address as Address,
      abi: TermABI,
      functionName: 'getLoanDebt',
      args: [loanId],
      chainId: appChainId as any
    });

    return result as bigint;
  }

  async function getLoan(id: string): Promise<any> {
    const response = await readContract(wagmiConfig, {
      address: lendingTerm.address as Address,
      abi: TermABI,
      functionName: 'getLoan',
      args: [id],
      chainId: appChainId as any
    });
    return response;
  }

  /* Smart contract writes */
  async function partialRepay(loanId: string, value: string) {
    setOpen(false);
    const checkStepName = `Check ${creditTokenSymbol} allowance`;
    const approveStepName = `Approve ${creditTokenSymbol}`;
    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: checkStepName, status: 'Not Started' },
        { name: approveStepName, status: 'Not Started' },
        { name: 'Partial Repay', status: 'Not Started' }
      ];
      return baseSteps;
    };
    setSteps(createSteps());
    setShowModal(true);

    const debtToRepay = parseUnits(value, 18);

    try {
      const approvalSuccess = await approvalStepsFlow(
        address,
        lendingTerm.address,
        contractsList?.marketContracts[appMarketId].creditAddress,
        debtToRepay,
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

    try {
      updateStepStatus('Partial Repay', 'In Progress');
      const hash = await writeContract(wagmiConfig, {
        address: lendingTerm.address,
        abi: TermABI,
        functionName: 'partialRepay',
        args: [loanId, debtToRepay]
      });
      const checkRepay = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });
      if (checkRepay.status != 'success') {
        updateStepStatus('Partial Repay', 'Error');
      }
      updateStepStatus('Partial Repay', 'Success');
      setTimeout(function () {
        setReload(true);
      }, 5000);
    } catch (e) {
      console.log(e);
      updateStepStatus('Partial Repay', 'Error');
    }
  }

  async function repay(loanId: string) {
    setOpen(false);

    const checkStepName = `Check ${creditTokenSymbol} allowance`;
    const approveStepName = `Approve ${creditTokenSymbol}`;
    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: checkStepName, status: 'Not Started' },
        { name: approveStepName, status: 'Not Started' },
        { name: 'Repay', status: 'Not Started' }
      ];
      return baseSteps;
    };
    setSteps(createSteps());
    setShowModal(true);

    try {
      const debtToRepay = tableDataWithDebts.find((item) => item.id == loanId).loanDebt;
      const quarterHourInterests =
        (parseUnits(lendingTerm.interestRate.toString(), 2) * debtToRepay) /
        BigInt(100) /
        (BigInt(4) * BigInt(HOURS_IN_YEAR));

      const approvalSuccess = await approvalStepsFlow(
        address,
        lendingTerm.address,
        contractsList?.marketContracts[appMarketId].creditAddress,
        debtToRepay + quarterHourInterests,
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

    try {
      updateStepStatus('Repay', 'In Progress');
      const hash = await writeContract(wagmiConfig, {
        address: lendingTerm.address,
        abi: TermABI,
        functionName: 'repay',
        args: [loanId]
      });

      const checkRepay = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkRepay.status != 'success') {
        updateStepStatus('Repay', 'Error');
      }
      updateStepStatus('Repay', 'Success');
      setTimeout(function () {
        setReload(true);
      }, 5000);
    } catch (e) {
      console.log(e);
      updateStepStatus('Repay', 'Error');
    }
  }

  async function partialRepayGateway(loanId: string, value: string) {
    setOpen(false);

    const checkStepName = `Check ${pegToken.symbol} allowance`;
    const approveStepName = `Approve ${pegToken.symbol}`;

    const createSteps = (): Step[] => {
      const baseSteps: Step[] = [];
      if (
        usePermit &&
        permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.hasPermit
      ) {
        baseSteps.push({
          name: `Sign Permit for ${pegToken.symbol}`,
          status: 'Not Started'
        });
      } else {
        baseSteps.push({ name: checkStepName, status: 'Not Started' });
        baseSteps.push({ name: approveStepName, status: 'Not Started' });
      }

      baseSteps.push({ name: 'Mint + Partial repay (Multicall)', status: 'Not Started' });

      return baseSteps;
    };

    setSteps(createSteps());
    let signaturePegToken: any;

    const debtToRepay = tableDataWithDebts.find((item) => item.id == loanId).loanDebt as bigint;
    const decimalNormalizer = BigInt('1' + '0'.repeat(36 - pegToken.decimals));
    const pegTokenToRepay = parseUnits(value.toString(), pegToken.decimals);
    const creditToRepay = (pegTokenToRepay * decimalNormalizer) / creditMultiplier;

    setShowModal(true);

    /* Set allowance for pegToken */
    if (
      usePermit &&
      permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.hasPermit
    ) {
      try {
        updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'In Progress');

        signaturePegToken = await signPermit({
          contractAddress: pegToken.address as Address,
          erc20Name: contractData?.pegTokenName,
          ownerAddress: address,
          spenderAddress: contractsList.gatewayAddress as Address,
          value: pegTokenToRepay,
          deadline: BigInt(Math.floor((Date.now() + 15 * 60 * 1000) / 1000)),
          nonce: contractData?.pegTokenNonces,
          chainId: appChainId,
          version:
            permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.version || '1'
        });

        if (!signaturePegToken) {
          updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'Error');
          return;
        }
        updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'Success');
      } catch (e) {
        console.log(e);
        updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'Error');
        return;
      }
    } else {
      try {
        const approvalSuccess = await approvalStepsFlow(
          address,
          contractsList.gatewayAddress,
          pegToken.address,
          pegTokenToRepay,
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

    /* Call gateway.multicall() */
    try {
      //build multicall
      const calls = [];

      // pull pegToken on gateway
      if (
        usePermit &&
        permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.hasPermit
      ) {
        calls.push(
          encodeFunctionData({
            abi: GatewayABI as Abi,
            functionName: 'consumePermit',
            args: [
              pegToken.address,
              pegTokenToRepay,
              signaturePegToken.deadline,
              signaturePegToken.v,
              signaturePegToken.r,
              signaturePegToken.s
            ]
          })
        );
      }

      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'consumeAllowance',
          args: [pegToken.address, pegTokenToRepay]
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
              args: [psmAddress, pegTokenToRepay]
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
              args: [contractsList.gatewayAddress, pegTokenToRepay]
            })
          ]
        })
      );

      // partialRepay
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'callExternal',
          args: [
            creditAddress,
            encodeFunctionData({
              abi: CreditABI as Abi,
              functionName: 'approve',
              args: [lendingTerm.address, creditToRepay]
            })
          ]
        })
      );

      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'callExternal',
          args: [
            lendingTerm.address,
            encodeFunctionData({
              abi: TermABI as Abi,
              functionName: 'partialRepay',
              args: [loanId, creditToRepay]
            })
          ]
        })
      );

      // sweep leftovers
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'sweep',
          args: [creditAddress]
        })
      );

      //get description of calls in multicall
      updateStepStatus(`Mint + Partial repay (Multicall)`, 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'multicall',
        args: [calls],
        gas: 1_000_000
      });

      const checkTx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkTx.status === 'success') {
        setTimeout(function () {
          setReload(true);
        }, 5000);
        updateStepStatus('Mint + Partial repay (Multicall)', 'Success');
        return;
      } else {
        updateStepStatus('Mint + Partial repay (Multicall)', 'Error');
      }

      updateStepStatus(`Mint + Partial repay (Multicall)`, 'Success');
    } catch (e: any) {
      console.log(e?.shortMessage);
      console.log(e);
      updateStepStatus('Mint + Partial repay (Multicall)', 'Error');
      return;
    }
  }

  async function getRepayGatewayLeverageData(loanId: string) {
    const loan = tableDataWithDebts.find((item) => item.id == loanId);
    const collateralAmount = loan.collateralAmount as bigint;
    const collateralValue: number = formatUnits(collateralAmount, collateralToken.decimals) * collateralToken.price;
    const quarterHourInterests =
      (parseUnits(lendingTerm.interestRate.toString(), 2) * loan.loanDebt) /
      BigInt(100) /
      (BigInt(4) * BigInt(HOURS_IN_YEAR));
    const decimalNormalizer = BigInt('1' + '0'.repeat(36 - pegToken.decimals));
    const pegTokenDebt = ((loan.loanDebt + quarterHourInterests) * creditMultiplier) / decimalNormalizer + BigInt(1); // add 1 wei for rounding
    const debtValue = Number(formatUnits(pegTokenDebt, pegToken.decimals)) * pegToken.price;
    const ltv = (100 * debtValue) / collateralValue;
    const minCollateralRemaining = (collateralAmount * BigInt(Math.max(0, Math.ceil(100 - ltv - 1)))) / BigInt(100);
    const dexData = await getDexRouterData(
      getLeverageConfig(lendingTerm, coinDetails, contractsList?.marketContracts[appMarketId].pegTokenAddress)
        .leverageDex,
      lendingTerm.collateral.address,
      pegToken?.address,
      collateralAmount - minCollateralRemaining,
      0.005, // 0.5% max slippage
      contractsList.gatewayAddress,
      contractsList.gatewayAddress
    );
    return {
      input: {
        collateralAmount,
        minCollateralRemaining,
        pegTokenDebt,
        ltv
      },
      output: dexData
    };
  }

  async function repayGatewayLeverage(loanId: string) {
    setOpen(false);
    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: `Check ${lendingTerm.collateral.name} allowance`, status: 'Not Started' },
        usePermit &&
        permitConfig.find((item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase())
          ?.hasPermit
          ? {
              name: `Sign Permit for ${lendingTerm.collateral.symbol}`,
              status: 'Not Started'
            }
          : { name: `Approve ${lendingTerm.collateral.symbol}`, status: 'Not Started' },
        { name: 'Repay with Flashloan', status: 'Not Started' }
      ];
      return baseSteps;
    };
    setSteps(createSteps());

    let signatureCollateral: any;

    const loan = tableDataWithDebts.find((item) => item.id == loanId);
    const collateralAmount = loan.collateralAmount as bigint;

    setShowModal(true);

    /* Set allowance for collateral token */
    if (
      usePermit &&
      permitConfig.find((item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase())
        ?.hasPermit
    ) {
      try {
        updateStepStatus(`Check ${lendingTerm.collateral.name} allowance`, 'Success');
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'In Progress');

        signatureCollateral = await signPermit({
          contractAddress: lendingTerm.collateral.address,
          erc20Name: contractData?.collaternalTokenName,
          ownerAddress: address,
          spenderAddress: contractsList.gatewayAddress as Address,
          value: collateralAmount,
          deadline: BigInt(Math.floor((Date.now() + 20 * 60 * 1000) / 1000)),
          nonce: contractData?.collateralNonces,
          chainId: appChainId,
          version:
            permitConfig.find((item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase())
              ?.version || '1'
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
          collateralAmount,
          appChainId,
          updateStepStatus,
          `Check ${lendingTerm.collateral.name} allowance`,
          `Approve ${lendingTerm.collateral.name}`,
          wagmiConfig
        );

        if (!approvalSuccess) {
          updateStepStatus(`Approve ${lendingTerm.collateral.name}`, 'Error');
          return;
        }
      } catch (e) {
        console.log(e);
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, 'Error');
        return;
      }
    }

    /* Call gateway.multicall() */
    try {
      updateStepStatus('Repay with Flashloan', 'In Progress');
      const dexData = await getRepayGatewayLeverageData(loanId);
      let pullCollateralCalls = [
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'consumeAllowance',
          args: [lendingTerm.collateral.address, collateralAmount]
        })
      ];
      if (signatureCollateral) {
        pullCollateralCalls.unshift(
          encodeFunctionData({
            abi: GatewayABI as Abi,
            functionName: 'consumePermit',
            args: [
              lendingTerm.collateral.address,
              collateralAmount,
              signatureCollateral.deadline,
              signatureCollateral.v,
              signatureCollateral.r,
              signatureCollateral.s
            ]
          })
        );
      }

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'repayWithBalancerFlashLoan',
        args: [
          {
            loanId: loanId,
            term: lendingTerm.address,
            psm: psmAddress,
            collateralToken: lendingTerm.collateral.address,
            pegToken: pegToken.address,
            minCollateralRemaining: dexData.input.minCollateralRemaining,
            pullCollateralCalls: pullCollateralCalls,
            routerAddress: dexData.output.routerAddress,
            routerCallData: dexData.output.routerData
          }
        ],
        gas: dexData.output.routerGas + 5_000_000
      });

      const txReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (txReceipt.status === 'success') {
        setTimeout(function () {
          setReload(true);
        }, 5000);
        updateStepStatus('Repay with Flashloan', 'Success');
        return;
      } else {
        updateStepStatus('Repay with Flashloan', 'Error');
      }

      updateStepStatus(`Repay with Flashloan`, 'Success');
    } catch (e) {
      console.log(e?.shortMessage);
      console.log(e);
      updateStepStatus('Repay with Flashloan', 'Error');
      return;
    }
  }

  async function repayGateway(loanId: string, value: string) {
    setOpen(false);

    const checkStepName = `Check ${pegToken.symbol} allowance`;
    const approveStepName = `Approve ${pegToken.symbol}`;

    const createSteps = (): Step[] => {
      const baseSteps: Step[] = [];
      if (
        usePermit &&
        permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.hasPermit
      ) {
        baseSteps.push({
          name: `Sign Permit for ${pegToken.symbol}`,
          status: 'Not Started'
        });
      } else {
        baseSteps.push({ name: checkStepName, status: 'Not Started' });
        baseSteps.push({ name: approveStepName, status: 'Not Started' });
      }

      baseSteps.push({ name: 'Mint + Repay (Multicall)', status: 'Not Started' });

      return baseSteps;
    };

    setSteps(createSteps());
    let signaturePegToken: any;

    const debtToRepay = tableDataWithDebts.find((item) => item.id == loanId).loanDebt as bigint;
    const quarterHourInterests =
      (parseUnits(lendingTerm.interestRate.toString(), 2) * debtToRepay) /
      BigInt(100) /
      (BigInt(4) * BigInt(HOURS_IN_YEAR));
    const decimalNormalizer = BigInt('1' + '0'.repeat(36 - pegToken.decimals));
    const pegTokenDebt = ((debtToRepay + quarterHourInterests) * creditMultiplier) / decimalNormalizer + BigInt(1); // add 1 wei for rounding
    const pegTokenToRepay = pegTokenDebt;
    const creditToRepay = (pegTokenToRepay * decimalNormalizer) / creditMultiplier;

    setShowModal(true);

    /* Set allowance for pegToken */
    if (
      usePermit &&
      permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.hasPermit
    ) {
      try {
        updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'In Progress');

        signaturePegToken = await signPermit({
          contractAddress: pegToken.address as Address,
          erc20Name: contractData?.pegTokenName,
          ownerAddress: address,
          spenderAddress: contractsList.gatewayAddress as Address,
          value: pegTokenToRepay,
          deadline: BigInt(Math.floor((Date.now() + 15 * 60 * 1000) / 1000)),
          nonce: contractData?.pegTokenNonces,
          chainId: appChainId,
          version:
            permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.version || '1'
        });

        if (!signaturePegToken) {
          updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'Error');
          return;
        }
        updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'Success');
      } catch (e) {
        console.log(e);
        updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'Error');
        return;
      }
    } else {
      try {
        const approvalSuccess = await approvalStepsFlow(
          address,
          contractsList.gatewayAddress,
          pegToken.address,
          pegTokenToRepay,
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

    /* Call gateway.multicall() */
    try {
      //build multicall
      const calls = [];

      // pull pegToken on gateway
      if (
        usePermit &&
        permitConfig.find((item) => item.address.toLowerCase() === pegToken.address.toLowerCase())?.hasPermit
      ) {
        calls.push(
          encodeFunctionData({
            abi: GatewayABI as Abi,
            functionName: 'consumePermit',
            args: [
              pegToken.address,
              pegTokenToRepay,
              signaturePegToken.deadline,
              signaturePegToken.v,
              signaturePegToken.r,
              signaturePegToken.s
            ]
          })
        );
      }

      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'consumeAllowance',
          args: [pegToken.address, pegTokenToRepay]
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
              args: [psmAddress, pegTokenToRepay]
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
              args: [contractsList.gatewayAddress, pegTokenToRepay]
            })
          ]
        })
      );

      // repay
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'callExternal',
          args: [
            creditAddress,
            encodeFunctionData({
              abi: CreditABI as Abi,
              functionName: 'approve',
              args: [lendingTerm.address, creditToRepay]
            })
          ]
        })
      );

      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'callExternal',
          args: [
            lendingTerm.address,
            encodeFunctionData({
              abi: TermABI as Abi,
              functionName: 'repay',
              args: [loanId]
            })
          ]
        })
      );

      // sweep leftovers
      calls.push(
        encodeFunctionData({
          abi: GatewayABI as Abi,
          functionName: 'sweep',
          args: [creditAddress]
        })
      );

      //get description of calls in multicall
      updateStepStatus(`Mint + Repay (Multicall)`, 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'multicall',
        args: [calls],
        gas: 1_250_000
      });

      const checkTx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkTx.status === 'success') {
        setTimeout(function () {
          setReload(true);
        }, 5000);
        updateStepStatus('Mint + Repay (Multicall)', 'Success');
        return;
      } else {
        updateStepStatus('Mint + Repay (Multicall)', 'Error');
      }

      updateStepStatus(`Mint + Repay (Multicall)`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus('Mint + Repay (Multicall)', 'Error');
      return;
    }
  }

  /* End of smart contract writes */

  /* Set table */
  const columnHelper = createColumnHelper<loanObj>();

  const columns = [
    columnHelper.accessor('id', {
      id: 'id',
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Loan Id</p>
          </a>
        </div>
      ),
      cell: (info: any) => (
        <div className="flex justify-center">
          <ItemIdBadge id={info.getValue()} />
        </div>
      )
    }),
    columnHelper.accessor('loanDebt', {
      id: 'loanDebt',
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Debt</p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        return (
          <div className="ml-3 text-center">
            <div className="font-semibold text-gray-700 dark:text-white">
              <div className="flex items-center justify-center gap-1">
                <Image src={pegTokenLogo} width={20} height={20} alt="logo" />{' '}
                {formatDecimal(
                  ((Number(info.row.original.loanDebt) / 1e18) * Number(creditMultiplier)) / 1e18,
                  creditTokenDecimalsToDisplay
                )}
              </div>
            </div>
            <div className="text-sm text-gray-400 dark:text-gray-200">
              ${' '}
              {formatDecimal(
                (((pegToken.price * Number(info.row.original.loanDebt)) / 1e18) * Number(creditMultiplier)) / 1e18,
                2
              )}
            </div>
          </div>
        );
      }
    }),
    columnHelper.accessor('collateralAmount', {
      id: 'collateralAmount',
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Collateral</p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        return (
          <div className="ml-3 text-center">
            <div className="font-semibold text-gray-700 dark:text-white">
              <div className="flex items-center justify-center gap-1">
                <ImageWithFallback
                  src={lendingTerm.collateral.logo}
                  fallbackSrc="/img/crypto-logos/unk.png"
                  width={20}
                  height={20}
                  alt="logo"
                />{' '}
                {formatDecimal(
                  Number(formatUnits(info.row.original.collateralAmount, lendingTerm.collateral.decimals)),
                  collateralTokenDecimalsToDisplay
                )}
              </div>
            </div>
            <div className="text-sm text-gray-400 dark:text-gray-200">
              ${' '}
              {formatDecimal(
                Number(formatUnits(info.getValue(), lendingTerm.collateral.decimals)) * collateralToken.price,
                2
              )}
            </div>
          </div>
        );
      }
    }),
    {
      id: 'borrowTime',
      enableSorting: true,
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Next Payment</p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const currentDateInSeconds = Date.now() / 1000;
        const sumOfTimestamps = repays[info.row.original.id] + lendingTerm.maxDelayBetweenPartialRepay;
        const nextPaymentDue =
          lendingTerm.maxDelayBetweenPartialRepay === 0
            ? 'n/a'
            : Number.isNaN(sumOfTimestamps)
            ? '--'
            : sumOfTimestamps < currentDateInSeconds
            ? 'Overdue'
            : secondsToAppropriateUnit(sumOfTimestamps - currentDateInSeconds);

        return (
          <div className="flex flex-col items-center">
            {lendingTerm.maxDelayBetweenPartialRepay != 0 ? (
              <>
                <div
                  className={clsx(
                    'flex items-center justify-center gap-1',
                    nextPaymentDue === 'Overdue'
                      ? 'text-red-500 dark:text-red-500'
                      : 'text-amber-500 dark:text-amber-300'
                  )}
                >
                  <MdOutlineError />
                  <p>{nextPaymentDue}</p>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-200">
                  <span className="whitespace-nowrap">Min. repay:</span>
                  <br />
                  <strong>
                    ${' '}
                    {formatDecimal(
                      (((Number(info.row.original.loanDebt) / 1e18) * Number(creditMultiplier)) / 1e18) *
                        lendingTerm.minPartialRepayPercent *
                        pegToken.price,
                      2
                    )}{' '}
                  </strong>
                </p>
              </>
            ) : (
              '-'
            )}
          </div>
        );
      }
    },
    {
      id: 'ltv',
      header: () => (
        <div>
          <a href="#" className="group inline-flex">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-white">Call Threshold</p>
          </a>
        </div>
      ),
      cell: (info: any) => {
        const collateralValue =
          Number(formatUnits(info.row.original.collateralAmount, lendingTerm.collateral.decimals)) *
          collateralToken.price;
        const debtValue =
          (((pegToken.price * Number(info.row.original.loanDebt)) / 1e18) * Number(creditMultiplier)) / 1e18;
        const ltv = (100 * debtValue) / collateralValue;
        const maxBorrow = (lendingTerm.borrowRatio * Number(creditMultiplier)) / 1e18;
        const currentBorrowRatio =
          ((Number(info.row.original.loanDebt) / 1e18) * Number(creditMultiplier)) /
          1e18 /
          Number(formatUnits(info.row.original.collateralAmount, collateralToken.decimals));
        const borrowRatio = (100 * currentBorrowRatio) / maxBorrow;

        return (
          <div className="ml-3 text-center">
            <p
              className={clsx(
                'font-semibold',
                Number(borrowRatio) < 80
                  ? 'text-green-500'
                  : Number(borrowRatio) < 90
                  ? 'text-amber-500'
                  : 'text-red-500'
              )}
            >
              {formatDecimal(borrowRatio, 2)} %
            </p>
            <p className="whitespace-nowrap text-sm text-gray-400 dark:text-gray-200">
              LTV : {formatDecimal(ltv, 2)} %
            </p>
          </div>
        );
      }
    },
    {
      id: 'repay',
      header: '',
      cell: (info: any) => (
        <div className="text-center font-medium text-gray-600 dark:text-white">
          <button
            onClick={() => handleModalOpening(info.row.original)}
            type="button"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-700 dark:ring-navy-600"
          >
            Repay
          </button>
        </div>
      )
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
    initialState: {
      pagination: {
        pageSize: 6
      },
      sorting: [
        {
          id: 'borrowTime',
          desc: true
        }
      ]
    }
  });
  /* End of table */

  const handleModalOpening = (rowData: loanObj) => {
    setSelectedRow(rowData);
    setOpen(true);
  };

  return (
    <>
      {showModal && <StepModal steps={steps} close={setShowModal} setSteps={setSteps} />}
      <ModalRepay
        setOpen={setOpen}
        isOpen={open}
        creditBalance={creditBalance}
        pegTokenBalance={pegTokenBalance}
        rowData={selectedRow}
        repay={repay}
        partialRepay={partialRepay}
        repayGateway={repayGateway}
        partialRepayGateway={partialRepayGateway}
        repayGatewayLeverage={repayGatewayLeverage}
        getRepayGatewayLeverageData={getRepayGatewayLeverageData}
        creditMultiplier={creditMultiplier}
        minBorrow={minBorrow}
      />

      {isLoadingEventLoans ? (
        <div className="mt-20 flex justify-center">
          <Spinner />
        </div>
      ) : data && !isLoadingEventLoans && data.length == 0 ? (
        <div className="mt-20 flex-col items-center justify-center opacity-40">
          <div className="flex justify-center">
            <MdOutlineHandshake className="h-10 w-10" />
          </div>
          <div className="mt-4 flex justify-center">You do not have any active loans</div>
        </div>
      ) : (
        <CustomTable withNav={true} table={table} />
      )}
    </>
  );
}

export default Myloans;
