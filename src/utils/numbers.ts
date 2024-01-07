// Add 2 decimal to number < 1000
export const formatNumberDecimal = (value: number): string => {
  let decimals = value > 1000 ? 0 : 2
  const factor = Math.pow(10, decimals)
  
  return (Math.round(value * factor) / factor).toFixed(decimals)
}

export const formatDecimal = (value: number, decimals: number): string => {
  const factor = Math.pow(10, decimals)
  return value != 0 ? (Math.round(value * factor) / factor).toFixed(decimals) : '0'
}

export const decimalToUnit = (number:number, decimals:number):number => {
  const divider = BigInt(Math.pow(10, decimals));
  return Number(number) / Number(divider);
}

export const parseToUnit = (number:number, decimals:number):number => {
  const multiplier = BigInt(Math.pow(10, decimals));
  return Number(number) * Number(multiplier);
}


export const formatCurrencyValue = (value: number): string => {
  if (value === undefined) {
    // Gérez l'erreur ou retournez une valeur par défaut
    console.error("La valeur est undefined");
    return "";
}
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  if (value < 1000) return `${value.toFixed(2)}`;
  if (value < 10**(-6)) return `${value.toFixed(0)}`;
  return value.toString();
}

export const ucFirst = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}