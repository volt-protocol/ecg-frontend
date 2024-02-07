import {
  GatewayABI,
  PsmUsdcABI,
  TermABI,
  creditContract,
  gatewayContract,
  psmUsdcContract,
  uniswapRouterContract,
  usdcContract,
} from "lib/contracts"
import { LendingTerms } from "types/lending"
import { Abi, Address, decodeFunctionData, encodeFunctionData, erc20Abi } from "viem"

export const simpleRepay = (
  type: "full" | "partial",
  lendingTerm: LendingTerms,
  loanId: string,
  usdcAmount: bigint, //in USDC
  debtToRepay: bigint, //in gUSDC
  permitDataUSDC: any
) => {
  let calls = []

  // pull usdc on gateway
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumePermit",
      args: [
        usdcContract.address,
        usdcAmount,
        permitDataUSDC.deadline,
        permitDataUSDC.v,
        permitDataUSDC.r,
        permitDataUSDC.s,
      ],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumeAllowance",
      args: [usdcContract.address, usdcAmount],
    })
  )

  // do psm.mint
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        usdcContract.address,
        encodeFunctionData({
          abi: usdcContract.abi,
          functionName: "approve",
          args: [psmUsdcContract.address, usdcAmount],
        }),
      ],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        psmUsdcContract.address,
        encodeFunctionData({
          abi: psmUsdcContract.abi,
          functionName: "mint",
          args: [gatewayContract.address, usdcAmount],
        }),
      ],
    })
  )

  // // do repay or partialRepay
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        creditContract.address,
        encodeFunctionData({
          abi: creditContract.abi as Abi,
          functionName: "approve",
          args: [lendingTerm.address, debtToRepay],
        }),
      ],
    })
  )

  if (type === "full") {
    calls.push(
      encodeFunctionData({
        abi: GatewayABI as Abi,
        functionName: "callExternal",
        args: [
          lendingTerm.address,
          encodeFunctionData({
            abi: TermABI as Abi,
            functionName: "repay",
            args: [loanId],
          }),
        ],
      })
    )
  } else {
    calls.push(
      encodeFunctionData({
        abi: GatewayABI as Abi,
        functionName: "callExternal",
        args: [
          lendingTerm.address,
          encodeFunctionData({
            abi: TermABI as Abi,
            functionName: "partialRepay",
            args: [loanId, debtToRepay],
          }),
        ],
      })
    )
  }

  // sweep leftovers
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "sweep",
      args: [creditContract.address],
    })
  )

  return calls
}
