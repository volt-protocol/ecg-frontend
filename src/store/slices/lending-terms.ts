// Libraries
import { LendingTerms, LendingTermsResponse } from "types/lending"
import { StateCreator } from "zustand"
import { HttpGet } from "utils/HttpHelper"

export interface LendingTermsSlice {
  lendingTerms: LendingTerms[]
  lastUpdatedTerms: number | null
  fetchLendingTerms: (marketId: number) => void
}

export const createLendingTermsSlice: StateCreator<LendingTermsSlice> = (set, get) => ({
  lendingTerms: [],
  lastUpdatedTerms: null,
  fetchLendingTerms: async (marketId: number) => {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL + `/markets/${marketId}/terms`
    const lendingTermsApiResponse = await HttpGet<LendingTermsResponse>(apiUrl);
    set({
          lendingTerms: lendingTermsApiResponse.terms, 
          lastUpdatedTerms: lendingTermsApiResponse.updated 
        })
  },
})
