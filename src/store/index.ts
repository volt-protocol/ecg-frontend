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
import { AirdropDataSlice, createAirdropDataSlice } from './slices/airdrop-data';
import { ProposalsSlice, createProposalsSlice } from './slices/proposals';
import { ProposalsParamsSlice, createProposalsParamsSlice } from './slices/proposals-params';

type StoreState = LendingTermsSlice &
  LoansSlice &
  AuctionsSlice &
  CoinDetailsSlice &
  DashboardSlice &
  ContractsListSlice &
  ProtocolDataSlice &
  AirdropDataSlice &
  ProposalsSlice &
  ProposalsParamsSlice;

type TosState = TosSlice;

type UserPrefsState = AppSettingsSlice;

export const useAppStore = create<StoreState, any>((...a) => ({
  ...createLendingTermsSlice(...a),
  ...createLoansSlice(...a),
  ...createAuctionsSlice(...a),
  ...createCoinDetailsSlice(...a),
  ...createDashboardSlice(...a),
  ...createContractsListSlice(...a),
  ...createProtocolDataSlice(...a),
  ...createAirdropDataSlice(...a),
  ...createProposalsSlice(...a),
  ...createProposalsParamsSlice(...a)
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

export const useUserPrefsStore = create<UserPrefsState, any>(
  persist(
    (...a) => ({
      ...createAppSettingsSlice(...a)
    }),
    {
      name: 'user-prefs-storage' // name of the item in the storage (must be unique)
    }
  )
);
