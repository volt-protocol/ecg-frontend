import { configureChains, mainnet,createConfig, WagmiConfig, sepolia } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'

const { chains, publicClient, webSocketPublicClient } = configureChains(
    [sepolia],
    [publicProvider()],
  )
  
   
  const config = createConfig({
    autoConnect: true,
    publicClient,
    webSocketPublicClient,
  })
    export{ config};