"use client"

import "@rainbow-me/rainbowkit/styles.css"
import merge from "lodash.merge"
import {
  darkTheme,
  getDefaultWallets,
  lightTheme,
  RainbowKitProvider,
  Theme,
} from "@rainbow-me/rainbowkit"
import {
  createConfig,
  configureChains,
  mainnet,
  sepolia,
  Chain,
  WagmiConfig,
} from "wagmi"
import { publicProvider } from "wagmi/providers/public"
import { alchemyProvider } from "wagmi/providers/alchemy"

const chainsList: Chain[] = []
process.env.NEXT_PUBLIC_APP_ENV == "production"
  ? chainsList.push(mainnet)
  : chainsList.push(sepolia)

const { chains, publicClient, webSocketPublicClient } = configureChains(chainsList, [
  alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_SEPOLIA }),
  publicProvider(),
])

const { connectors } = getDefaultWallets({
  appName: "Credit Guild",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains,
})

const myCustomTheme = merge(lightTheme(), {
  colors: {
    accentColor: "#4ab8a6"
  },
  shadows: {
    connectButton: "none",
  },
  radii: {
    connectButton: "0.375rem",
  },
} as Theme)

const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
})

export const Web3Provider = ({ children }: { children: React.ReactNode }) => (
  <WagmiConfig config={config}>
    <RainbowKitProvider
      chains={chains}
      theme={myCustomTheme}
      // showRecentTransactions={true}
    >
      {children}
    </RainbowKitProvider>
  </WagmiConfig>
)

export default Web3Provider
