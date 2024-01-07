import { formatUnits } from "viem"

export const getTitleDisabledStake = (
  value: string,
  creditBalance: bigint,
): string => {

  if (!value || Number(value) <= 0) {
    return "Enter gUSDC amount"
  }

  if (Number(value) > (Number(formatUnits(creditBalance, 18)))) {
    return "Insufficient gUSDC available for staking"
  }
}

export const getTitleDisabledUnstake = (
  value: string,
  creditAllocated: bigint
): string => {

  if (!value || Number(value) <= 0) {
    return "Enter gUSDC amount"
  }

  if (Number(value) > Number(formatUnits(creditAllocated, 18))) {
    return "Insufficient gUSDC available for unstaking"
  }
}
