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

export type SupportedMarket = {
  key: string,
  name: string,
  logo: string,
  pegToken: string,
  marketId: number,
  networkId: number,
}

// set the available markets here
export const marketsConfig: SupportedMarket[] = [
  {
    key: "usdc-test",
    pegToken: "USDC",
    name: "USDC-test",
    marketId: 999999999,
    networkId: 42161,
    logo: "/img/crypto-logos/usdc.png",
  },
  {
    key: "weth-test",
    pegToken: "WETH",
    name: "WETH-test",
    marketId: 999999998,
    networkId: 42161,
    logo: "/img/crypto-logos/weth.png",
  },
]

// set the available contracts for each chain here
/*
 * Note : Don't forget to add supported chains in src/contexts/Web3Provider.tsx
 */
export const chainsConfig = [
  {
    id: arbitrum.id,
    jsonUrl: "https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/feat/arbitrum-deployment/protocol-configuration/addresses.arbitrum.json",
  },
  {
    id: mainnet.id,
    jsonUrl: "https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/main/protocol-configuration/addresses.sepolia.json",
  },
  {
    id: sepolia.id,
    jsonUrl: "https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/main/protocol-configuration/addresses.sepolia.json",
  }
]


export type CoinProperties = {
  nameECG: string
  nameCG: string
  logo: string
  address: Address
}

export const coinsList: CoinProperties[] = [
  // {
  //   nameECG: "gUSDC",
  //   nameCG: "geist-usdc",
  //   logo: "/img/crypto-logos/usdc.png",
  // },
  {
    nameECG: "USDC",
    nameCG: "usd-coin",
    logo: "/img/crypto-logos/usdc.png",
    address: "0x7b8b4418990e4daf35f5c7f0165dc487b1963641",
  },
  {
    nameECG: "sDAI",
    nameCG: "savings-dai",
    logo: "/img/crypto-logos/dai.png",
    address: "0x9f07498d9f4903b10db57a3bd1d91b6b64aed61e",
  },
  {
    nameECG: "WBTC",
    nameCG: "bitcoin",
    logo: "/img/crypto-logos/btc.png",
    address: "0x1ced1eb530b5e71e6db9221a22c725e862fc0e60",
  },
  {
    nameECG: "WETH",
    nameCG: "ethereum",
    logo: "/img/crypto-logos/weth.png",
    address: "0x1ced1eb530b5e71e6db9221a22c725e862fc0e60",
  }
]