import { Abi, decodeFunctionData, erc20Abi } from "viem";
import { GatewayABI, PsmUsdcABI, TermABI, creditContract, psmUsdcContract, uniswapRouterContract, usdcContract } from "lib/contracts"

export const getMulticallsDecoded = (calls: any[], lendingTerm) => {
  return calls.map((call) => {
    //describe each call in calls
    const decodedCall = decodeFunctionData({
      abi: GatewayABI as Abi,
      data: call,
    })

    if (decodedCall.functionName === "callExternal") {

      let abiCallExternal;

      switch (String(decodedCall.args[0]).toLowerCase()) {
        case usdcContract.address.toLowerCase():
        case creditContract.address.toLowerCase():
        case lendingTerm.collateral.address.toLowerCase():
          abiCallExternal = erc20Abi
          break
        case psmUsdcContract.address.toLowerCase():
          abiCallExternal = psmUsdcContract.abi
          break
        case uniswapRouterContract.address.toLowerCase():
          abiCallExternal = uniswapRouterContract.abi
          break
        case lendingTerm.address.toLowerCase():
          abiCallExternal = TermABI
          break
        default:
          break
      }

      const decodedCallExternal = decodeFunctionData({
        abi: abiCallExternal as Abi,
        data: decodedCall.args[1],
      })

      decodedCall.args[1] = decodedCallExternal
    }

    return decodedCall
  })
}