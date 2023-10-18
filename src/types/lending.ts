export type LoansObj = {
  id: string;
  bidTime: number,
  borrowerAddress: string;
  borrowAmount: number;
  callerAddress: string;
  callTime: number;
  closeTime: number;
  collateralAmount: number;
  debtWhenSeized: number;
  lendingTermAddress: string;
  collateralAddress: string;
  status: string;
  originationTime: number;
    ltv: number;
loanDebt?: number;
  };

  export type lendingTerms = {
    address: string;
    collateral: string;
    collateralAddress: string;
    collateralDecimals: number;
    interestRate: number;
    borrowRatio:number;
    callFee: number;
    callPeriodSeconds: number;
    availableDebt: number;
    currentDebt: number;
    openingFee: number; 
    minPartialRepayPercent: number;
    maxDelayBetweenPartialRepay: number;
    ltvBuffer: number;
    minBorrow: number;
    status: string;
    label: string;
  };

  export  interface LendingTerms{
    _id: string;
    key: string;
    lastUpdateTimestamp: number;
    lendingTerms: lendingTerms[];
  }

  export type userData = {
    address: string; 
    isConnected: boolean;
  };