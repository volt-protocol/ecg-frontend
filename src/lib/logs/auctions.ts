import { getPublicClient, getWalletClient } from "@wagmi/core"
import { wagmiConfig } from "contexts/Web3Provider"
import { AuctionHouseABI } from "lib/contracts"
import getToken from "lib/getToken"
import { CoinSettings } from "store/slices/coin-details"
import { ContractsList } from "store/slices/contracts-list"
import { FROM_BLOCK } from "utils/constants"
import { Address } from "viem"

export interface Auction {
  when: bigint
  loanId: string
  txHashStart: string
  txHashEnd: string
  collateralToken: Address
  collateralAmount: bigint
  callDebt: bigint
  collateralTokenDecimals: number
  collateralTokenSymbol: string
  collateralSold: bigint
  debtRecovered: bigint
  closed: boolean
}

//get all open loans logs from a lending term contract
export async function getAuctionStartLogs(contractsList: ContractsList) {
  const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber()

  const openLogs = await getPublicClient(wagmiConfig).getLogs({
    address: contractsList.auctionHouseAddress as Address,
    event: {
      type: "event",
      name: "AuctionStart",
      inputs: [
        { type: "uint256", indexed: true, name: "when" },
        { type: "bytes32", indexed: true, name: "loanId" },
        { type: "address", indexed: false, name: "collateralToken" },
        { type: "uint256", indexed: false, name: "collateralAmount" },
        { type: "uint256", indexed: false, name: "callDebt" },
      ],
    },
    fromBlock: BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })

  return openLogs.map((log) => {
    return {
      ...log.args,
      txHashStart: log.transactionHash,
    }
  })
}

//get all closed loans  logs (fully repaid) from a lending term contract
export async function getAuctionEndLogs(contractsList: ContractsList) {
  const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber()

  const closeLogs = await getPublicClient(wagmiConfig).getLogs({
    address: contractsList.auctionHouseAddress as Address,
    event: {
      type: "event",
      name: "AuctionEnd",
      inputs: [
        { type: "uint256", indexed: true, name: "when" },
        { type: "bytes32", indexed: true, name: "loanId" },
        { type: "address", indexed: false, name: "collateralToken" },
        { type: "uint256", indexed: false, name: "collateralSold" },
        { type: "uint256", indexed: false, name: "debtRecovered" },
      ],
    },
    fromBlock: BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })

  return closeLogs.map((log) => {
    return {
      ...log.args,
      txHashEnd: log.transactionHash,
    }
  })
}

export async function getAllAuctions(
  contractsList: ContractsList,
  coinDetails: CoinSettings[]
): Promise<Auction[]> {
  const startLogs = await getAuctionStartLogs(contractsList)
  const endLogs = await getAuctionEndLogs(contractsList)

  const auctions = await Promise.all(
    startLogs.map(async (log) => {
      const collateralTokenDetails = coinDetails.find(
        (coin) => coin.address.toLowerCase() === log.collateralToken.toLowerCase()
      )

      const auctionEndLog = endLogs.find((endLog) => endLog.loanId === log.loanId)

      return {
        ...log,
        txHashEnd: auctionEndLog ? auctionEndLog.txHashEnd : "",
        collateralTokenDecimals: collateralTokenDetails.decimals,
        collateralTokenSymbol: collateralTokenDetails.symbol,
        collateralSold: auctionEndLog ? auctionEndLog.collateralSold : BigInt(0),
        debtRecovered: auctionEndLog ? auctionEndLog.debtRecovered : BigInt(0),
        closed: auctionEndLog ? true : false,
      }
    })
  )

  return auctions
}
