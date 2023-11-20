'use client'

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector';
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

const evmNetworks = [
  {
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    chainId: 11155111,
    chainName: 'Ethereum Sepolia',
    iconUrls: ['https://app.dynamic.xyz/assets/networks/eth.svg'],
    name: 'Sepolia',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    networkId: 11155111,
    
    rpcUrls: [`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_SEPOLIA}`],
    vanityName: 'ETH Sepolia',
  }
]

export const Web3Provider = ({ children }: {
  children: React.ReactNode
}) => (
    <DynamicContextProvider
      settings={{
        initialAuthenticationMode: 'connect-only',
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [EthereumWalletConnectors],
        evmNetworks
      }}
    >
      {/* 2. Wrap your app with the `DynamicWagmiConnector` */}
      <DynamicWagmiConnector>
        {children}
      </DynamicWagmiConnector>
    </DynamicContextProvider>
);

export default Web3Provider