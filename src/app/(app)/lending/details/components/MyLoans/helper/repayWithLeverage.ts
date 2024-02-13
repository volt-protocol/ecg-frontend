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
import { Abi, Address, encodeFunctionData, erc20Abi } from "viem"

export const repayWithLeverage = (
  type: "full" | "partial",
  lendingTerm: LendingTerms,
  loanId: string,
  debtToRepay: bigint, //in gUSDC
  usdcAmount: bigint, //in USDC
  collateralAmount: bigint, // eg: sDAI
  flashloanAmount: bigint, // eg: sDAI
  flashloanAmountUSDC: bigint,
  permitDataCollateral: any | undefined,
  permitDataUSDC: any,
  deadlineSwap: bigint
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
  // consumer usdc allowance on gateway
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumeAllowance",
      args: [usdcContract.address, usdcAmount],
    })
  )

  // swap flashloaned sDAI to USDC
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        lendingTerm.collateral.address,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [uniswapRouterContract.address, collateralAmount],
        }),
      ],
    })
  )

  const path = [lendingTerm.collateral.address, usdcContract.address]
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        uniswapRouterContract.address,
        encodeFunctionData({
          abi: uniswapRouterContract.abi as Abi,
          functionName: "swapExactTokensForTokens",
          args: [
            flashloanAmount,
            flashloanAmountUSDC,
            path,
            gatewayContract.address,
            deadlineSwap,
          ],
        }),
      ],
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
          args: [psmUsdcContract.address, usdcAmount + flashloanAmountUSDC],
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
          args: [gatewayContract.address, usdcAmount + flashloanAmountUSDC],
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

  // consume user permit
  if (permitDataCollateral) {
    calls.push(
      encodeFunctionData({
        abi: GatewayABI as Abi,
        functionName: "consumePermit",
        args: [
          lendingTerm.collateral.address,
          collateralAmount,
          permitDataCollateral.deadline,
          permitDataCollateral.v,
          permitDataCollateral.r,
          permitDataCollateral.s,
        ],
      })
    )
  }

  // consumer user allowance
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumeAllowance",
      args: [lendingTerm.collateral.address, collateralAmount],
    })
  )

  // sweep leftovers
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "sweep",
      args: [usdcContract.address],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "sweep",
      args: [creditContract.address],
    })
  )

  return calls
}
