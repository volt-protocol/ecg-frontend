import { formatCurrencyValue } from 'utils/numbers';
import { formatUnits } from 'viem';

export const getTitleDisabled = (
  pegTokenSymbol: string,
  collateralAmount: number,
  borrowAmount: number,
  collateralBalance: number,
  maxDebt: number,
  maxBorrow: number,
  minBorrow: number,
  pegTokenBorrowAmount: number,
  pegTokenBalance: number,
  withLeverage: boolean
): string => {
  if (!collateralAmount || collateralAmount <= 0) {
    return 'Enter collateral amount';
  }

  if (borrowAmount > maxDebt) {
    return `Only ${formatCurrencyValue(maxDebt)} ${pegTokenSymbol} available debt`;
  }

  if (borrowAmount < minBorrow) {
    return `Minimum borrow is ${formatCurrencyValue(minBorrow)} ${pegTokenSymbol}`;
  }

  if (pegTokenBorrowAmount > pegTokenBalance) {
    return `Only ${formatCurrencyValue(pegTokenBalance)} ${pegTokenSymbol} liquidity available`;
  }

  if (!withLeverage && borrowAmount > maxBorrow) {
    return 'Not enough collateral';
  }

  if (collateralAmount > collateralBalance) {
    return 'Not enough collateral';
  }

  return '';
};
