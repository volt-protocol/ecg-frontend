import { configureChains, mainnet,createConfig, sepolia } from 'wagmi'
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'
import { infuraProvider } from 'wagmi/providers/infura'



const { chains, publicClient, webSocketPublicClient } = configureChains(
    [sepolia],
    [infuraProvider({ apiKey: 'e289cb05d6b943959a2b6b9429178870' })],
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
    export{ config, chains, publicClient};