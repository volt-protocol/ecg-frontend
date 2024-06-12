import { GatewayABI, PsmUsdcABI, TermABI } from 'lib/contracts';
import { LendingTerms } from 'types/lending';
import { Abi, Address, encodeFunctionData, erc20Abi } from 'viem';

export const simpleBorrow = (
  userAddress: Address,
  lendingTerm: LendingTerms,
  borrowAmount: bigint,
  collateralAmount: bigint,
  permitSigCollateralToken: any | undefined,
  permitSigCreditToken: any | undefined,
  creditAddress: string,
  psmAddress: string
) => {
  const calls = [];

  if (permitSigCollateralToken) {
    calls.push(
      encodeFunctionData({
        abi: GatewayABI as Abi,
        functionName: 'consumePermit',
        args: [
          lendingTerm.collateral.address,
          collateralAmount,
          permitSigCollateralToken.deadline,
          permitSigCollateralToken.v,
          permitSigCollateralToken.r,
          permitSigCollateralToken.s
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

  if (permitSigCreditToken) {
    calls.push(
      encodeFunctionData({
        abi: GatewayABI as Abi,
        functionName: 'consumePermit',
        args: [
          creditAddress,
          borrowAmount,
          permitSigCreditToken.deadline,
          permitSigCreditToken.v,
          permitSigCreditToken.r,
          permitSigCreditToken.s
        ]
      })
    );
  }

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
