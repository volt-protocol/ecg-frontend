import { Address } from 'viem';
import { mainnet, sepolia, arbitrum } from 'wagmi/chains';

import {} from 'next/navigation';

import { getPublicClient } from '@wagmi/core';
import { wagmiConfig } from 'contexts/Web3Provider';
import { CoinSettings } from 'store/slices/coin-details';
import { LendingTerms } from 'types/lending';
import { ContractsList } from 'store/slices/contracts-list';

export interface PendleConfig {
  [ptAddress: string]: {
    chainId: number;
    market: string;
    syTokenOut: string;
    ytAddress: string;
    expiry: string;
  };
}

export const pendleConfig: PendleConfig = {
  // ERC20_PT_WEETH_27JUN2024
  '0x1c27ad8a19ba026adabd615f6bc77158130cfbe4': {
    chainId: 42161,
    market: '0x952083cde7aaa11AB8449057F7de23A970AA8472', // market
    syTokenOut: '0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe', // weETH
    ytAddress: '0xDcdC1004d5C271ADc048982d7EB900cC4F472333', // YT-weETH-27JUN2024
    expiry: '2024-06-27T00:00:00.000Z'
  },
  // ERC20_PT_RSETH_27JUN2024
  '0xafd22f824d51fb7eed4778d303d4388ac644b026': {
    chainId: 42161,
    market: '0x6Ae79089b2CF4be441480801bb741A531d94312b', // market
    syTokenOut: '0x4186BFC76E2E237523CBC30FD220FE055156b41F', // rsETH,
    ytAddress: '0xDA53c73a28dfF704Fe757b8B4f6f6359707533Da', // YT-rsETH-27JUN2024
    expiry: '2024-06-27T00:00:00.000Z'
  },
  // ERC20_PT_WEETH_26SEP2024
  '0xb8b0a120f6a68dd06209619f62429fb1a8e92fec': {
    chainId: 42161,
    market: '0xf9f9779d8ff604732eba9ad345e6a27ef5c2a9d6', // market
    syTokenOut: '0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe', // weETH
    ytAddress: '0xfB2A7AC0372C2425c273932f8d438518402A873E', // YT-weETH-26SEP2024
    expiry: '2024-09-26T00:00:00.000Z'
  },
  // ERC20_PT_RSETH_26SEP2024
  '0x30c98c0139b62290e26ac2a2158ac341dcaf1333': {
    chainId: 42161,
    market: '0xed99fc8bdb8e9e7b8240f62f69609a125a0fbf14', // market
    syTokenOut: '0x4186BFC76E2E237523CBC30FD220FE055156b41F', // rsETH
    ytAddress: '0x2FDc424946AA72D42E2F897447d7c335E64845F0', // YT-rsETH-26SEP2024
    expiry: '2024-09-26T00:00:00.000Z'
  },
  // ERC20_PT_USDe_29AUG2024
  '0xad853eb4fb3fe4a66cdfcd7b75922a0494955292': {
    chainId: 42161,
    market: '0x2Dfaf9a5E4F293BceedE49f2dBa29aACDD88E0C4', // market
    syTokenOut: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34', // USDe
    ytAddress: '0xF478f7FeaeAB0DFdC91E02cDd6C63c66E30a7335', // YT-USDe-29AUG2024
    expiry: '2024-08-29T00:00:00.000Z'
  }
};

export function getLeverageConfig(term: LendingTerms, coinDetails: CoinSettings[], pegTokenAddress: string) {
  const collateralToken = coinDetails.find(
    (item) => item.address.toLowerCase() === term.collateral.address.toLowerCase()
  );
  const pegToken = coinDetails.find((item) => item.address.toLowerCase() === pegTokenAddress.toLowerCase());
  const ltv = (term.borrowRatio * pegToken?.price) / collateralToken?.price;

  // generic case
  let leverageDex = 'kyber';
  let maxLeverage = (1 / (1 - ltv)) * (0.99 - term.interestRate / 52);

  // special cases
  if (term?.label?.indexOf('PT-') === 0) {
    leverageDex = 'pendle';
  }

  return { maxLeverage, leverageDex };
}

export interface PermitConfig {
  address: Address;
  hasPermit: boolean;
  version?: string;
}

//set permit configurations for each collateral token here
export const permitConfig: PermitConfig[] = [
  {
    // Arbitrum PT_WEETH_26SEP2024
    address: '0xb8b0a120F6A68Dd06209619F62429fB1a8e92feC',
    hasPermit: true,
    version: '1'
  },
  {
    // Arbitrum PT_RSETH_26SEP2024
    address: '0x30c98c0139B62290E26aC2a2158AC341Dcaf1333',
    hasPermit: true,
    version: '1'
  },
  {
    // Arbitrum PT_WEETH_27JUN2024
    address: '0x1c27Ad8a19Ba026ADaBD615F6Bc77158130cfBE4',
    hasPermit: true,
    version: '1'
  },
  {
    // Arbitrum PT_RSETH_27JUN2024
    address: '0xAFD22F824D51Fb7EeD4778d303d4388AC644b026',
    hasPermit: true,
    version: '1'
  },
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
    },
    {
      key: 'od-5',
      pegToken: 'OD',
      name: 'OD',
      marketId: 5,
      networkId: 42161,
      logo: '/img/crypto-logos/od.png'
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
      },
      {
        key: 'od-5',
        pegToken: 'OD',
        name: 'OD',
        marketId: 5,
        networkId: 42161,
        logo: '/img/crypto-logos/od.png'
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
