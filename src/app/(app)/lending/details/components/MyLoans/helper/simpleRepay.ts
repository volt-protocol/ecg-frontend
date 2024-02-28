import { GatewayABI, PsmUsdcABI, TermABI, CreditABI, UsdcABI } from "lib/contracts"
import { ContractsList } from "store/slices/contracts-list"
import { LendingTerms } from "types/lending"
import { Abi, encodeFunctionData } from "viem"

export const simpleRepay = (
  type: "full" | "partial",
  lendingTerm: LendingTerms,
  loanId: string,
  usdcAmount: bigint, //in USDC
  debtToRepay: bigint, //in gUSDC
  permitDataUSDC: any,
  contractsList: ContractsList
) => {
  let calls = []

  // pull usdc on gateway
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumePermit",
      args: [
        contractsList.usdcAddress,
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
      args: [contractsList.usdcAddress, usdcAmount],
    })
  )

  // do psm.mint
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        contractsList.usdcAddress,
        encodeFunctionData({
          abi: UsdcABI,
          functionName: "approve",
          args: [contractsList.psmUsdcAddress, usdcAmount],
        }),
      ],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        contractsList.psmUsdcAddress,
        encodeFunctionData({
          abi: PsmUsdcABI,
          functionName: "mint",
          args: [contractsList.gatewayAddress, usdcAmount],
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
        contractsList.creditAddress,
        encodeFunctionData({
          abi: CreditABI as Abi,
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
      args: [contractsList.creditAddress],
    })
  )

  return calls
}
