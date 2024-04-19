import { Address } from 'viem';
import { mainnet, sepolia, arbitrum } from 'wagmi/chains';

import { getPublicClient } from '@wagmi/core';
import { wagmiConfig } from 'contexts/Web3Provider';

export interface LendingTermConfig {
  termAddress: Address;
  hasLeverage: boolean;
  maxLeverage: number;
  useGateway: boolean;
}

export interface PermitConfig {
  collateralAddress: Address;
  collateralName: string;
  hasPermit: boolean;
}

// set borrowing configurations for each term here
export const lendingTermConfig: LendingTermConfig[] = [
  {
    termAddress: '0x938998fca53D8BFD91BC1726D26238e9Eada596C',
    hasLeverage: true,
    maxLeverage: 10,
    useGateway: true
  },
  {
    termAddress: '0x820E8F9399514264Fd8CB21cEE5F282c723131f6',
    hasLeverage: false,
    maxLeverage: 0,
    useGateway: false
  }
];

//set permit configurations for each collateral token here
export const permitConfig: PermitConfig[] = [
  {
    collateralAddress: '0x9F07498d9f4903B10dB57a3Bd1D91b6B64AEd61e',
    collateralName: 'sDAI',
    hasPermit: true
  },
  {
    collateralAddress: '0x1cED1eB530b5E71E6dB9221A22C725e862fC0e60',
    collateralName: 'WBTC',
    hasPermit: false
  }
];

export type SupportedMarket = {
  key: string;
  name: string;
  logo: string;
  pegToken: string;
  marketId: number;
  networkId: number;
};

// set the available markets here
export let marketsConfig: { [chainId: number]: SupportedMarket[] } = {
  42161: [
    {
      key: 'usdc-1',
      pegToken: 'USDC',
      name: '1 - USDC',
      marketId: 1,
      networkId: 42161,
      logo: '/img/crypto-logos/usdc.png'
    },
    {
      key: 'usdc-test',
      pegToken: 'USDC',
      name: 'USDC (test)',
      marketId: 999999999,
      networkId: 42161,
      logo: '/img/crypto-logos/usdc.png'
    },
    {
      key: 'weth-test',
      pegToken: 'WETH',
      name: 'WETH (test)',
      marketId: 999999998,
      networkId: 42161,
      logo: '/img/crypto-logos/weth.png'
    }
  ],
  11155111: [
    {
      key: 'USDC-sepolia',
      pegToken: 'USDC',
      name: 'USDC (test)',
      marketId: 42,
      networkId: 11155111,
      logo: '/img/crypto-logos/usdc.png'
    },
    {
      key: 'MEME-sepolia',
      pegToken: 'WBTC',
      name: 'WBTC (test)',
      marketId: 420,
      networkId: 11155111,
      logo: '/img/crypto-logos/wbtc.png'
    }
  ]
};

// specific for production
if(window.location.href.startsWith('https://app.creditguild.org')) {
// if(window.location.href.startsWith('http://localhost:3000')) {
  marketsConfig = {
    42161: [
      {
        key: 'usdc-1',
        pegToken: 'USDC',
        name: '1 - USDC',
        marketId: 1,
        networkId: 42161,
        logo: '/img/crypto-logos/usdc.png'
      }
    ],
    11155111: [
      {
        key: 'USDC-sepolia',
        pegToken: 'USDC',
        name: 'USDC (test)',
        marketId: 42,
        networkId: 11155111,
        logo: '/img/crypto-logos/usdc.png'
      }
    ]
  };
}

// set the available contracts for each chain here
/*
 * Note : Don't forget to add supported chains in src/contexts/Web3Provider.tsx
 */
export const chainsConfig = [
  {
    id: arbitrum.id,
    jsonUrl:
      'https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/feat/arbitrum-deployment/protocol-configuration/addresses.arbitrum.json'
  },
  {
    id: mainnet.id,
    jsonUrl:
      'https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/feat/arbitrum-deployment/protocol-configuration/addresses.mainnet.json'
  },
  {
    id: sepolia.id,
    jsonUrl:
      'https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/feat/arbitrum-deployment/protocol-configuration/addresses.sepolia.json'
  }
];

export function getApiBaseUrl(chainId: number) {
  switch (chainId) {
    default:
      return '';
    // throw new Error(`Unknown chain ${chainId}`);
    case 11155111:
      return process.env.NEXT_PUBLIC_SEPOLIA_BACKEND_API_URL;
    case 42161:
      return process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_ARBITRUM_BACKEND_API_URL;
  }
}

export const SelectableChainId = [42161, 11155111];

export function getExplorerBaseUrl(chainId: number) {
  switch (chainId) {
    default:
      return 'https://etherscan.io';
    case 11155111:
      return 'https://sepolia.etherscan.io';
    case 42161:
      return 'https://arbiscan.io';
  }
}

export function getBlockLengthMs(chainId: number) {
  switch (chainId) {
    default:
    case 11155111:
      return 12000;
    case 42161:
      return 250;
  }
}

export function getPegTokenLogo(chainId: number, marketId: number) {
  return marketsConfig[chainId].find((item) => item.marketId == marketId).logo;
}

export async function getL1BlockNumber(chainId: number) {
  let blockNumber = BigInt(0);

  // for arbitrum, fetch mainnet block number
  if(chainId == arbitrum.id) {
    blockNumber = await getPublicClient(wagmiConfig, {
      chainId: 1
    }).getBlockNumber();
  } else {
    blockNumber = await getPublicClient(wagmiConfig, {
      chainId: chainId as any
    }).getBlockNumber();
  }

  return blockNumber;
}
