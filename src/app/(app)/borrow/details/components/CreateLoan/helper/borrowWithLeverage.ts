import { GatewayABI, PsmUsdcABI, TermABI, UniswapRouterABI, UsdcABI } from 'lib/contracts';
import { LendingTerms } from 'types/lending';
import { Abi, Address, encodeFunctionData, erc20Abi } from 'viem';
import { ContractsList } from 'store/slices/contracts-list';

export const borrowWithLeverage = (
  userAddress: Address,
  lendingTerm: LendingTerms,
  debtAmount: bigint, // borrowAmount + flashloanAmount in gUSDC
  collateralAmount: bigint, // eg: sDAI
  flashloanAmount: bigint, // eg: sDAI
  amountUSDC: bigint,
  permitDataCollateral: any | undefined,
  permitDatagUSDC: any,
  deadlineSwap: bigint,
  contractsList: ContractsList,
  appMarketId: number
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

  // approve on gateway->term for user collateral + flashloaned amount
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        lendingTerm.collateral.address,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [lendingTerm.address, collateralAmount + flashloanAmount]
        })
      ]
    })
  );

  // borrow on behalf for user collateral + flashloaned amount
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        lendingTerm.address,
        encodeFunctionData({
          abi: TermABI as Abi,
          functionName: 'borrowOnBehalf',
          args: [debtAmount, collateralAmount + flashloanAmount, userAddress]
        })
      ]
    })
  );

  // consume the user permit for the debt amount
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'consumePermit',
      args: [
        contractsList.marketContracts[appMarketId].creditAddress,
        debtAmount,
        permitDatagUSDC.deadline,
        permitDatagUSDC.v,
        permitDatagUSDC.r,
        permitDatagUSDC.s
      ]
    })
  );

  // consume the user allowance for the debt amount
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'consumeAllowance',
      args: [contractsList.marketContracts[appMarketId].creditAddress, debtAmount]
    })
  );

  // approve gateway->psm for the debt amount of credit token
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        contractsList.marketContracts[appMarketId].creditAddress,
        encodeFunctionData({
          abi: erc20Abi as Abi,
          functionName: 'approve',
          args: [contractsList.marketContracts[appMarketId].psmAddress, debtAmount]
        })
      ]
    })
  );

  // redeem credit token => USDC to the gateway (not the user !!)
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        contractsList.marketContracts[appMarketId].psmAddress,
        encodeFunctionData({
          abi: PsmUsdcABI as Abi,
          functionName: 'redeem',
          args: [contractsList.gatewayAddress, debtAmount]
        })
      ]
    })
  );

  // here we have the full value in USDC after redeeming, need to change to sDAI
  // approve uniswap router
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        contractsList.marketContracts[appMarketId].pegTokenAddress,
        encodeFunctionData({
          abi: UsdcABI as Abi,
          functionName: 'approve',
          args: [contractsList.uniswapRouterAddress, amountUSDC]
        })
      ]
    })
  );

  const path = [contractsList.marketContracts[appMarketId].pegTokenAddress, lendingTerm.collateral.address];
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        contractsList.uniswapRouterAddress,
        encodeFunctionData({
          abi: UniswapRouterABI as Abi,
          functionName: 'swapTokensForExactTokens',
          args: [flashloanAmount, amountUSDC, path, contractsList.gatewayAddress, deadlineSwap]
        })
      ]
    })
  );

  // reset approval on the uniswap router
  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'callExternal',
      args: [
        contractsList.marketContracts[appMarketId].pegTokenAddress,
        encodeFunctionData({
          abi: UsdcABI as Abi,
          functionName: 'approve',
          args: [contractsList.uniswapRouterAddress, 0]
        })
      ]
    })
  );

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'sweep',
      args: [contractsList.marketContracts[appMarketId].pegTokenAddress]
    })
  );

  return calls;
};

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
  debtAmount: bigint, //  borrowAmount + flashloanAmount in gUSDC
  permitDatagUSDC: any,
  contractsList: ContractsList,
  appMarketId: number
) => {
  const calls = [];

  calls.push(
    encodeFunctionData({
      abi: GatewayABI as Abi,
      functionName: 'consumePermit',
      args: [
        contractsList.marketContracts[appMarketId].creditAddress,
        debtAmount,
        permitDatagUSDC.deadline,
        permitDatagUSDC.v,
        permitDatagUSDC.r,
        permitDatagUSDC.s
      ]
    })
  );

  return calls;
};

// async function borrowGatewayLeverage() {
//   setShowModal(true)
//   updateStepName("Multicall", "Multicall with Leverage")
//   let signatureCollateral: any
//   let signatureGUSDC: any
//   const debtAmount = borrowAmount + flashLoanBorrowAmount

//   /* Set allowance for collateral token */
//   if (
//     permitConfig.find(
//       (item) => item.address.toLowerCase() === lendingTerm.collateral.address.toLowerCase()
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
//         spenderAddress: contractsList.gatewayAddress as Address,
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
//           contractsList.gatewayAddress as Address,
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
//       contractAddress: contractsList.marketContracts[appMarketId].creditAddress as Address,
//       erc20Name: "Ethereum Credit Guild - gUSDC",
//       ownerAddress: address,
//       spenderAddress: contractsList.gatewayAddress as Address,
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
//     chainId: appChainId as any
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

//     updateStepStatus(`Multicall with Leverage`, "In Progress")

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
