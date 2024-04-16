import { formatDecimal, gUsdcToUsdc, usdcToGUsdc } from 'utils/numbers';
import { formatUnits, parseUnits } from 'viem';

export const getTitleDisabled = (
  value: string,
  loanDebt: bigint,
  usdcBalance: bigint,
  creditMultiplier: bigint,
  minBorrow: bigint,
  match: boolean
): string => {
  if (!value || Number(value) <= 0) {
    return 'Enter USDC amount';
  }

  if (parseUnits(value, 6) > usdcBalance) {
    return 'Insufficient funds available';
  }

  if (loanDebt - usdcToGUsdc(parseUnits(value, 6), creditMultiplier) < minBorrow && !match) {
    return 'Cannot let debt below minimum borrow';
  }

  return 'Repay';
};
