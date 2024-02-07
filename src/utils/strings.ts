import { Address, isAddress } from "viem"
import { formatNumberDecimal } from "./numbers"

export const generateTermName = (collateral: string, interestRate: number, borrowRatio: number) => {
    return `${collateral}-${(interestRate * 100).toFixed(1)}%-${formatNumberDecimal(borrowRatio)}`
}

export const shortenUint = (string: string) => {
    return `${string.slice(0, 10)}...`
}

export const shortenAddress = (address: Address) => {
    if(isAddress(address) === false) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

//get term address from description arg in ProposeTerm event from LendingTermOnboarding contract
export const extractTermAddress = (description: string) => {
  return description.split("term")[1].trim()
}

export const underscoreToString = (str: string) => {
  //replace _ with space and capitalize each word
  return str.replace(/_/g, " ").replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())))
}

export const camelCasetoString = (str: string) => {
  return str.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
}

export const addSlash = (str: string) => {
  //add slash between each word
  return str.replace(/\s/g, " / ")
}

export const ucFirst = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}