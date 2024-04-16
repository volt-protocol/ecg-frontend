import { Address, isAddress } from 'viem';
import { formatNumberDecimal } from './numbers';
import { ContractsList } from 'store/slices/contracts-list';
import { CoinSettings } from 'store/slices/coin-details';

export const generateTermName = (collateral: string, interestRate: number, borrowRatio: number) => {
  return `${collateral}-${formatNumberDecimal(borrowRatio)}-${(interestRate * 100).toFixed(1)}%`;
};

export function getCreditTokenSymbol(coinDetails: CoinSettings[], appMarketId: number, contractsList: ContractsList) {
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const creditTokenSymbol = 'g' + pegToken?.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  return creditTokenSymbol;
}

export function eq(str1: string, str2: string) {
  return str1.toLowerCase() == str2.toLowerCase();
}

export const shortenUint = (string: string) => {
  return `${(string || '').slice(0, 10)}...`;
};

export const shortenAddress = (address: Address) => {
  if (isAddress(address) === false) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

//get term address from description arg in ProposeTerm event from LendingTermOnboarding contract
export const extractTermAddress = (description: string) => {
  if (!description.includes('term')) {
    return null;
  }
  return description.split('term')[1].trim();
};

export const underscoreToString = (str: string) => {
  //replace _ with space and capitalize each word
  return str.replace(/_/g, ' ').replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase()));
};

export const camelCasetoString = (str: string) => {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

export const addSlash = (str: string) => {
  //add slash between each word
  return str.replace(/\s/g, ' / ');
};

export const ucFirst = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};
