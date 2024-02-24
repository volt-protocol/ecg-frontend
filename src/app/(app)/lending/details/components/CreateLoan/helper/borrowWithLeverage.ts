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

  // async function borrowGatewayLeverage() {
  //   setShowModal(true)
  //   updateStepName("Multicall", "Multicall with Leverage")
  //   let signatureCollateral: any
  //   let signatureGUSDC: any
  //   const debtAmount = borrowAmount + flashLoanBorrowAmount

  //   /* Set allowance for collateral token */
  //   if (
  //     permitConfig.find(
  //       (item) => item.collateralAddress === lendingTerm.collateral.address
  //     )?.hasPermit
  //   ) {
  //     try {
  //       updateStepStatus(
  //         `Sign Permit for ${lendingTerm.collateral.symbol}`,
  //         "In Progress"
  //       )

  //       signatureCollateral = await signPermit({
  //         contractAddress: lendingTerm.collateral.address,
  //         erc20Name: lendingTerm.collateral.name,
  //         ownerAddress: address,
  //         spenderAddress: gatewayContract.address as Address,
  //         value: parseUnits(collateralAmount, lendingTerm.collateral.decimals),
  //         deadline: BigInt(Number(moment().add(10, "seconds"))),
  //         nonce: data?.collateralNonces,
  //         chainId: wagmiConfig.chains[0].id,
  //         permitVersion: "1",
  //       })

  //       if (!signatureCollateral) {
  //         updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
  //         return
  //       }
  //       updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Success")
  //     } catch (e) {
  //       console.log(e)
  //       updateStepStatus(`Sign Permit for ${lendingTerm.collateral.symbol}`, "Error")
  //       return
  //     }
  //   } else {
  //     try {
  //       updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "In Progress")

  //       const hash = await writeContract(wagmiConfig, {
  //         address: lendingTerm.collateral.address,
  //         abi: erc20Abi,
  //         functionName: "approve",
  //         args: [
  //           gatewayContract.address as Address,
  //           parseUnits(collateralAmount, lendingTerm.collateral.decimals),
  //         ],
  //       })
  //       const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
  //         hash: hash,
  //       })

  //       if (checkApprove.status != "success") {
  //         updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
  //         return
  //       }
  //       updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Success")
  //     } catch (e) {
  //       console.log(e)
  //       updateStepStatus(`Approve ${lendingTerm.collateral.symbol}`, "Error")
  //       return
  //     }
  //   }

  //   /* Set allowance for gUSDC token */
  //   try {
  //     updateStepStatus(`Sign Permit for gUSDC`, "In Progress")

  //     signatureGUSDC = await signPermit({
  //       contractAddress: creditContract.address as Address,
  //       erc20Name: "Ethereum Credit Guild - gUSDC",
  //       ownerAddress: address,
  //       spenderAddress: gatewayContract.address as Address,
  //       value: debtAmount,
  //       deadline: BigInt(Number(moment().add(10, "seconds"))),
  //       nonce: gusdcNonces,
  //       chainId: wagmiConfig.chains[0].id,
  //       permitVersion: "1",
  //     })

  //     if (!signatureGUSDC) {
  //       updateStepStatus(`Sign Permit for gUSDC`, "Error")
  //       return
  //     }
  //     updateStepStatus(`Sign Permit for gUSDC`, "Success")
  //   } catch (e) {
  //     console.log(e)
  //     updateStepStatus(`Sign Permit for gUSDC`, "Error")
  //     return
  //   }

  //   const amountUSDC = await readContract(wagmiConfig, {
  //     ...psmUsdcContract,
  //     functionName: "getRedeemAmountOut",
  //     args: [debtAmount],
  //   })

  //   const deadlineSwap = BigInt(Number(moment().add(3600, "seconds")))

  //   /* Call gateway.multicall() */
  //   try {
  //     const calls = borrowWithLeverage(
  //       address,
  //       lendingTerm,
  //       debtAmount,
  //       parseUnits(collateralAmount, lendingTerm.collateral.decimals),
  //       flashLoanCollateralAmount,
  //       amountUSDC as bigint,
  //       signatureCollateral,
  //       signatureGUSDC,
  //       deadlineSwap
  //     )

  //     const callsDescription = getMulticallsDecoded(calls, lendingTerm)
  //     updateStepStatus(`Multicall with Leverage`, "In Progress", callsDescription)

  //     const hash = await writeContract(wagmiConfig, {
  //       ...gatewayContract,
  //       functionName: "multicallWithBalancerFlashLoan",
  //       args: [[lendingTerm.collateral.address], [flashLoanCollateralAmount], calls],
  //     })

  //     const checkBorrow = await waitForTransactionReceipt(wagmiConfig, {
  //       hash: hash,
  //     })

  //     if (checkBorrow.status === "success") {
  //       refetch()
  //       reload(true)
  //       setBorrowAmount(BigInt(0))
  //       setCollateralAmount("")
  //       updateStepStatus("Multicall with Leverage", "Success")
  //       return
  //     } else {
  //       updateStepStatus("Multicall with Leverage", "Error")
  //     }

  //     updateStepStatus(`Multicall with Leverage`, "Success")
  //   } catch (e) {
  //     console.log(e)
  //     updateStepStatus("Multicall with Leverage", "Error")
  //     return
  //   }
  // }