import { Address } from "viem"

export interface BorrowConfig {
  termAddress: Address
  hasLeverage: boolean
  maxLeverage: number
}

export interface PermitConfig {
  collateralAddress: Address
  collateralName: string
  hasPermit: boolean
}

// set borrowing configurations for each term
export const borrowConfig: BorrowConfig[] = [
  {
    termAddress: "0x938998fca53D8BFD91BC1726D26238e9Eada596C",
    hasLeverage: true,
    maxLeverage: 10,
  },
]

//set permit configurations for each collateral token
export const permitConfig: PermitConfig[] = [
  {
    collateralAddress: "0x9F07498d9f4903B10dB57a3Bd1D91b6B64AEd61e",
    collateralName: "sDAI",
    hasPermit: true,
  },
]
