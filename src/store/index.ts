import { create } from 'zustand';
import { LendingTermsSlice, createLendingTermsSlice } from './slices/lending-terms';
import { LoansSlice, createLoansSlice } from './slices/loans';
import { AuctionsSlice, createAuctionsSlice } from './slices/auctions';
import { CoinDetailsSlice, createCoinDetailsSlice } from './slices/coin-details';
import { ContractsListSlice, createContractsListSlice } from './slices/contracts-list';
import { AppSettingsSlice, createAppSettingsSlice } from './slices/app-settings';
import { TosSlice, createTosSlice } from './slices/tos';
import { DashboardSlice, createDashboardSlice } from './slices/dashboard';
import { persist } from 'zustand/middleware';
import { ProtocolDataSlice, createProtocolDataSlice } from './slices/protocol-data';
import { ProposalsSlice, createProposalsSlice } from './slices/proposals';

type StoreState = LendingTermsSlice &
  LoansSlice &
  AuctionsSlice &
  CoinDetailsSlice &
  AppSettingsSlice &
  DashboardSlice &
  ContractsListSlice &
  ProtocolDataSlice &
  ProposalsSlice;

type TosState = TosSlice;

export const useAppStore = create<StoreState, any>((...a) => ({
  ...createLendingTermsSlice(...a),
  ...createLoansSlice(...a),
  ...createAuctionsSlice(...a),
  ...createCoinDetailsSlice(...a),
  ...createAppSettingsSlice(...a),
  ...createDashboardSlice(...a),
  ...createContractsListSlice(...a),
  ...createProtocolDataSlice(...a),
  ...createProposalsSlice(...a)
}));

export const useTosStore = create<TosState, any>(
  persist(
    (...a) => ({
      ...createTosSlice(...a)
    }),
    {
      name: 'tos-storage' // name of the item in the storage (must be unique)
    }
  )
);
