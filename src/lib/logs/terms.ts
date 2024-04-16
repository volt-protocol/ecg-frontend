import { getPublicClient, readContract } from '@wagmi/core';
import { wagmiConfig } from 'contexts/Web3Provider';
import { TermABI, GuildABI } from 'lib/contracts';
import { ContractsList } from 'store/slices/contracts-list';
import { LendingTerms } from 'types/lending';
import { extractTermAddress } from 'utils/strings';
import { Abi, Address } from 'viem';
import getToken from 'lib/getToken';

//get all created terms
export const getTermsCreatedLogs = async (contractsList: ContractsList, marketId: number) => {
  const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber();

  const logs = await getPublicClient(wagmiConfig).getLogs({
    address: contractsList.lendingTermFactoryAddress as Address,
    event: {
      type: 'event',
      name: 'TermCreated',
      inputs: [
        { type: 'uint256', indexed: true, name: 'when' },
        { type: 'uint256', indexed: true, name: 'gaugeType' },
        { type: 'address', indexed: true, name: 'term' },
        { type: 'bytes', indexed: false, name: 'params' }
      ]
    },
    fromBlock: BigInt(0),
    toBlock: currentBlock
  });

  return Promise.all(
    logs
      .filter(function (log) {
        return Number(log.args.gaugeType) == marketId;
      })
      .map(async (log) => {
        let ret = { ...log.args };
        const params = await readContract(wagmiConfig, {
          address: ret.term as Address,
          abi: TermABI as Abi,
          functionName: 'getParameters'
        });
        const collateralTokenDetails = await getToken(params.collateralToken as Address);
        return {
          ...ret,
          params: params,
          collateralTokenDetails: collateralTokenDetails
        };
      })
  );
};

//get proposed terms
export const getTermsProposedLogs = async (contractsList: ContractsList) => {
  const currentBlock = await getPublicClient(wagmiConfig).getBlockNumber();

  const logs = await getPublicClient(wagmiConfig).getLogs({
    address: contractsList.onboardGovernorGuildAddress as Address,
    event: {
      type: 'event',
      name: 'ProposalCreated',
      inputs: [
        {
          indexed: false,
          name: 'proposalId',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'proposer',
          type: 'address'
        },
        {
          indexed: false,
          name: 'targets',
          type: 'address[]'
        },
        {
          indexed: false,
          name: 'values',
          type: 'uint256[]'
        },
        {
          indexed: false,
          name: 'signatures',
          type: 'string[]'
        },
        {
          indexed: false,
          name: 'calldatas',
          type: 'bytes[]'
        },
        {
          indexed: false,
          name: 'voteStart',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'voteEnd',
          type: 'uint256'
        },
        {
          indexed: false,
          name: 'description',
          type: 'string'
        }
      ]
    },
    fromBlock: BigInt(0),
    toBlock: currentBlock
  });

  return logs.map((log) => log.args);
};

//get a list of deprecated terms addresses
export const getDeprecatedTermAddresses = async (contractsList: ContractsList): Promise<Address[]> => {
  const result = await readContract(wagmiConfig, {
    address: contractsList.guildAddress,
    abi: GuildABI as Abi,
    functionName: 'deprecatedGauges'
  });

  return result as Address[];
};

//get proposable terms
export const getProposableTermsLogs = async (
  contractsList: ContractsList,
  lendingTerms: LendingTerms[],
  marketId: number
) => {
  const termsCreatedLogs = await getTermsCreatedLogs(contractsList, marketId);
  const termsProposedLogs = await getTermsProposedLogs(contractsList);
  const liveTermsAddresses = lendingTerms.filter((_) => _.status === 'live').map((_) => _.address);

  return termsCreatedLogs
    .filter((log) => !liveTermsAddresses.includes(log.term))
    .filter((log) => {
      const isProposed = termsProposedLogs.find(
        (item) => extractTermAddress(item.description).toLowerCase() === log.term.toLowerCase()
      );

      return isProposed ? false : true;
    });
};

export const getVotableTermsLogs = async (contractsList: ContractsList, marketId: number) => {
  const termsCreatedLogs = await getTermsCreatedLogs(contractsList, marketId);
  const termsProposedLogs = await getTermsProposedLogs(contractsList);

  return termsCreatedLogs.filter((log) => {
    const isProposed = termsProposedLogs.find(
      (item) => extractTermAddress(item.description).toLowerCase() === log.term.toLowerCase()
    );

    return isProposed ? true : false;
  });
};

export const getTermsLogs = async (contractsList: ContractsList, marketId: number) => {
  const terms = [];
  const liveTermsAddresses = contractsList.marketContracts[marketId].lendingTerms;
  const deprecatedTerms = await getDeprecatedTermAddresses(contractsList);

  const allTermsAddresses = [...liveTermsAddresses, ...deprecatedTerms];

  for (const address of allTermsAddresses) {
    const termDetails = await readContract(wagmiConfig, {
      address: address as Address,
      abi: TermABI as Abi,
      functionName: 'getParameters'
    });

    terms.push({
      term: address,
      collateralToken: termDetails.collateralToken,
      maxDebtPerCollateralToken: termDetails.maxDebtPerCollateralToken,
      interestRate: termDetails.interestRate,
      maxDelayBetweenPartialRepay: termDetails.maxDelayBetweenPartialRepay,
      minPartialRepayPercent: termDetails.minPartialRepayPercent,
      openingFee: termDetails.openingFee,
      hardCap: termDetails.hardCap,
      status: liveTermsAddresses.includes(address) ? 'live' : 'deprecated'
    });
  }

  return terms;
};
