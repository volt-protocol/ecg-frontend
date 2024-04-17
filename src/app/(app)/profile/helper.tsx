import { readContract } from '@wagmi/core';
import { wagmiConfig } from 'contexts/Web3Provider';
import { termContract } from 'lib/contracts';
import { getActiveLoanLogs, getCloseLoanLogsbyUser } from 'lib/logs/loans';
import { MintRedeemLogs } from 'lib/logs/mint-redeem';
import { VoteLogs } from 'lib/logs/votes';
import { MdOutlineThumbDown, MdOutlineThumbUp, MdRemove } from 'react-icons/md';
import { LastActivity } from 'types/activities';
import { LendingTerms, LoansObj } from 'types/lending';
import { Address, formatUnits } from 'viem';

type UserLevel = 'dragon_egg' | 'baby_dragon' | 'teenage_dragon' | 'adult_dragon';

export const getUserLoans = async (loans: LoansObj[], termAddress: Address, borrower: Address): Promise<LoansObj[]> => {
  return loans.filter((_) => _.termAddress == termAddress && _.borrower == borrower);
};

//get user level
export const getUserLevel = (loans: LoansObj[], lastMints: MintRedeemLogs[], lastVotes: VoteLogs[]): UserLevel => {
  if (lastVotes.length != 0) return 'adult_dragon';
  if (loans.length != 0) return 'teenage_dragon';
  if (lastMints.length != 0) return 'baby_dragon';
  return 'dragon_egg';
};

export const getLastVoteEventDescription = (event: LastActivity): any => {
  let suffix: any;
  switch (event.type) {
    case 'LendingTermOnboarding':
      suffix = ' Lending Term Onboarding';
      break;
    case 'LendingTermOffboarding':
      suffix = ' Lending Term Offboarding';
      break;
    case 'VetoGovernor':
      suffix = ' Governance Proposal Veto';
      break;
    case 'Governor':
      suffix = ' Governance Proposal';
      break;
  }

  switch (event.vote) {
    case 'for':
      return (
        <div className="flex items-center gap-2">
          <MdOutlineThumbUp className="text-green-500" /> Voted for proposal
        </div>
      );
    case 'against':
      return (
        <div className="flex items-center gap-2">
          <MdOutlineThumbDown className="text-red-500" /> Voted against proposal
        </div>
      );
    case 'abstain':
      return (
        <div className="flex items-center gap-2">
          <MdRemove className="text-gray-500" /> Voted abstain
        </div>
      );
  }
};
