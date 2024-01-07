import { getPublicClient, readContract } from "@wagmi/core"
import { Address } from "@wagmi/core"
import { TermABI, guildContract } from "lib/contracts"
import { FROM_BLOCK } from "utils/constants"
import { extractTermAddress } from "utils/strings"
import { Abi } from "viem"

//get all created terms
export const getTermsCreatedLogs = async () => {
  const currentBlock = await getPublicClient().getBlockNumber()

  const logs = await getPublicClient().getLogs({
    address: process.env.NEXT_PUBLIC_ONBOARD_GOVERNOR_GUILD_ADDRESS as Address,
    event: {
      type: "event",
      name: "TermCreated",
      inputs: [
        { type: "uint256", indexed: true, name: "when" },
        { type: "address", indexed: true, name: "implementation" },
        { type: "address", indexed: true, name: "term" },
        {
          type: "tuple",
          indexed: false,
          name: "params",
          components: [
            { internalType: "address", name: "collateralToken", type: "address" },
            {
              internalType: "uint256",
              name: "maxDebtPerCollateralToken",
              type: "uint256",
            },
            { internalType: "uint256", name: "interestRate", type: "uint256" },
            {
              internalType: "uint256",
              name: "maxDelayBetweenPartialRepay",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "minPartialRepayPercent",
              type: "uint256",
            },
            { internalType: "uint256", name: "openingFee", type: "uint256" },
            { internalType: "uint256", name: "hardCap", type: "uint256" },
          ],
        },
      ],
    },
    fromBlock: BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })

  return logs.map((log) => log.args)
}

//get proposed terms
export const getTermsProposedLogs = async () => {
  const currentBlock = await getPublicClient().getBlockNumber()

  const logs = await getPublicClient().getLogs({
    address: process.env.NEXT_PUBLIC_ONBOARD_GOVERNOR_GUILD_ADDRESS as Address,
    event: {
      type: "event",
      name: "ProposalCreated",
      inputs: [
        {
          indexed: false,
          name: "proposalId",
          type: "uint256",
        },
        {
          indexed: false,
          name: "proposer",
          type: "address",
        },
        {
          indexed: false,
          name: "targets",
          type: "address[]",
        },
        {
          indexed: false,
          name: "values",
          type: "uint256[]",
        },
        {
          indexed: false,
          name: "signatures",
          type: "string[]",
        },
        {
          indexed: false,
          name: "calldatas",
          type: "bytes[]",
        },
        {
          indexed: false,
          name: "voteStart",
          type: "uint256",
        },
        {
          indexed: false,
          name: "voteEnd",
          type: "uint256",
        },
        {
          indexed: false,
          name: "description",
          type: "string",
        },
      ],
    },
    fromBlock: BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })

  return logs.map((log) => log.args)
}

//get a list of active terms addresses
export const getLiveTermsAddresses = async (): Promise<Address[]> => {
  const result = await readContract({
    ...guildContract,
    functionName: "liveGauges",
  })
  return result as Address[]
}

//get a list of deprecated terms addresses
export const getDeprecatedTermAddresses = async (): Promise<Address[]> => {
  const result = await readContract({
    ...guildContract,
    functionName: "deprecatedGauges",
  })

  return result as Address[]
}

//get propasable terms
export const getProposableTermsLogs = async () => {
  const termsCreatedLogs = await getTermsCreatedLogs()
  const termsProposedLogs = await getTermsProposedLogs()
  const liveTermsAddresses = await getLiveTermsAddresses()

  return termsCreatedLogs
    .filter((log) => !liveTermsAddresses.includes(log.term))
    .filter((log) => {
      const isProposed = termsProposedLogs.find(
        (item) =>
          extractTermAddress(item.description).toLowerCase() === log.term.toLowerCase()
      )

      return isProposed ? false : true
    })
}

export const getVotableTermsLogs = async () => {
  const termsCreatedLogs = await getTermsCreatedLogs()
  const termsProposedLogs = await getTermsProposedLogs()

  return termsCreatedLogs
    .filter((log) => {
      const isProposed = termsProposedLogs.find(
        (item) =>
          extractTermAddress(item.description).toLowerCase() === log.term.toLowerCase()
      )

      return isProposed ? true : false
    })
}

export const getTermsLogs = async () => {
  const terms = []
  const liveTermsAddresses = await getLiveTermsAddresses()
  const deprecatedTerms = await getDeprecatedTermAddresses()

  const allTermsAddresses = [...liveTermsAddresses, ...deprecatedTerms]

  for (const address of allTermsAddresses) {
    const termDetails = await readContract({
      address: address as Address,
      abi: TermABI as Abi,
      functionName: "getParameters",
    })

    terms.push({
      term: address,
      collateralToken: termDetails.collateralToken,
      maxDebtPerCollateralToken: termDetails.maxDebtPerCollateralToken,
      interestRate: termDetails.interestRate,
      maxDelayBetweenPartialRepay: termDetails.maxDelayBetweenPartialRepay,
      minPartialRepayPercent: termDetails.minPartialRepayPercent,
      openingFee: termDetails.openingFee,
      hardCap: termDetails.hardCap,
      status: liveTermsAddresses.includes(address) ? "live" : "deprecated",
    })
  }

  return terms
}

//get all proposed terms

//get terms that can be voted for onboarding

//get terms by active or not
