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

export const borrowWithLeverage = (
  userAddress: Address,
  lendingTerm: LendingTerms,
  debtAmount: bigint, // borrowAmount + flashloanAmount in gUSDC
  collateralAmount: bigint, // eg: sDAI
  flashloanAmount: bigint, // eg: sDAI
  amountUSDC: bigint,
  permitDataCollateral: any | undefined,
  permitDatagUSDC: any,
  deadlineSwap: bigint
) => {
  let calls = []

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

  // approve on gateway->term for user collateral + flashloaned amount
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        lendingTerm.collateral.address,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [lendingTerm.address, collateralAmount + flashloanAmount],
        }),
      ],
    })
  )

  // borrow on behalf for user collateral + flashloaned amount
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        lendingTerm.address,
        encodeFunctionData({
          abi: TermABI as Abi,
          functionName: "borrowOnBehalf",
          args: [debtAmount, collateralAmount + flashloanAmount, userAddress],
        }),
      ],
    })
  )

  // consume the user permit for the debt amount
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumePermit",
      args: [
        creditContract.address,
        debtAmount,
        permitDatagUSDC.deadline,
        permitDatagUSDC.v,
        permitDatagUSDC.r,
        permitDatagUSDC.s,
      ],
    })
  )

  // consume the user allowance for the debt amount
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumeAllowance",
      args: [creditContract.address, debtAmount],
    })
  )

  // approve gateway->psm for the debt amount of credit token
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        creditContract.address,
        encodeFunctionData({
          abi: erc20Abi as Abi,
          functionName: "approve",
          args: [psmUsdcContract.address, debtAmount],
        }),
      ],
    })
  )

  // redeem credit token => USDC to the gateway (not the user !!)
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        psmUsdcContract.address,
        encodeFunctionData({
          abi: PsmUsdcABI as Abi,
          functionName: "redeem",
          args: [gatewayContract.address, debtAmount],
        }),
      ],
    })
  )

  // here we have the full value in USDC after redeeming, need to change to sDAI
  // approve uniswap router
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        usdcContract.address,
        encodeFunctionData({
          abi: usdcContract.abi as Abi,
          functionName: "approve",
          args: [uniswapRouterContract.address, amountUSDC],
        }),
      ],
    })
  )

  const path = [usdcContract.address, lendingTerm.collateral.address]
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        uniswapRouterContract.address,
        encodeFunctionData({
          abi: uniswapRouterContract.abi as Abi,
          functionName: "swapTokensForExactTokens",
          args: [
            flashloanAmount,
            amountUSDC,
            path,
            gatewayContract.address,
            deadlineSwap,
          ],
        }),
      ],
    })
  )

  // reset approval on the uniswap router
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        usdcContract.address,
        encodeFunctionData({
          abi: usdcContract.abi as Abi,
          functionName: "approve",
          args: [uniswapRouterContract.address, 0],
        }),
      ],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "sweep",
      args: [usdcContract.address],
    })
  )

  return calls
}

export const getPullCollateralCalls = (
  lendingTerm: LendingTerms,
  collateralAmount: bigint, // eg: sDAI
  permitDataCollateral: any | undefined,
) => {
  let calls = []

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

  return calls
}

export const getAllowBorrowedCreditCall = (
  debtAmount: bigint, //  borrowAmount + flashloanAmount in gUSDC
  permitDatagUSDC: any,
) => {
  let calls = []

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumePermit",
      args: [
        creditContract.address,
        debtAmount,
        permitDatagUSDC.deadline,
        permitDatagUSDC.v,
        permitDatagUSDC.r,
        permitDatagUSDC.s,
      ],
    })
  )

  return calls
}
