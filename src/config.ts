import { Address } from 'viem';
import { mainnet, sepolia, arbitrum } from 'wagmi/chains';

import {} from 'next/navigation';

import { getPublicClient } from '@wagmi/core';
import { wagmiConfig } from 'contexts/Web3Provider';

export interface LendingTermConfig {
  termAddress: Address;
  maxLeverage: number;
}

export interface PermitConfig {
  address: Address;
  hasPermit: boolean;
  version?: string;
}

// set borrowing configurations for each term here
export const lendingTermConfig: LendingTermConfig[] = [
  /*{
    // Sepolia sDAI-8%
    termAddress: '0xA6751F2CB086CCF9bB4cc4424a9dE9Ae97496eDe',
    maxLeverage: 5
  }*/
];

//set permit configurations for each collateral token here
export const permitConfig: PermitConfig[] = [
  {
    // Arbitrum USDC
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    hasPermit: true,
    version: '2'
  },
  {
    // Arbitrum WETH
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    hasPermit: true
  },
  {
    // Sepolia USDC
    address: '0x7b8b4418990e4Daf35F5c7f0165DC487b1963641',
    hasPermit: true
  },
  {
    // Sepolia sDAI
    address: '0x9F07498d9f4903B10dB57a3Bd1D91b6B64AEd61e',
    hasPermit: true
  },
  {
    // Sepolia WBTC
    address: '0x1cED1eB530b5E71E6dB9221A22C725e862fC0e60',
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

// set the available chains/ markets here
export let SelectableChainId = [42161, 11155111];
export let marketsConfig: { [chainId: number]: SupportedMarket[] } = {
  42161: [
    {
      key: 'weth-3',
      pegToken: 'WETH',
      name: 'WETH',
      marketId: 3,
      networkId: 42161,
      logo: '/img/crypto-logos/weth.png'
    },
    {
      key: 'arb-4',
      pegToken: 'ARB',
      name: 'ARB',
      marketId: 4,
      networkId: 42161,
      logo: '/img/crypto-logos/arb.png'
    },
    {
      key: 'usdc-1',
      pegToken: 'USDC',
      name: 'USDC',
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
if (process.env.NEXT_PUBLIC_APP_ENV.toLowerCase() == 'production') {
  SelectableChainId = [42161];
  marketsConfig = {
    42161: [
      {
        key: 'weth-3',
        pegToken: 'WETH',
        name: 'WETH',
        marketId: 3,
        networkId: 42161,
        logo: '/img/crypto-logos/weth.png'
      },
      {
        key: 'usdc-1',
        pegToken: 'USDC',
        name: 'USDC',
        marketId: 1,
        networkId: 42161,
        logo: '/img/crypto-logos/usdc.png'
      },
      {
        key: 'arb-4',
        pegToken: 'ARB',
        name: 'ARB',
        marketId: 4,
        networkId: 42161,
        logo: '/img/crypto-logos/arb.png'
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
      'https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/main/protocol-configuration/addresses.arbitrum.json'
  },
  {
    id: mainnet.id,
    jsonUrl:
      'https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/main/protocol-configuration/addresses.mainnet.json'
  },
  {
    id: sepolia.id,
    jsonUrl:
      'https://raw.githubusercontent.com/volt-protocol/ethereum-credit-guild/main/protocol-configuration/addresses.sepolia.json'
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
  if (marketsConfig[chainId].some((item) => item.marketId == marketId)) {
    return marketsConfig[chainId].find((item) => item.marketId == marketId).logo;
  } else {
    return '/img/crypto-logos/unk.png';
  }
}

export async function getL1BlockNumber(chainId: number) {
  let blockNumber = BigInt(0);

  // for arbitrum, fetch mainnet block number
  if (chainId == arbitrum.id) {
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
