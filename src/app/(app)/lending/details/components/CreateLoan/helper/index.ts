export const getTitleDisabled = (
  collateralAmount: number,
  borrowAmount: number,
  collateralBalance: number,
  maxDebt: number,
  maxBorrow: number,
  minBorrow: number,
  withLeverage: boolean
): string => {
  if (!collateralAmount || collateralAmount <= 0) {
    return "Enter collateral amount"
  }

  if (collateralAmount > collateralBalance) {
    return "Not enough collateral"
  }

  if (borrowAmount > maxDebt) {
    return "Cannot exceed available debt"
  }

  if (!withLeverage && borrowAmount > maxBorrow) {
    return "Cannot exceed available borrowing power"
  }

  if (borrowAmount < minBorrow) {
    return "Borrow minimum USDC amount"
  }
}

