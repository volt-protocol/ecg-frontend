import { getPublicClient } from "@wagmi/core"
import { Address } from "@wagmi/core"
import { psmUsdcContract } from "lib/contracts"
import { FROM_BLOCK } from "utils/constants"
import { formatUnits } from "viem"

export interface MintRedeemLogs {
  userAddress: Address
  category: "mintRedeem"
  type: "Mint" | "Redeem"
  to: Address
  amountIn: number
  amountOut: number
  block: number
  txHash: string
}

export async function getAllMintRedeemLogs(
  userAddress?: Address,
  duration?: number
): Promise<MintRedeemLogs[]> {
  const currentBlock = await getPublicClient().getBlockNumber()

  const mintLogs = await getPublicClient().getLogs({
    address: psmUsdcContract.address,
    event: {
      type: "event",
      name: "Mint",
      inputs: [
        { indexed: true, name: "when", type: "uint256" },
        { type: "address", indexed: true, name: "to" },
        { type: "uint256", name: "amountIn" },
        { type: "uint256", name: "amountOut" },
      ],
    },
    fromBlock: duration ? currentBlock - BigInt(duration) : BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })

  const redeemLogs = await getPublicClient().getLogs({
    address: psmUsdcContract.address,
    event: {
      type: "event",
      name: "Redeem",
      inputs: [
        { indexed: true, name: "when", type: "uint256" },
        { type: "address", indexed: true, name: "to" },
        { type: "uint256", name: "amountIn" },
        { type: "uint256", name: "amountOut" },
      ],
    },
    fromBlock: duration ? currentBlock - BigInt(duration) : BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })

  const mintLogsMod = mintLogs.map((log) => {
    return {
      userAddress: log.args.to as Address,
      category: "mintRedeem",
      type: "Mint",
      to: log.args.to as Address,
      amountIn: Number(formatUnits(log.args.amountIn as bigint, 6)),
      amountOut: Number(formatUnits(log.args.amountOut as bigint, 18)),
      block: Number(log.blockNumber),
      txHash: log.transactionHash as string,
    }
  })

  const redeemLogsMod = redeemLogs.map((log) => {
    return {
      userAddress: log.args.to as Address,
      category: "mintRedeem",
      type: "Redeem",
      to: log.args.to as Address,
      amountIn: Number(formatUnits(log.args.amountIn as bigint, 18)),
      amountOut: Number(formatUnits(log.args.amountOut as bigint, 6)),
      block: Number(log.blockNumber),
      txHash: log.transactionHash as string,
    }
  })

  const mintRedeemLogs = [...mintLogsMod, ...redeemLogsMod] as MintRedeemLogs[]

  return userAddress
    ? mintRedeemLogs.filter((log) => log.to === userAddress)
    : mintRedeemLogs
}
