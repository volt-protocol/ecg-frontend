import { Address } from 'viem';

export interface ActiveOffboardingPolls {
  term: Address;
  timestamp: number;
  snapshotBlock: number;
  currentBlock: number;
  user: Address;
  userWeight: bigint;
  canOffboard: boolean;
  issuance: number;
}

export interface ActiveOnboardingVotes {
  termAddress: Address;
  termName: string;
  collateralTokenSymbol: string;
  interestRate: string;
  borrowRatio: number;
  quorum: string;
  proposalId: bigint;
  proposer: Address;
  isActive: boolean;
  hasVoted: boolean;
  votes: { against: bigint; for: bigint; abstain: bigint } | undefined;
  voteStart: number;
  voteEnd: number;
  proposeArgs: any[];
  proposalState: ProposalState;
  queueEnd: number;
}

export enum VoteOption {
  Against = 0,
  For = 1,
  Abstain = 2
}

export enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7
}

export interface ActivOnboardingVetoVotes {
  id: string;
  proposalId: string;
  termName: string;
  termAddress: Address;
  targets: Address[];
  datas: string[];
  onboardIn: number;
  timestamp: number;
  creditVeto: {
    supportVotes: number;
    quorum: number;
    state: number | 'Reverts';
    hasVoted: boolean;
  };
  guildVeto: {
    supportVotes: number;
    quorum: number;
    state: number | 'Reverts';
    hasVoted: boolean;
  };

  timelock: {
    isOperationPending: boolean;
    isOperationReady: boolean;
    isOperationDone: boolean;
  };
}
