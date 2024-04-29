import { formatUnits, parseUnits } from 'viem';

export const getTitleDisabledStake = (value: string, guildBalance: bigint, guildUserWeight: bigint): string => {
  if (!value || Number(value) <= 0) {
    return 'Enter GUILD amount';
  }

  if (parseUnits(value, 18) > guildBalance - guildUserWeight) {
    return 'Insufficient GUILD available for staking';
  }
};

export const getTitleDisabledUnstake = (value: string, guildUserGaugeWeight: bigint): string => {
  if (!value || Number(value) <= 0) {
    return 'Enter GUILD amount';
  }

  if (parseUnits(value, 18) > guildUserGaugeWeight) {
    return 'Insufficient GUILD available for unstaking';
  }
};
