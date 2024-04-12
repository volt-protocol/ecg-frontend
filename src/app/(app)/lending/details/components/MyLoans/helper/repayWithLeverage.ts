import { GatewayABI, PsmUsdcABI, TermABI, CreditABI, UniswapRouterABI, UsdcABI } from 'lib/contracts';
import { LendingTerms } from 'types/lending';
import { ContractsList } from 'store/slices/contracts-list';
import { Abi, encodeFunctionData, erc20Abi } from 'viem';

export const repayWithLeverage = (
  type: 'full' | 'partial',
  lendingTerm: LendingTerms,
  loanId: string,
  debtToRepay: bigint, //in gUSDC
  usdcAmount: bigint, //in USDC
  collateralAmount: bigint, // eg: sDAI
  flashloanAmount: bigint, // eg: sDAI
  flashloanAmountUSDC: bigint,
  permitDataCollateral: any | undefined,
  permitDataUSDC: any,
  deadlineSwap: bigint,
  contractsList: ContractsList,
  pegTokenAddress: string,
  creditTokenAddress: string,
  psmAddress: string
) => {
  let calls = [];

  // pull usdc on gateway
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'consumePermit',
      args: [pegTokenAddress, usdcAmount, permitDataUSDC.deadline, permitDataUSDC.v, permitDataUSDC.r, permitDataUSDC.s]
    })
  );
  // consumer usdc allowance on gateway
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'consumeAllowance',
      args: [pegTokenAddress, usdcAmount]
    })
  );

  // swap flashloaned sDAI to USDC
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        lendingTerm.collateral.address,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [contractsList.uniswapRouterAddress, collateralAmount]
        })
      ]
    })
  );

  const path = [lendingTerm.collateral.address, pegTokenAddress];
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        contractsList.uniswapRouterAddress,
        encodeFunctionData({
          abi: UniswapRouterABI as Abi,
          functionName: 'swapExactTokensForTokens',
          args: [flashloanAmount, flashloanAmountUSDC, path, contractsList.gatewayAddress, deadlineSwap]
        })
      ]
    })
  );

  // do psm.mint
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        pegTokenAddress,
        encodeFunctionData({
          abi: UsdcABI,
          functionName: 'approve',
          args: [psmAddress, usdcAmount + flashloanAmountUSDC]
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
          abi: PsmUsdcABI,
          functionName: 'mint',
          args: [contractsList.gatewayAddress, usdcAmount + flashloanAmountUSDC]
        })
      ]
    })
  );

  // // do repay or partialRepay
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        creditTokenAddress,
        encodeFunctionData({
          abi: CreditABI as Abi,
          functionName: 'approve',
          args: [lendingTerm.address, debtToRepay]
        })
      ]
    })
  );

  if (type === 'full') {
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
  } else {
    calls.push(
      encodeFunctionData({
        abi: GatewayABI as Abi,
        functionName: 'callExternal',
        args: [
          lendingTerm.address,
          encodeFunctionData({
            abi: TermABI as Abi,
            functionName: 'partialRepay',
            args: [loanId, debtToRepay]
          })
        ]
      })
    );
  }

  // consume user permit
  if (permitDataCollateral) {
    calls.push(
      encodeFunctionData({
        abi: GatewayABI as Abi,
        functionName: 'consumePermit',
        args: [
          lendingTerm.collateral.address,
          collateralAmount,
          permitDataCollateral.deadline,
          permitDataCollateral.v,
          permitDataCollateral.r,
          permitDataCollateral.s
        ]
      })
    );
  }

  // consumer user allowance
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'consumeAllowance',
      args: [lendingTerm.collateral.address, collateralAmount]
    })
  );

  // sweep leftovers
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'sweep',
      args: [pegTokenAddress]
    })
  );

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'sweep',
      args: [creditTokenAddress]
    })
  );

  return calls;
};

export const getAllowCollateralTokenCall = (
  lendingTerm: LendingTerms,
  collateralAmount: bigint, // eg: sDAI
  permitDataCollateral: any | undefined
) => {
  return encodeFunctionData({
    abi: GatewayABI as Abi,
    functionName: 'consumePermit',
    args: [
      lendingTerm.collateral.address,
      collateralAmount,
      permitDataCollateral.deadline,
      permitDataCollateral.v,
      permitDataCollateral.r,
      permitDataCollateral.s
    ]
  });
};
