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
import { TermABI, ERC20PermitABI, GatewayABI, CreditABI } from 'lib/contracts';
import { secondsToAppropriateUnit } from 'utils/date';
import { LendingTerms, loanObj } from 'types/lending';
import { useAccount, useReadContracts } from 'wagmi';
import { Step } from 'components/stepLoader/stepType';
import { MdOutlineError, MdOutlineHandshake } from 'react-icons/md';
import { formatDecimal, gUsdcToUsdc, usdcToGUsdc, toLocaleString } from 'utils/numbers';
import { Abi, Address, erc20Abi, formatUnits, parseUnits } from 'viem';
import clsx from 'clsx';
import ModalRepay from './ModalRepay';
import StepModal from 'components/stepLoader';
import Spinner from 'components/spinner';
import { wagmiConfig } from 'contexts/Web3Provider';
import { ItemIdBadge } from 'components/badge/ItemIdBadge';
import { signPermit } from 'lib/transactions/signPermit';
import moment from 'moment';
import { simpleRepay } from './helper/simpleRepay';
import { getMulticallsDecoded } from 'lib/transactions/getMulticallsDecoded';
import { HOURS_IN_YEAR } from 'utils/constants';
import { getPegTokenLogo, permitConfig } from 'config';
import { getAllowCollateralTokenCall } from './helper/repayWithLeverage';
import { CurrencyTypes } from 'components/switch/ToggleCredit';
import CustomTable from 'components/table/CustomTable';
import { useAppStore } from 'store';
import { marketsConfig } from 'config';

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
  minBorrow,
  currencyType
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
  currencyType: CurrencyTypes;
}) {
  const { appMarketId, appChainId, coinDetails, contractsList } = useAppStore();
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
      }
    ],
    query: {
      select: (data) => {
        return {
          collateralNonces: data[0].result as bigint
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
    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: `Approve ${creditTokenSymbol}`, status: 'Not Started' },
        { name: 'Partial Repay', status: 'Not Started' }
      ];
      return baseSteps;
    };
    setSteps(createSteps());
    setShowModal(true);

    const debtToRepay = parseUnits(value, 18);

    try {
      updateStepStatus(`Approve ${creditTokenSymbol}`, 'In Progress');

      const hash = await writeContract(wagmiConfig, {
        address: contractsList?.marketContracts[appMarketId].creditAddress,
        abi: CreditABI,
        functionName: 'approve',
        args: [lendingTerm.address, debtToRepay]
      });

      const data = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (data.status != 'success') {
        updateStepStatus(`Approve ${creditTokenSymbol}`, 'Error');
        return;
      }
      updateStepStatus(`Approve ${creditTokenSymbol}`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus(`Approve ${creditTokenSymbol}`, 'Error');
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

    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: `Approve ${creditTokenSymbol}`, status: 'Not Started' },
        { name: 'Repay', status: 'Not Started' }
      ];
      return baseSteps;
    };
    setSteps(createSteps());
    setShowModal(true);

    try {
      updateStepStatus(`Approve ${creditTokenSymbol}`, 'In Progress');
      const debtToRepay = tableDataWithDebts.find((item) => item.id == loanId).loanDebt;
      const hourlyFees =
        (parseUnits(lendingTerm.interestRate.toString(), 2) * debtToRepay) / BigInt(100) / BigInt(HOURS_IN_YEAR);

      const hash = await writeContract(wagmiConfig, {
        address: contractsList?.marketContracts[appMarketId].creditAddress,
        abi: CreditABI,
        functionName: 'approve',
        args: [lendingTerm.address, debtToRepay + hourlyFees]
      });

      const data = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (data.status != 'success') {
        updateStepStatus(`Approve ${creditTokenSymbol}`, 'Error');
        return;
      }
      updateStepStatus(`Approve ${creditTokenSymbol}`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus(`Approve ${creditTokenSymbol}`, 'Error');
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

    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: `Sign Permit for ${pegToken.symbol}`, status: 'Not Started' },
        { name: 'Partial Repay', status: 'Not Started' }
      ];
      return baseSteps;
    };

    setSteps(createSteps());
    let signatureUSDC: any;

    const usdcAmount = parseUnits(value, 6);
    const debtToRepay = usdcToGUsdc(
      usdcAmount,
      tableDataWithDebts.find((item) => item.id == loanId).borrowCreditMultiplier as bigint
    );

    setShowModal(true);

    /* Sign permit on USDC for Gateway*/
    try {
      updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'In Progress');

      signatureUSDC = await signPermit({
        contractAddress: pegToken.address as Address,
        erc20Name: pegToken.name,
        ownerAddress: address,
        spenderAddress: contractsList.gatewayAddress as Address,
        value: usdcAmount,
        deadline: BigInt(Number(moment().add(10, 'seconds'))),
        nonce: pegTokenNonces,
        chainId: wagmiConfig.chains[0].id,
        permitVersion: '1'
      });

      if (!signatureUSDC) {
        updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'Error');
        return;
      }
      updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus(`Sign Permit for ${pegToken.symbol}`, 'Error');
      return;
    }

    /* Call gateway.multicall() */
    try {
      //build multicall
      const calls = simpleRepay(
        'partial',
        lendingTerm,
        loanId,
        usdcAmount,
        debtToRepay,
        signatureUSDC,
        contractsList,
        pegToken.address,
        creditAddress,
        psmAddress
      );

      //get description of calls in multicall
      const callsDescription = getMulticallsDecoded(calls, lendingTerm, contractsList);
      updateStepStatus(`Partial Repay`, 'In Progress', callsDescription);

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'multicall',
        args: [calls]
      });

      const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkBorrow.status === 'success') {
        setTimeout(function () {
          setReload(true);
        }, 5000);
        updateStepStatus('Partial Repay', 'Success');
        return;
      } else {
        updateStepStatus('Partial Repay', 'Error');
      }

      updateStepStatus(`Partial Repay`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus('Partial Repay', 'Error');
      return;
    }
  }

  // async function partialRepayGatewayLeverage(
  //   loanId: string,
  //   value: string,
  //   flashloanValue: string
  // ) {
  //   setOpen(false)
  //   const createSteps = (): Step[] => {
  //     const baseSteps = [
  //       permitConfig.find(
  //         (item) => item.collateralAddress === lendingTerm.collateral.address
  //       )?.hasPermit
  //         ? {
  //             name: `Sign Permit for ${lendingTerm.collateral.symbol}`,
  //             status: "Not Started",
  //           }
  //         : { name: `Approve ${lendingTerm.collateral.symbol}`, status: "Not Started" },
  //       { name: "Sign Permit for USDC", status: "Not Started" },
  //       { name: "Partial Repay with Leverage", status: "Not Started" },
  //     ]
  //     return baseSteps
  //   }
  //   setSteps(createSteps())

  //   let signatureUSDC: any
  //   let signatureCollateral: any

  //   const usdcAmount = parseUnits(value, 6)
  //   const usdcAmountFlashloan = parseUnits(flashloanValue, 6)
  //   const debtToRepay = usdcToGUsdc(
  //     usdcAmount + usdcAmountFlashloan,
  //     tableDataWithDebts.find((item) => item.id == loanId)
  //       .borrowCreditMultiplier as bigint
  //   )
  //   const flashloanCollateralAmount = calculateCollateralAmount(
  //     usdcToGUsdc(
  //       usdcAmountFlashloan,
  //       tableDataWithDebts.find((item) => item.id == loanId)
  //         .borrowCreditMultiplier as bigint
  //     )
  //   )
  //   const collateralAmount = calculateCollateralAmount(debtToRepay)
  //   console.log("usdcAmount", usdcAmount)
  //   console.log("usdcAmountFlashloan", usdcAmountFlashloan)
  //   console.log("debtToRepay", debtToRepay)
  //   console.log("flashloanCollateralAmount", flashloanCollateralAmount)
  //   console.log("collateralAmount", collateralAmount)

  //   setShowModal(true)

  //   /* Set allowance for collateral token */
  //   if (
  //     permitConfig.find(
  //       (item) => item.collateralAddress === lendingTerm.collateral.address
  //     )?.hasPermit
  //   ) {
  //     try {
  //       updateStepStatus(
  //         `Sign Permit for ${lendingTerm.collateral.symbol}`,
  //         "In Progress"
  //       )

  //       signatureCollateral = await signPermit({
  //         contractAddress: lendingTerm.collateral.address,
  //         erc20Name: lendingTerm.collateral.name,
  //         ownerAddress: address,
  //         spenderAddress: contractsList.gatewayAddress as Address,
  //         value: collateralAmount,
  //         deadline: BigInt(Number(moment().add(10, "seconds"))),
  //         nonce: contractData?.collateralNonces,
  //         chainId: wagmiConfig.chains[0].id,
  //         permitVersion: "1",
  //       })

  //       if (!signatureCollateral) {
  //         updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
  //         return
  //       }
  //       updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Success")
  //     } catch (e) {
  //       console.log(e)
  //       updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
  //       return
  //     }
  //   } else {
  //     try {
  //       updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "In Progress")

  //       const hash = await writeContract(wagmiConfig, {
  //         address: lendingTerm.collateral.address,
  //         abi: erc20Abi,
  //         functionName: "approve",
  //         args: [contractsList.gatewayAddress as Address, collateralAmount],
  //       })
  //       const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
  //         hash: hash,
  //       })

  //       if (checkApprove.status != "success") {
  //         updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
  //         return
  //       }
  //       updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Success")
  //     } catch (e) {
  //       console.log(e)
  //       updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
  //       return
  //     }
  //   }

  //   /* Sign permit on USDC for Gateway*/
  //   try {
  //     updateStepStatus(`Sign Permit for USDC`, "In Progress")

  //     signatureUSDC = await signPermit({
  //       contractAddress: pegToken.address,
  //       erc20Name: pegToken.name,
  //       ownerAddress: address,
  //       spenderAddress: contractsList.gatewayAddress as Address,
  //       value: usdcAmount,
  //       deadline: BigInt(Number(moment().add(10, "seconds"))),
  //       nonce: pegTokenNonces,
  //       chainId: wagmiConfig.chains[0].id,
  //       permitVersion: "1",
  //     })

  //     if (!signatureUSDC) {
  //       updateStepStatus(`Sign Permit for USDC`, "Error")
  //       return
  //     }
  //     updateStepStatus(`Sign Permit for USDC`, "Success")
  //   } catch (e) {
  //     console.log(e)
  //     updateStepStatus(`Sign Permit for USDC`, "Error")
  //     return
  //   }

  //   const deadlineSwap = BigInt(Number(moment().add(3600, "seconds")))
  //   console.log(
  //     "repayMode",
  //     debtToRepay >= tableDataWithDebts.find((item) => item.id == loanId).loanDebt
  //       ? "full"
  //       : "partial"
  //   )

  //   /* Call gateway.multicall() */
  //   try {
  //     //build multicall
  //     const calls = repayWithLeverage(
  //       debtToRepay >= tableDataWithDebts.find((item) => item.id == loanId).loanDebt
  //         ? "full"
  //         : "partial",
  //       lendingTerm,
  //       loanId,
  //       debtToRepay, //in gUSDC
  //       usdcAmount, //in USDC
  //       collateralAmount, // eg: sDAI
  //       flashloanCollateralAmount, // eg: sDAI
  //       usdcAmountFlashloan,
  //       signatureCollateral,
  //       signatureUSDC,
  //       deadlineSwap,
  //       contractsList,
  //       pegToken.address,
  //       creditAddress,
  //       psmAddress
  //     )

  //     //get description of calls in multicall
  //     const callsDescription = getMulticallsDecoded(calls, lendingTerm)
  //     updateStepStatus(`Partial Repay with Leverage`, "In Progress", callsDescription)

  //     const hash = await writeContract(wagmiConfig, {
  //       ...gatewayContract,
  //       functionName: "multicallWithBalancerFlashLoan",
  //       args: [[lendingTerm.collateral.address], [flashloanCollateralAmount], calls],
  //     })

  //     const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
  //       hash: hash,
  //     })

  //     if (checkBorrow.status === "success") {
  //
  //       setTimeout(function() {
  //         setReload(true);
  //       }, 5000);
  //       updateStepStatus("Partial Repay with Leverage", "Success")
  //       return
  //     } else {
  //       updateStepStatus("Partial Repay with Leverage", "Error")
  //     }

  //     updateStepStatus(`Partial Repay with Leverage`, "Success")
  //   } catch (e) {
  //     console.log(e)
  //     updateStepStatus("Partial Repay with Leverage", "Error")
  //     return
  //   }
  // }

  async function repayGatewayLeverage(loanId: string) {
    setOpen(false);
    const createSteps = (): Step[] => {
      const baseSteps = [
        permitConfig.find((item) => item.collateralAddress === lendingTerm.collateral.address)?.hasPermit
          ? {
              name: `Sign Permit for ${lendingTerm.collateral.symbol}`,
              status: 'Not Started'
            }
          : { name: `Approve ${lendingTerm.collateral.symbol}`, status: 'Not Started' },
        { name: 'Repay with Leverage', status: 'Not Started' }
      ];
      return baseSteps;
    };
    setSteps(createSteps());

    let signatureCollateral: any;

    const collateralAmount = tableDataWithDebts.find((item) => item.id == loanId).collateralAmount as bigint;

    setShowModal(true);

    /* Set allowance for collateral token */
    if (permitConfig.find((item) => item.collateralAddress === lendingTerm.collateral.address)?.hasPermit) {
      try {
        updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, 'In Progress');

        signatureCollateral = await signPermit({
          contractAddress: lendingTerm.collateral.address,
          erc20Name: lendingTerm.collateral.name,
          ownerAddress: address,
          spenderAddress: contractsList.gatewayAddress as Address,
          value: collateralAmount,
          deadline: BigInt(Number(moment().add(10, 'seconds'))),
          nonce: contractData?.collateralNonces,
          chainId: wagmiConfig.chains[0].id,
          permitVersion: '1'
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
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, 'In Progress');

        const hash = await writeContract(wagmiConfig, {
          address: lendingTerm.collateral.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contractsList.gatewayAddress as Address, collateralAmount]
        });
        const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
          hash: hash
        });

        if (checkApprove.status != 'success') {
          updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, 'Error');
          return;
        }
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, 'Success');
      } catch (e) {
        console.log(e);
        updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, 'Error');
        return;
      }
    }

    /* Call gateway.multicall() */
    try {
      updateStepStatus('Repay with Leverage', 'In Progress');
      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'repayWithBalancerFlashLoan',
        args: [
          loanId,
          lendingTerm.address,
          psmAddress,
          contractsList.uniswapRouterAddress,
          lendingTerm.collateral.address,
          pegToken.address,
          collateralAmount,
          getAllowCollateralTokenCall(lendingTerm, collateralAmount, signatureCollateral)
        ]
      });

      const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkBorrow.status === 'success') {
        setTimeout(function () {
          setReload(true);
        }, 5000);
        updateStepStatus('Repay with Leverage', 'Success');
        return;
      } else {
        updateStepStatus('Repay with Leverage', 'Error');
      }

      updateStepStatus(`Repay with Leverage`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus('Repay with Leverage', 'Error');
      return;
    }
  }

  async function repayGateway(loanId: string) {
    setOpen(false);
    const createSteps = (): Step[] => {
      const baseSteps = [
        { name: 'Sign Permit for USDC', status: 'Not Started' },
        { name: 'Repay', status: 'Not Started' }
      ];
      return baseSteps;
    };
    setSteps(createSteps());

    let signatureUSDC: any;

    const debtToRepay = tableDataWithDebts.find((item) => item.id == loanId).loanDebt;
    const hourlyFees =
      (parseUnits(lendingTerm.interestRate.toString(), 2) * debtToRepay) / BigInt(100) / BigInt(HOURS_IN_YEAR);
    const usdcAmountToApprove = gUsdcToUsdc(
      tableDataWithDebts.find((item) => item.id == loanId).loanDebt + hourlyFees,
      creditMultiplier
    );

    setShowModal(true);

    /* Sign permit on USDC for Gateway*/
    try {
      updateStepStatus(`Sign Permit for USDC`, 'In Progress');

      signatureUSDC = await signPermit({
        contractAddress: pegToken.address as Address,
        erc20Name: pegToken.name,
        ownerAddress: address,
        spenderAddress: contractsList.gatewayAddress as Address,
        value: usdcAmountToApprove,
        deadline: BigInt(Number(moment().add(10, 'seconds'))),
        nonce: pegTokenNonces,
        chainId: wagmiConfig.chains[0].id,
        permitVersion: '1'
      });

      if (!signatureUSDC) {
        updateStepStatus(`Sign Permit for USDC`, 'Error');
        return;
      }
      updateStepStatus(`Sign Permit for USDC`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus(`Sign Permit for USDC`, 'Error');
      return;
    }

    /* Call gateway.multicall() */
    try {
      //build multicall
      const calls = simpleRepay(
        'full',
        lendingTerm,
        loanId,
        usdcAmountToApprove,
        tableDataWithDebts.find((item) => item.id == loanId).loanDebt + hourlyFees,
        signatureUSDC,
        contractsList,
        pegToken.address,
        creditAddress,
        psmAddress
      );

      //get description of calls in multicall
      const callsDescription = getMulticallsDecoded(calls, lendingTerm, contractsList);
      updateStepStatus(`Repay`, 'In Progress', callsDescription);

      const hash = await writeContract(wagmiConfig, {
        address: contractsList.gatewayAddress,
        abi: GatewayABI,
        functionName: 'multicall',
        args: [calls]
      });

      const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash
      });

      if (checkBorrow.status === 'success') {
        setTimeout(function () {
          setReload(true);
        }, 5000);
        updateStepStatus('Repay', 'Success');
        return;
      } else {
        updateStepStatus('Repay', 'Error');
      }

      updateStepStatus(`Repay`, 'Success');
    } catch (e) {
      console.log(e);
      updateStepStatus('Repay', 'Error');
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
            <p className="font-semibold text-gray-700 dark:text-white">
              <div className="flex items-center justify-center gap-1">
                <Image src={pegTokenLogo} width={20} height={20} alt="logo" />{' '}
                {formatDecimal(
                  ((Number(info.row.original.loanDebt) / 1e18) * Number(creditMultiplier)) / 1e18,
                  creditTokenDecimalsToDisplay * 2
                )}
              </div>
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-200">
              ${' '}
              {formatDecimal(
                (((pegToken.price * Number(info.row.original.loanDebt)) / 1e18) * Number(creditMultiplier)) / 1e18,
                creditTokenDecimalsToDisplay * 2
              )}
            </p>
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
            <p className="font-semibold text-gray-700 dark:text-white">
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
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-200">
              ${' '}
              {formatDecimal(
                Number(formatUnits(info.getValue(), lendingTerm.collateral.decimals)) * collateralToken.price,
                2
              )}
            </p>
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
                  Min. repay:{' '}
                  <strong>
                    ${' '}
                    {formatDecimal(
                      Number(formatUnits(info.row.original.borrowAmount, 18)) * lendingTerm.minPartialRepayPercent,
                      2
                    )}
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
            <p className="text-sm text-gray-400 dark:text-gray-200">LTV : {formatDecimal(ltv, 2)} %</p>
          </div>
        );
      }
    },
    {
      id: 'repay',
      header: '',
      cell: (info: any) => (
        <p className="text-center font-medium text-gray-600 dark:text-white">
          <button
            onClick={() => handleModalOpening(info.row.original)}
            type="button"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-700 dark:ring-navy-600"
          >
            Repay
          </button>
        </p>
      )
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
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
        creditMultiplier={creditMultiplier}
        minBorrow={minBorrow}
        currencyType={currencyType}
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
