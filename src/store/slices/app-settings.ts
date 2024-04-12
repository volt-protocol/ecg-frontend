import { SupportedMarket, marketsConfig } from 'config';
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
  appMarketId: marketsConfig[0].marketId,
  appMarket: marketsConfig[0],
  appChainId:
    process.env.NEXT_PUBLIC_APP_ENV === 'arbitrum'
      ? 42161
      : process.env.NEXT_PUBLIC_APP_ENV === 'production'
      ? 1
      : 11155111,
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
