import { formatDecimal } from "utils/numbers"
import { formatUnits } from "viem"

export const getTitleDisabled = (
  value: number,
  loanDebt: bigint,
  creditBalance: number
): string => {
  if (!value || Number(value) <= 0) {
    return "Enter gUSDC amount"
  }

  if (Number(value) >= Number(formatUnits(loanDebt, 18))) {
    return "Cannot exceed debt amount"
  }

  if (Number(value) >= creditBalance) {
    return "Insufficient funds available"
  }

  return "Repay"
}
