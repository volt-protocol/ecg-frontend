import { parseUnits } from 'viem';

export const toLocaleString = (value: string): string => {
  return Number(value).toLocaleString();
};

// Add 2 decimal to number < 1000
export const formatNumberDecimal = (value: number): string => {
  const decimals = value > 1000 ? 0 : 2;
  const factor = Math.pow(10, decimals);

  return (Math.round(value * factor) / factor).toFixed(decimals);
};

// Set the number of decimals
export const formatDecimal = (value: number, decimals: number): string => {
  if (value == 0) return '0';
  if (value > 1e40) return 'Infinity';
  const factor = Math.pow(10, decimals);
  return (Math.round(value * factor) / factor).toFixed(decimals);
};

export const formatCurrencyValue = (num: number): string => {
  if (isNaN(num)) {
    return '';
  }

  if (num == 0) {
    return '0';
  }

  if (num >= 1e9) {
    return `${roundTo(num / 1e9, 2)}B`;
  } else if (num >= 1e6) {
    return `${roundTo(num / 1e6, 2)}M`;
  } else if (num >= 1e3) {
    return `${roundTo(num / 1e3, 2)}K`;
  } else if (num < 1 / 1e3) {
    return num.toExponential();
  } else {
    return `${roundTo(num, 2).toString()}`;
  }
};

export const roundTo = (num: number, dec: number): number => {
  const pow = Math.pow(10, dec);
  return Math.round((num + Number.EPSILON) * pow) / pow;
};

// Convert USDC to gUSDC (1 USDC = 1e30 * gUSDC / creditMultiplier)
export const gUsdcToUsdc = (value: bigint, creditMultiplier: bigint): bigint => {
  return (value * creditMultiplier) / parseUnits('1', 30);
};

export const usdcToGUsdc = (value: bigint, creditMultiplier: bigint): bigint => {
  return (value * parseUnits('1', 30)) / creditMultiplier;
};
