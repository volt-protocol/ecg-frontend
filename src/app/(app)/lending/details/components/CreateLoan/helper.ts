export const getTitleDisabled = (
  value: number,
  maxDebt: number,
  maxBorrow: number,
  minBorrow: number,
): string => {

  if (!value || Number(value) <= 0) {
    return "Enter gUSDC amount"
  }

  if (Number(value) > maxDebt) {
    return "Cannot exceed available debt"
  }

    if (Number(value) > maxBorrow) {
        return "Cannot exceed available borrowing power"
    }

  if (Number(value) < minBorrow) {
    return "Enter minimum gUSDC amount"
  }
}
