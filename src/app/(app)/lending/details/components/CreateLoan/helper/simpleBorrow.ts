import { GatewayABI, PsmUsdcABI, TermABI, creditContract, psmUsdcContract, uniswapRouterContract } from "lib/contracts"
import { LendingTerms } from "types/lending"
import { Abi, Address, decodeFunctionData, encodeFunctionData, erc20Abi } from "viem"

export const simpleBorrow = (
  userAddress: Address,
  lendingTerm: LendingTerms,
  borrowAmount: bigint,
  collateralAmount: bigint,
  permitDataCollateral: any | undefined,
  permitDatagUSDC: any
) => {
  let calls = []

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

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumeAllowance",
      args: [lendingTerm.collateral.address, collateralAmount],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        lendingTerm.collateral.address,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [lendingTerm.address, collateralAmount],
        }),
      ],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        lendingTerm.address,
        encodeFunctionData({
          abi: TermABI as Abi,
          functionName: "borrowOnBehalf",
          args: [borrowAmount, collateralAmount, userAddress],
        }),
      ],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumePermit",
      args: [
        creditContract.address,
        borrowAmount,
        permitDatagUSDC.deadline,
        permitDatagUSDC.v,
        permitDatagUSDC.r,
        permitDatagUSDC.s,
      ],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "consumeAllowance",
      args: [creditContract.address, borrowAmount],
    })
  )

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: "callExternal",
      args: [
        creditContract.address,
        encodeFunctionData({
          abi: erc20Abi as Abi,
          functionName: "approve",
          args: [psmUsdcContract.address, borrowAmount],
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
          abi: psmUsdcContract.abi as Abi,
          functionName: "redeem",
          args: [userAddress, borrowAmount],
        }),
      ],
    })
  )

  return calls
}

/** OLD BORROW */

// try {
//   const hash = await writeContract(wagmiConfig, {
//     address: lendingTerm.collateral.address,
//     abi: UsdcABI,
//     functionName: "approve",
//     args: [
//       lendingTerm.address,
//       parseUnits(collateralAmount, lendingTerm.collateral.decimals),
//     ],
//   })
//   const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
//     hash: hash,
//   })

//   if (checkApprove.status != "success") {
//     updateStepStatus(`Approve ${lendingTerm.collateral.name}`, "Error")
//     setLoading(false)
//     return
//   }
// } catch (e) {
//   console.log(e)
//   updateStepStatus(`Approve ${lendingTerm.collateral.name}`, "Error")
//   return
// }

// try {
//   const hash = await writeContract(wagmiConfig, {
//     address: lendingTerm.address,
//     abi: TermABI,
//     functionName: "borrow",
//     args: [
//       borrowAmount,
//       parseUnits(collateralAmount, lendingTerm.collateral.decimals),
//     ],
//   })
//   const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
//     hash: hash,
//   })

//   if (checkBorrow.status === "success") {
//     reload(true)
//     setBorrowAmount(BigInt(0))
//     setCollateralAmount("")
//     updateStepStatus("Borrow", "Success")
//     return
//   } else updateStepStatus("Borrow", "Error")
// } catch (e) {
//   console.log(e)
//   updateStepStatus("Borrow", "Error")
//   return
// }
