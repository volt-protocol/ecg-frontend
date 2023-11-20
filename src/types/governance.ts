import { Address } from "wagmi";

export interface ActiveOffboardingPolls {
    term: Address,
    timestamp: number,
    snapshotBlock: number,
    user: Address,
    userWeight: number
}


export interface ActiveOnboardingVotes {
    proposalId: number,
    proposer: Address,
    isActive: boolean,
    hasVoted: boolean,
    votes: {against: number, for: number, abstain: number} | undefined,
    voteStart: number,
    voteEnd: number,
}

export enum VoteOption { 
    Against = 0,
    For = 1,
    Abstain = 2
}