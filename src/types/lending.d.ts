import { Address } from "viem"

export type LoansObj = {
  id: string
  bidTime: number
  borrowerAddress: string
  borrowAmount: number
  callerAddress: string
  callTime: number
  closeTime: number
  collateralAmount: number
  debtWhenSeized?: number
  lendingTermAddress: string
  collateralAddress: string
  status: string
  originationTime: number
  ltv: number
  loanDebt?: number
}

export type loanObjCall = {
  borrowAmount: bigint
  borrowCreditMultiplier: bigint
  callDebt: number
  callTime: number
  caller: string
  closeTime: number
  collateralAmount: bigint
  borrower: Address
  loanDebt?: bigint
}
export type loanObj = loanObjCall & {
  id: Address
  termAddress: Address
}

export type ProposedTerm = {
  termAddress: Address
  collateralTokenSymbol: string
  termName: string
  openingFee: number
  interestRate: string
  borrowRatio: number
  hardCap: string
  collateralToken: Address
  maxDelayBetweenPartialRepay: string
  minPartialRepayPercent: string
}

export type LendingTerms = {
  address: Address
  collateral : {
    address: Address
    name: string
    logo: string
    decimals: number
  }
  interestRate: number
  borrowRatio: number
  availableDebt: number
  currentDebt: number
  openingFee: number
  maxDebtPerCollateralToken: number
  minPartialRepayPercent: number
  maxDelayBetweenPartialRepay: number
  status: 'deprecated' | 'live'
  label: string
}

export interface LendingTermsResponse {
  _id: string
  key: string
  lastUpdateTimestamp: number
  lendingTerms: LendingTerms[]
}

export type userData = {
  address: string
  isConnected: boolean
}
