import { Address } from 'viem';

export type LoansObj = {
  id: string;
  borrower: Address;
  borrowRatio: number;
  borrowAmount: number;
  borrowTime: number;
  collateral: string;
  borrowCreditMultiplier: number;
  callDebt: number;
  callTime: number;
  closeTime: number;
  collateralAmount: number;
  interestRate: number;
  txHashOpen: string;
  txHashClose: string;
  termAddress: Address;
  loanDebt: number;
  debtRepaid: number;
};

export type loanObjCall = {
  borrowAmount: bigint;
  borrowCreditMultiplier: bigint;
  callDebt: number;
  callTime: number;
  caller: string;
  closeTime: number;
  collateralAmount: bigint;
  borrower: Address;
  loanDebt?: bigint;
};
export type loanObj = loanObjCall & {
  id: Address;
  termAddress: Address;
};

export type ProposedTerm = {
  termAddress: Address;
  collateralTokenSymbol: string;
  termName: string;
  openingFee: number;
  interestRate: string;
  borrowRatio: number;
  hardCap: string;
  collateralToken: Address;
  maxDelayBetweenPartialRepay: string;
  minPartialRepayPercent: string;
};

export type LendingTerms = {
  address: Address;
  collateral: {
    symbol: string;
    address: Address;
    name: string;
    logo: string;
    decimals: number;
  };
  interestRate: number;
  borrowRatio: number;
  availableDebt: number;
  currentDebt: number;
  openingFee: number;
  maxDebtPerCollateralToken: number;
  minPartialRepayPercent: number;
  maxDelayBetweenPartialRepay: number;
  status: 'deprecated' | 'live';
  label: string;
  gaugeWeight: number;
  totalTypeWeight: number;
  issuance: number;
  debtCeiling: number;
  termSurplusBuffer: number;
  activeLoans: number;
};

export interface LendingTermsResponse {
  updated: number;
  updatedHuman: string;
  updateBlock: number;
  terms: LendingTerms[];
}

export interface LoansResponse {
  updated: number;
  updateBlock: number;
  updatedHuman: string;
  loans: LoansObj[];
}

export type userData = {
  address: string;
  isConnected: boolean;
};
