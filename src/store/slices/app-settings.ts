import { SupportedMarket, marketsConfig } from 'config';
import { wagmiConfig } from 'contexts/Web3Provider';
import { GiValley } from 'react-icons/gi';
import { Address } from 'viem';
import { StateCreator } from 'zustand';

export interface AppSettingsSlice {
  useDarkMode: boolean | undefined;
  appMarketId: number;
  appMarket: SupportedMarket;
  appChainId: number;
  usePermit: boolean;
  searchFocused: boolean;
  searchHistory: Address[];
  setSearchFocused: (value: boolean) => void;
  addSearchHistory: (value: Address) => void;
  cleanSearchHistory: () => void;
  setAppMarket: (market: SupportedMarket) => void;
  setAppChainId: (chainId: number) => void;
  setDarkMode: (darkMode: boolean) => void;
  setUsePermit: (val: boolean) => void;
}

export const createAppSettingsSlice: StateCreator<AppSettingsSlice> = (set, get) => ({
  useDarkMode: undefined,
  appChainId: wagmiConfig.chains[0].id,
  appMarketId: marketsConfig[wagmiConfig.chains[0].id][0].marketId,
  appMarket: marketsConfig[wagmiConfig.chains[0].id][0],
  usePermit: true,
  searchFocused: false,
  searchHistory: [],
  setAppMarket: (market: SupportedMarket) => {
    set({ appMarket: market });
    set({ appMarketId: market.marketId });
  },
  setAppChainId: (chainId: number) => {
    const defaultMarket = marketsConfig[chainId][0];
    set({ appChainId: chainId, appMarket: defaultMarket, appMarketId: defaultMarket.marketId });
  },
  setUsePermit: (val: boolean) => {
    set({ usePermit: val });
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
  setSearchFocused: (value: boolean) => {
    set({ searchFocused: value });
  },
  setDarkMode: (value: boolean) => {
    set({ useDarkMode: value });
  }
});
