import { readContract } from '@wagmi/core';
import { wagmiConfig } from 'contexts/Web3Provider';
import { termContract } from 'lib/contracts';
import { getActiveLoanLogs, getCloseLoanLogsbyUser } from 'lib/logs/loans';
import { MintRedeemLogs } from 'lib/logs/mint-redeem';
import { VoteLogs } from 'lib/logs/votes';
import { MdOutlineThumbDown, MdOutlineThumbUp, MdRemove } from 'react-icons/md';
import { LendingTerms, LoansObj } from 'types/lending';
import { Address, formatUnits } from 'viem';

type UserLevel = 'dragon_egg' | 'baby_dragon' | 'teenage_dragon' | 'adult_dragon';

export const getUserLoans = async (
  lendingTerms: LendingTerms[],
  termAddress: Address,
  borrower: Address,
  appChainId: Number
): Promise<LoansObj[]> => {
  let loans: LoansObj[] = [];

  //get user active loans logs
  const activeLogs = await getActiveLoanLogs(termAddress, borrower);
  const closeLogs = await getCloseLoanLogsbyUser(termAddress, borrower);

  const allLogs = [...activeLogs, ...closeLogs];

  for (const log of allLogs) {
    const loan = await readContract(wagmiConfig, {
      ...termContract(termAddress),
      functionName: 'getLoan',
      args: [log.loanId],
      chainId: appChainId as any
    });

    const lendingTerm = lendingTerms.find((term) => term.address === termAddress);

    loans.push({
      borrowAmount: Number(formatUnits(loan.borrowAmount, 18)),
      borrowCreditMultiplier: Number(formatUnits(loan.borrowCreditMultiplier, 18)),
      borrowTime: Number(loan.borrowTime.toString()),
      borrower: loan.borrower as Address,
      callDebt: Number(formatUnits(loan.callDebt, 18)),
      callTime: Number(loan.callTime.toString()),
      closeTime: Number(loan.closeTime.toString()),
      collateralAmount: Number(formatUnits(loan.collateralAmount, lendingTerm.collateral.decimals)),
      id: log.loanId as Address,
      txHashOpen: log.txHashOpen,
      txHashClose: loan.closeTime ? log.txHashClose : '',
      collateral: lendingTerm.collateral.symbol,
      interestRate: lendingTerm.interestRate,
      borrowRatio: lendingTerm.borrowRatio,
      termAddress: termAddress as Address
    });
  }
  return loans;
};

//get user level
export const getUserLevel = (loans: LoansObj[], lastMints: MintRedeemLogs[], lastVotes: VoteLogs[]): UserLevel => {
  if (lastVotes.length != 0) return 'adult_dragon';
  if (loans.length != 0) return 'teenage_dragon';
  if (lastMints.length != 0) return 'baby_dragon';
  return 'dragon_egg';
};

export const getLastVoteEventDescription = (event: VoteLogs): any => {
  let suffix: any;
  switch (event.type) {
    case 'LendingTermOnboarding':
      suffix = ` Lending Term Onboarding`;
      break;
    case 'LendingTermOffboarding':
      suffix = ` Lending Term Offboarding`;
      break;
    case 'VetoGovernor':
      suffix = ` Governance Proposal Veto`;
      break;
    case 'Governor':
      suffix = ` Governance Proposal`;
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
