import { configureChains, mainnet,createConfig, WagmiConfig, sepolia } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'

const { chains, publicClient, webSocketPublicClient } = configureChains(
    [sepolia],
    [publicProvider()],
  )

  const { connectors } = getDefaultWallets({
    appName: 'Ethereum Guild App',
    projectId: '1',
    chains
  });
  
   
  const config = createConfig({
    autoConnect: true,
    publicClient,
    connectors,
    webSocketPublicClient,
  })
    export{ config, chains};