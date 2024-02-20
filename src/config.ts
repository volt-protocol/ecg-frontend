import { Address } from "viem"

export interface LendingTermConfig {
  termAddress: Address
  hasLeverage: boolean
  maxLeverage: number
  useGateway: boolean
}

export interface PermitConfig {
  collateralAddress: Address
  collateralName: string
  hasPermit: boolean
}

// set borrowing configurations for each term
export const lendingTermConfig: LendingTermConfig[] = [
  {
    termAddress: "0x938998fca53D8BFD91BC1726D26238e9Eada596C",
    hasLeverage: true,
    maxLeverage: 10,
    useGateway: true,
  },
  {
    termAddress: "0x820E8F9399514264Fd8CB21cEE5F282c723131f6",
    hasLeverage: false,
    maxLeverage: 0,
    useGateway: false,
  },
]

//set permit configurations for each collateral token
export const permitConfig: PermitConfig[] = [
  {
    collateralAddress: "0x9F07498d9f4903B10dB57a3Bd1D91b6B64AEd61e",
    collateralName: "sDAI",
    hasPermit: true,
  },
  {
    collateralAddress: "0x1cED1eB530b5E71E6dB9221A22C725e862fC0e60",
    collateralName: "WBTC",
    hasPermit: false,
  },
]
