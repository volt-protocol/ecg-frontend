import { formatUnits } from "viem"

export const getTitleDisabledStake = (
  value: string,
  creditBalance: bigint,
  symbol: string
): string => {

  if (!value || Number(value) <= 0) {
    return  `Enter ${symbol} amount`
  }

  if (Number(value) > (Number(formatUnits(creditBalance, 18)))) {
    return `Insufficient ${symbol} available for staking`
  }
}

export const getTitleDisabledUnstake = (
  value: string,
  creditAllocated: bigint,
  symbol: string
): string => {

  if (!value || Number(value) <= 0) {
    return `Enter ${symbol} amount`
  }

  if (Number(value) > Number(formatUnits(creditAllocated, 18))) {
    return `Insufficient ${symbol} available for unstaking`
  }
}
