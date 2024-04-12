import { GatewayABI, PsmUsdcABI, TermABI } from 'lib/contracts';
import { LendingTerms } from 'types/lending';
import { Abi, Address, encodeFunctionData, erc20Abi } from 'viem';

export const simpleBorrow = (
  userAddress: Address,
  lendingTerm: LendingTerms,
  borrowAmount: bigint,
  collateralAmount: bigint,
  permitDataCollateral: any | undefined,
  permitDatagUSDC: any,
  creditAddress: string,
  psmAddress: string
) => {
  let calls = [];

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

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'consumeAllowance',
      args: [lendingTerm.collateral.address, collateralAmount]
    })
  );

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        lendingTerm.collateral.address,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [lendingTerm.address, collateralAmount]
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
          functionName: 'borrowOnBehalf',
          args: [borrowAmount, collateralAmount, userAddress]
        })
      ]
    })
  );

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'consumePermit',
      args: [
        creditAddress,
        borrowAmount,
        permitDatagUSDC.deadline,
        permitDatagUSDC.v,
        permitDatagUSDC.r,
        permitDatagUSDC.s
      ]
    })
  );

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'consumeAllowance',
      args: [creditAddress, borrowAmount]
    })
  );

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        creditAddress,
        encodeFunctionData({
          abi: erc20Abi as Abi,
          functionName: 'approve',
          args: [psmAddress, borrowAmount]
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
          abi: PsmUsdcABI as Abi,
          functionName: 'redeem',
          args: [userAddress, borrowAmount]
        })
      ]
    })
  );

  return calls;
};
