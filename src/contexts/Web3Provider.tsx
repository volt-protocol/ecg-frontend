"use client"
import { createWeb3Modal } from "@web3modal/wagmi/react"
import { cookieStorage, createStorage, http, createConfig, WagmiProvider, State } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { walletConnect, injected, coinbaseWallet } from "wagmi/connectors"

// 0. Setup queryClient
const queryClient = new QueryClient()

const metadata = {
  name: "ECG Guild",
  description: "ECG Guild",
  url: "https://web3modal.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
  verifyUrl: "https://web3modal.com/verify",
}

const chains =
  process.env.NEXT_PUBLIC_APP_ENV === "production"
    ? ([mainnet] as const)
    : ([sepolia] as const)
    
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID

export const wagmiConfig = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_MAINNET}`
    ),
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_SEPOLIA}`
    ),
  },
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: false }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
})

// 3. Create modal
createWeb3Modal({
  wagmiConfig,
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains,
  themeMode: "light",
  termsConditionsUrl: "/terms-conditions",
  privacyPolicyUrl: "/risk-statement",
  themeVariables: {
    "--w3m-accent": "#4ab8a6",
  },
})

export const Web3Provider = ({
  children
}: {
  children: React.ReactNode
  initialState?: State
}) => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  </WagmiProvider>
)

export default Web3Provider
