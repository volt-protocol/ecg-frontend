import { SupportedMarket, marketsConfig } from 'config';
import { wagmiConfig } from 'contexts/Web3Provider';
import { Address } from 'viem';
import { StateCreator } from 'zustand';

export interface AppSettingsSlice {
  appMarketId: number;
  appMarket: SupportedMarket;
  appChainId: number;
  searchFocused: boolean;
  termsAccepted: boolean;
  searchHistory: Address[];
  setTermsAccepted: (value: boolean) => void;
  setSearchFocused: (value: boolean) => void;
  addSearchHistory: (value: Address) => void;
  cleanSearchHistory: () => void;
  setAppMarket: (market: SupportedMarket) => void;
  setAppChainId: (chainId: number) => void;
}

export const createAppSettingsSlice: StateCreator<AppSettingsSlice> = (set, get) => ({
  appChainId: wagmiConfig.chains[0].id,
  appMarketId: marketsConfig[wagmiConfig.chains[0].id][0].marketId,
  appMarket: marketsConfig[wagmiConfig.chains[0].id][0],
  searchFocused: false,
  termsAccepted: false,
  searchHistory: [],
  setAppMarket: (market: SupportedMarket) => {
    console.log(`SET APP MARKET ${market.marketId}`);
    set({ appMarket: market });
    set({ appMarketId: market.marketId });
  },
  setAppChainId: (chainId: number) => {
    console.log('newchain id', chainId);
    set({ appChainId: chainId });
  },
  addSearchHistory: (value: Address) => {
    const history = get().searchHistory;
    if (history.includes(value)) {
      return;
    }
    set({ searchHistory: [value, ...history] });
  },
  cleanSearchHistory: () => {
    set({ searchHistory: [] });
  },
  setTermsAccepted: () => {
    set({ termsAccepted: true });
  },
  setSearchFocused: (value: boolean) => {
    set({ searchFocused: value });
  }
});
