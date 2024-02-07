import { getPublicClient, getWalletClient } from "@wagmi/core"
import { wagmiConfig } from "contexts/Web3Provider"
import { Address } from "viem"
import {
  daoGovernorGuildContract,
  lendingTermOffboardingContract,
  onboardGovernorGuildContract,
  daoVetoCreditContract,
} from "lib/contracts"
import { BLOCK_LENGTH_MILLISECONDS, FROM_BLOCK } from "utils/constants"

export interface VoteLogs {
  termAddress: Address
  userAddress: Address
  category: "vote"
  type: 'Governor' | 'VetoGovernor' | 'LendingTermOnboarding' | 'LendingTermOffboarding'
  block: number
  vote: string
  txHash: string
}

export async function getVotesLendingOffboarding(address?: Address, duration?: number) {
  const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber()

  const logs = await getPublicClient(wagmiConfig).getLogs({
    address: lendingTermOffboardingContract.address,
    event: {
      type: "event",
      name: "OffboardSupport",
      inputs: [
        { type: "uint256", indexed: true, name: "timestamp" },
        { type: "address", indexed: true, name: "term" },
        { type: "uint256", indexed: true, name: "snapshotBlock" },
        { type: "address", indexed: false, name: "user" },
        { type: "uint256", indexed: false, name: "userWeight" },
      ],
    },
    fromBlock: duration ? currentBlock - BigInt(duration) : BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })

  return logs
    .filter((log) => address ? log.args.user === address : true)
    .map((log) => {
      return {
        termAddress: "",
        userAddress: log.args.user as Address,
        category: "vote",
        type: "LendingTermOffboarding",
        block: Number(log.blockNumber),
        vote: 'for',
        txHash: log.transactionHash as string,
      }
    })
}

export async function getVotesGovernor(contractAddress: Address, address?: Address, duration?: number) {
  const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber()

  const logs = await getPublicClient(wagmiConfig).getLogs({
    address: contractAddress,
    event: {
      type: "event",
      name: "VoteCast",
      inputs: [
        { type: "address", indexed: true, name: "voter" },
        { type: "uint256", indexed: false, name: "proposalId" },
        { type: "uint8", indexed: false, name: "support" },
        { type: "uint256", indexed: false, name: "weight" },
        { type: "string", indexed: false, name: "reason" },
      ],
    },
    fromBlock: duration ? currentBlock - BigInt(duration) : BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })

  return logs
    .filter((log) => address ? log.args.voter === address : true)
    .map((log) => {
      let type = ""
      switch (contractAddress) {
        case daoGovernorGuildContract.address:
          type = "Governor"
          break
        case daoVetoCreditContract.address:
          type = "VetoGovernor"
          break
        case onboardGovernorGuildContract.address:
          type = "LendingTermOnboarding"
          break
      }

      return {
        termAddress: "",
        userAddress: log.args.voter as Address,
        category: "vote",
        type: type,
        block: Number(log.blockNumber),
        vote: log.args.support === 1 ? "against" : log.args.support === 1 ? "for" : "abstain",
        txHash: log.transactionHash as string,
      }
    })
}

export async function getAllVotes(address?: Address, duration? : number): Promise<VoteLogs[]> {
  const lendingOffBoardingVotes = await getVotesLendingOffboarding(address, duration)
  const lendingOnBoardingVotes = await getVotesGovernor(
    onboardGovernorGuildContract.address,
    address, duration
  )
  const governorVotes = await getVotesGovernor(daoGovernorGuildContract.address, address, duration)
  const vetoGovernorVotes = await getVotesGovernor(daoVetoCreditContract.address, address, duration)

  return [
    ...lendingOffBoardingVotes,
    ...lendingOnBoardingVotes,
    ...governorVotes,
    ...vetoGovernorVotes,
  ]
}
