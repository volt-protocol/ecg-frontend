import { formatNumberDecimal } from "./numbers"

export const generateTermName = (collateral: string, interestRate: number, borrowRatio: number) => {
    return `${collateral}-${(interestRate * 100).toFixed(1)}%-${formatNumberDecimal(borrowRatio)}`
}