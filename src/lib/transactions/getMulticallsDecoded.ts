import { Abi, decodeFunctionData, erc20Abi } from 'viem';
import { GatewayABI, TermABI, PsmUsdcABI, UniswapRouterABI } from 'lib/contracts';
import { ContractsList } from 'store/slices/contracts-list';
import { LendingTerms } from 'types/lending';

export const getMulticallsDecoded = (calls: any[], lendingTerm: LendingTerms, contractsList: ContractsList) => {
  return calls.map((call) => {
    //describe each call in calls
    const decodedCall = decodeFunctionData({
      abi: GatewayABI as Abi,
      data: call
    });

    if (decodedCall.functionName === 'callExternal') {
      let abiCallExternal;

      switch (String(decodedCall.args[0]).toLowerCase()) {
        case contractsList.usdcAddress.toLowerCase():
        case contractsList.creditAddress.toLowerCase():
        case lendingTerm.collateral.address.toLowerCase():
          abiCallExternal = erc20Abi;
          break;
        case contractsList.psmUsdcAddress.toLowerCase():
          abiCallExternal = PsmUsdcABI;
          break;
        case contractsList.uniswapRouterAddress.toLowerCase():
          abiCallExternal = UniswapRouterABI;
          break;
        case lendingTerm.address.toLowerCase():
          abiCallExternal = TermABI;
          break;
        default:
          break;
      }

      const decodedCallExternal = decodeFunctionData({
        abi: abiCallExternal as Abi,
        data: decodedCall.args[1]
      });

      decodedCall.args[1] = decodedCallExternal;
    }

    return decodedCall;
  });
};
