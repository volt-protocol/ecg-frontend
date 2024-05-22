'use client';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { cookieStorage, createStorage, http, createConfig, WagmiProvider, State } from 'wagmi';
import { mainnet, sepolia, arbitrum } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';

// 0. Setup queryClient
const queryClient = new QueryClient();

const metadata = {
  name: 'Credit Guild',
  description: 'Credit Guild',
  url: 'https://web3modal.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
  verifyUrl: 'https://web3modal.com/verify'
};

//Add available chains here
const chains = [arbitrum, sepolia, mainnet] as const;
// process.env.NEXT_PUBLIC_APP_ENV === "arbitrum" ? ([arbitrum] as const)
// : process.env.NEXT_PUBLIC_APP_ENV === "production"
//   ? ([mainnet] as const)
//   : ([sepolia] as const)

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

//Add RPC endpoints for available chains here
export const wagmiConfig = createConfig({
  chains,
  transports: {
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)
  },
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: false }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0]
    })
  ],
  storage: createStorage({
    storage: cookieStorage
  })
});

// 3. Create modal
createWeb3Modal({
  wagmiConfig,
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains,
  themeMode: 'light',
  termsConditionsUrl: '/terms-conditions',
  privacyPolicyUrl: '/risk-statement',
  themeVariables: {
    '--w3m-accent': '#4ab8a6'
  }
});

export const Web3Provider = ({ children }: { children: React.ReactNode; initialState?: State }) => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </WagmiProvider>
);

export default Web3Provider;
