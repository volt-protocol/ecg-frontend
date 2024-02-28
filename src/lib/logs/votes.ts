import { getPublicClient } from "@wagmi/core"
import { wagmiConfig } from "contexts/Web3Provider"
import { Address } from "viem"
import { FROM_BLOCK } from "utils/constants"
import { ContractsList } from "store/slices/contracts-list"

export interface VoteLogs {
  termAddress: Address
  userAddress: Address
  category: "vote"
  type: "Governor" | "VetoGovernor" | "LendingTermOnboarding" | "LendingTermOffboarding"
  block: number
  vote: string
  txHash: string
}

export async function getVotesLendingOffboarding(
  contractsList: ContractsList,
  address?: Address,
  duration?: number
) {
  const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber()

  const logs = await getPublicClient(wagmiConfig).getLogs({
    address: contractsList.lendingTermOffboardingAddress,
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
    .filter((log) => (address ? log.args.user === address : true))
    .map((log) => {
      return {
        termAddress: "",
        userAddress: log.args.user as Address,
        category: "vote",
        type: "LendingTermOffboarding",
        block: Number(log.blockNumber),
        vote: "for",
        txHash: log.transactionHash as string,
      }
    })
}

export async function getVotesGovernor(
  contractsList: ContractsList,
  contractAddress: Address,
  address?: Address,
  duration?: number
) {
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
    .filter((log) => (address ? log.args.voter === address : true))
    .map((log) => {
      let type = ""
      switch (contractAddress) {
        case contractsList.daoGovernorGuildAddress:
          type = "Governor"
          break
        case contractsList.daoVetoGuildAddress:
          type = "VetoGovernor"
          break
        case contractsList.onboardGovernorGuildAddress:
          type = "LendingTermOnboarding"
          break
      }

      return {
        termAddress: "",
        userAddress: log.args.voter as Address,
        category: "vote",
        type: type,
        block: Number(log.blockNumber),
        vote:
          log.args.support === 1 ? "against" : log.args.support === 1 ? "for" : "abstain",
        txHash: log.transactionHash as string,
      }
    })
}

export async function getAllVotes(
  contractsList: ContractsList,
  address?: Address,
  duration?: number
): Promise<VoteLogs[]> {
  const lendingOffBoardingVotes = await getVotesLendingOffboarding(
    contractsList,
    address,
    duration,
  )
  const lendingOnBoardingVotes = await getVotesGovernor(
    contractsList,
    contractsList.onboardGovernorGuildAddress,
    address,
    duration,
  )
  const governorVotes = await getVotesGovernor(
    contractsList,
    contractsList.daoGovernorGuildAddress,
    address,
    duration,
  )
  const vetoGovernorVotes = await getVotesGovernor(
    contractsList,
    contractsList.daoVetoGuildAddress,
    address,
    duration,
  )

  return [
    ...lendingOffBoardingVotes,
    ...lendingOnBoardingVotes,
    ...governorVotes,
    ...vetoGovernorVotes,
  ]
}
