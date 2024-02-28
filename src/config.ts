import { Address } from "viem"
import {
  mainnet,
  sepolia,
  arbitrum,
  optimism,
  arbitrumSepolia,
  optimismSepolia,
  polygonMumbai,
} from "wagmi/chains"

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

// set borrowing configurations for each term here
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

//set permit configurations for each collateral token here
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

// set the available markets here
export const marketsConfig = [
  {
    key: "usdc",
    name: "USDC",
    logo: "/img/crypto-logos/usdc.png",
  },
  {
    key: "usdt",
    name: "USDT",
    logo: "/img/crypto-logos/usdt.png",
  },
]

// set the available contracts for each chain here
/*
 * Note : Don't forget to add supported chains in app/contexts/Web3Provider.tsx
 */
export const chainsConfig = [
  {
    id: mainnet.id,
    jsonUrl: "https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/main/protocol-configuration/addresses.sepolia.json",
  },
  {
    id: sepolia.id,
    jsonUrl: "https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/main/protocol-configuration/addresses.sepolia.json",
  }
]
