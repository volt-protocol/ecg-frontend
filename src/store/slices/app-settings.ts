import { SupportedMarket, marketsConfig } from 'config';
import { wagmiConfig } from 'contexts/Web3Provider';
import { Address } from 'viem';
import { StateCreator } from 'zustand';
import { GetUserPrefs, UpdateUserPrefsChainId, UpdateUserPrefsMarketId } from 'utils/UserPrefsHelper';

export interface AppSettingsSlice {
  appMarketId: number;
  appMarket: SupportedMarket;
  appChainId: number;
  searchFocused: boolean;
  searchHistory: Address[];
  setSearchFocused: (value: boolean) => void;
  addSearchHistory: (value: Address) => void;
  cleanSearchHistory: () => void;
  setAppMarket: (market: SupportedMarket) => void;
  setAppChainId: (chainId: number) => void;
}

export const createAppSettingsSlice: StateCreator<AppSettingsSlice> = (set, get) => {
  const userPrefs = GetUserPrefs();
  let chainId = userPrefs.chainId || wagmiConfig.chains[0].id;
  let marketId = userPrefs.marketId || marketsConfig[chainId][0].marketId;
  let market = (marketsConfig[chainId] || []).find((_) => _.marketId == marketId);
  if (!market) {
    chainId = wagmiConfig.chains[0].id;
    market = marketsConfig[chainId][0];
    marketId = market.marketId;
  }

  return {
    appChainId: chainId,
    appMarketId: marketId,
    appMarket: market,
    searchFocused: false,
    searchHistory: [],
    setAppMarket: (market: SupportedMarket) => {
      set({ appMarket: market });
      set({ appMarketId: market.marketId });
      UpdateUserPrefsChainId(market.networkId);
      UpdateUserPrefsMarketId(market.marketId);
    },
    setAppChainId: (chainId: number) => {
      const defaultMarket = marketsConfig[chainId][0];
      set({ appChainId: chainId, appMarket: defaultMarket, appMarketId: defaultMarket.marketId });
      UpdateUserPrefsChainId(chainId);
      UpdateUserPrefsMarketId(defaultMarket.marketId);
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
    }
  };
};
