import { GatewayABI, PsmUsdcABI, TermABI, UniswapRouterABI, UsdcABI } from 'lib/contracts';
import { LendingTerms } from 'types/lending';
import { Abi, Address, encodeFunctionData, erc20Abi } from 'viem';
import { ContractsList } from 'store/slices/contracts-list';

export const getPullCollateralCalls = (
  lendingTerm: LendingTerms,
  collateralAmount: bigint, // eg: sDAI
  permitDataCollateral: any | undefined
) => {
  const calls = [];

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

  return calls;
};

export const getAllowBorrowedCreditCall = (
  debtAmount: bigint,
  permitCreditToken: any,
  contractsList: ContractsList,
  appMarketId: number
) => {
  if (!permitCreditToken) {
  }
  return encodeFunctionData({
    abi: GatewayABI as Abi,
    functionName: 'consumePermit',
    args: [
      contractsList.marketContracts[appMarketId].creditAddress,
      debtAmount,
      permitCreditToken.deadline,
      permitCreditToken.v,
      permitCreditToken.r,
      permitCreditToken.s
    ]
  });
};
