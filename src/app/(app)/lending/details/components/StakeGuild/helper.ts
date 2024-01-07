import { formatUnits } from "viem"

export const getTitleDisabledStake = (
  value: string,
  guildBalance: bigint,
  guildUserWeight: bigint
): string => {

  if (!value || Number(value) <= 0) {
    return "Enter GUILD amount"
  }

  if (Number(value) > Number(formatUnits(guildBalance, 18)) - Number(formatUnits(guildUserWeight, 18))) {
    return "Insufficient GUILD available for staking"
  }
}

export const getTitleDisabledUnstake = (
  value: string,
  guildUserGaugeWeight: bigint
): string => {

  if (!value || Number(value) <= 0) {
    return "Enter GUILD amount"
  }

  if (Number(value) > Number(formatUnits(guildUserGaugeWeight, 18))) {
    return "Insufficient GUILD available for unstaking"
  }
}
