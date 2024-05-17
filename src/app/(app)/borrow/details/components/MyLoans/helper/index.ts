import { formatDecimal, gUsdcToUsdc, usdcToGUsdc } from 'utils/numbers';
import { formatUnits, parseUnits } from 'viem';

export const getTitleDisabled = (
  pegTokenSymbol: string,
  pegTokenDecimals: number,
  value: string,
  loanDebt: bigint,
  pegTokenBalance: bigint,
  creditMultiplier: bigint,
  minBorrow: bigint,
  match: boolean
): string => {
  if (!value || Number(value) <= 0) {
    return `Enter ${pegTokenSymbol} amount`;
  }

  const normalizer = BigInt('1' + '0'.repeat(36 - pegTokenDecimals));
  const pegTokenDebt: bigint = (BigInt(loanDebt || 0) * creditMultiplier) / normalizer;
  const pegTokenRepayAmount = parseUnits(value, pegTokenDecimals);
  const pegTokenMinBorrow = (minBorrow * creditMultiplier) / normalizer;

  if (pegTokenDebt - pegTokenRepayAmount < pegTokenMinBorrow && !match) {
    return 'Cannot let debt below minimum borrow';
  }

  if (pegTokenRepayAmount > pegTokenBalance) {
    return `Insufficient ${pegTokenSymbol} in wallet`;
  }

  return '';
};
