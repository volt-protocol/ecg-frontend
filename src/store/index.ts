import { create } from "zustand"
import {
  LendingTermsSlice,
  createLendingTermsSlice,
} from "./slices/lending-terms"
import {
  PairPricesSlice,
  createPairPricesSlice,
} from "./slices/pair-prices"
import {
  ContractsListSlice,
  createContractsListSlice,
} from "./slices/contracts-list"
import {
  AppSettingsSlice,
  createAppSettingsSlice,
} from "./slices/app-settings"
import {
  DashboardSlice,
  createDashboardSlice,
} from "./slices/dashboard"
import { persist } from "zustand/middleware"

type StoreState = LendingTermsSlice & PairPricesSlice & AppSettingsSlice & DashboardSlice & ContractsListSlice

export const useAppStore = create<StoreState, any>(
  persist(
    (...a) => ({
      ...createLendingTermsSlice(...a),
      ...createPairPricesSlice(...a),
      ...createAppSettingsSlice(...a),
      ...createDashboardSlice(...a),
      ...createContractsListSlice(...a),
    }),
    {
      name: "app-storage", // name of the item in the storage (must be unique)
    }
  )
)
