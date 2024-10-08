export interface Proposal {
  status: 'created' | 'proposed' | 'queued' | 'active';
  createdBlock: number;
  termAddress: string;
  collateralTokenAddress: string;
  collateralTokenSymbol: string;
  collateralTokenDecimals: number;
  knownToken: boolean;
  termName: string;
  openingFee: string;
  interestRate: string;
  borrowRatio: number;
  maxDebtPerCollateralToken: string;
  maxDelayBetweenPartialRepay: number;
  minPartialRepayPercent: number;
  hardCap: string;
  proposalId: string;
  description: string;
  calldatas: string[];
  values: string[];
  targets: string[];
  proposer: string;
  voteStart: number;
  voteEnd: number;
  quorum: string;
  auctionHouse: Address;
}

export interface ProposalsApiResponse {
  updated: number;
  updateBlock: number;
  updatedHuman: string;
  proposals: Proposal[];
}

export interface ProposalParams {
  status: 'proposed' | 'queued' | 'active';
  createdBlock: number;
  termAddress: string;
  paramName: 'interestRate' | 'hardCap' | 'maxDebtPerCollateralToken';
  paramValue: string;
  proposalId: string;
  description: string;
  calldatas: string[];
  values: string[];
  targets: string[];
  proposer: string;
  voteStart: number;
  voteEnd: number;
  quorum: string;
}

export interface ProposalsParamsApiResponse {
  updated: number;
  updateBlock: number;
  updatedHuman: string;
  proposals: ProposalParams[];
}
