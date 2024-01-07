import { Address } from "viem"
import { StateCreator } from "zustand"

export interface AppSettingsSlice {
  searchFocused: boolean,
  termsAccepted: boolean,
  searchHistory: Address[],
  setTermsAccepted: (value: boolean) => void,
  setSearchFocused: (value: boolean) => void,
  addSearchHistory: (value: Address) => void,
  cleanSearchHistory: () => void,
}

export const createAppSettingsSlice: StateCreator<AppSettingsSlice> = (set, get) => ({
  searchFocused: false,
  termsAccepted: false,
  searchHistory: [],
  addSearchHistory: (value: Address) => {
    const history = get().searchHistory
    if (history.includes(value)) {
      return
    }
    set({ searchHistory: [value, ...history] })
  },
  cleanSearchHistory: () => {
    set({ searchHistory: [] })
  },
  setTermsAccepted: () => {
    set({ termsAccepted: true })
  },
  setSearchFocused: (value: boolean) => {
    set({ searchFocused: value })
  },
})
