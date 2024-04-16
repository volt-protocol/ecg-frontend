import { create } from 'zustand';
import { LendingTermsSlice, createLendingTermsSlice } from './slices/lending-terms';
import { AuctionsSlice, createAuctionsSlice } from './slices/auctions';
import { CoinDetailsSlice, createCoinDetailsSlice } from './slices/coin-details';
import { ContractsListSlice, createContractsListSlice } from './slices/contracts-list';
import { AppSettingsSlice, createAppSettingsSlice } from './slices/app-settings';
import { TosSlice, createTosSlice } from './slices/tos';
import { DashboardSlice, createDashboardSlice } from './slices/dashboard';
import { persist } from 'zustand/middleware';

type StoreState = LendingTermsSlice &
  AuctionsSlice &
  CoinDetailsSlice &
  AppSettingsSlice &
  DashboardSlice &
  ContractsListSlice;

type TosState = TosSlice

export const useAppStore = create<StoreState, any>(
  persist(
    (...a) => ({
      ...createLendingTermsSlice(...a),
      ...createAuctionsSlice(...a),
      ...createCoinDetailsSlice(...a),
      ...createAppSettingsSlice(...a),
      ...createDashboardSlice(...a),
      ...createContractsListSlice(...a)
    }),
    {
      name: 'app-storage' // name of the item in the storage (must be unique)
    }
  ),
);

export const useTosStore = create<TosState, any>(
  persist(
    (...a) => ({
      ...createTosSlice(...a),
    }),
    {
      name: 'tos-storage' // name of the item in the storage (must be unique)
    }
  ),
);
