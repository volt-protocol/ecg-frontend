import { Address } from "wagmi";

export interface ActiveOffboardingPolls {
    term: Address,
    timestamp: number,
    snapshotBlock: number,
    user: Address,
    userWeight: number
}

export interface ActiveOnboardingVotes {
    termName: string,
    collateralTokenSymbol: string,
    interestRate: string,
    borrowRatio: number,
    quorum: string,
    proposalId: BigInt,
    proposer: Address,
    isActive: boolean,
    hasVoted: boolean,
    votes: {against: bigint, for: bigint, abstain: bigint} | undefined,
    voteStart: number,
    voteEnd: number,
    proposeArgs: any[],
    proposalState: ProposalState,
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

export interface ActiveVetoVotes {
    id: string,
    proposalId: string,
    termName: string,
    termAddress: Address,
    targets: Address[],
    datas: string[],
    onboardIn: number, 
    timestamp: number,
    supportVotes: number,
    quorum: number,
    state: number
}