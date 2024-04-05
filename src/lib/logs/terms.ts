import { getPublicClient, readContract } from "@wagmi/core"
import { wagmiConfig } from "contexts/Web3Provider"
import { TermABI, GuildABI } from "lib/contracts"
import { ContractsList } from "store/slices/contracts-list"
import { FROM_BLOCK } from "utils/constants"
import { extractTermAddress } from "utils/strings"
import { Abi, Address } from "viem"

//get all created terms
export const getTermsCreatedLogs = async (contractsList: ContractsList) => {
  const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber()

  const logs = await getPublicClient(wagmiConfig).getLogs({
    address: contractsList.lendingTermFactoryAddress as Address,
    event: {
      type: "event",
      name: "TermCreated",
      inputs: [
        { type: "uint256", indexed: true, name: "when" },
        { type: "uint256", indexed: true, name: "gaugeType" },
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
export const getTermsProposedLogs = async (contractsList: ContractsList) => {
  const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber()

  const logs = await getPublicClient(wagmiConfig).getLogs({
    address: contractsList.onboardGovernorGuildAddress as Address,
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
export const getLiveTermsAddresses = async (
  contractsList: ContractsList
): Promise<Address[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL + `/markets/${999999999}/infos`
  // const result = await readContract(wagmiConfig, {
  //   address: contractsList.guildAddress,
  //   abi: GuildABI as Abi,
  //   functionName: "liveGauges",
  // })
  return result as Address[]
}

//get a list of deprecated terms addresses
export const getDeprecatedTermAddresses = async (
  contractsList: ContractsList
): Promise<Address[]> => {
  const result = await readContract(wagmiConfig, {
    address: contractsList.guildAddress,
    abi: GuildABI as Abi,
    functionName: "deprecatedGauges",
  })

  return result as Address[]
}

//get propasable terms
export const getProposableTermsLogs = async (contractsList: ContractsList) => {
  const termsCreatedLogs = await getTermsCreatedLogs(contractsList)
  const termsProposedLogs = await getTermsProposedLogs(contractsList)
  const liveTermsAddresses = await getLiveTermsAddresses(contractsList)

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

export const getVotableTermsLogs = async (contractsList: ContractsList) => {
  const termsCreatedLogs = await getTermsCreatedLogs(contractsList)
  const termsProposedLogs = await getTermsProposedLogs(contractsList)

  return termsCreatedLogs.filter((log) => {
    const isProposed = termsProposedLogs.find(
      (item) =>
        extractTermAddress(item.description).toLowerCase() === log.term.toLowerCase()
    )

    return isProposed ? true : false
  })
}

export const getTermsLogs = async (contractsList: ContractsList) => {
  const terms = []
  const liveTermsAddresses = await getLiveTermsAddresses(contractsList)
  const deprecatedTerms = await getDeprecatedTermAddresses(contractsList)

  const allTermsAddresses = [...liveTermsAddresses, ...deprecatedTerms]

  for (const address of allTermsAddresses) {
    const termDetails = await readContract(wagmiConfig, {
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
