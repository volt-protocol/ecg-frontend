export interface HistoricalLoanBorrow {
    timestamps: number[];
    values:     LoanBorrowValues;
}

export interface LoanBorrowValues {
    openLoans:            number[];
    borrowValue:          number[];
    totalUnpaidInterests: number[];
}

export interface HistoricalAprData {
    timestamps: number[];
    values:     AprDataValues;
}

export interface AprDataValues {
    rebasingSupply:    number[];
    totalSupply:       number[];
    targetTotalSupply: number[];
    sharePrice:        number[];
}
