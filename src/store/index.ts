import { create } from "zustand"
import {
  LendingTermsSlice,
  createLendingTermsSlice,
} from "./slices/lending-terms"
import {
  PairPricesSlice,
  createPairPricesSlice,
} from "./slices/pair-prices"
import { persist } from "zustand/middleware"

type StoreState = LendingTermsSlice & PairPricesSlice

export const useAppStore = create<StoreState, any>(
  persist(
    (...a) => ({
      ...createLendingTermsSlice(...a),
      ...createPairPricesSlice(...a)
    }),
    {
      name: "app-storage", // name of the item in the storage (must be unique)
    }
  )
)
