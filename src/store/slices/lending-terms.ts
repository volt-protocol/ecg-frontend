// Libraries
import { LendingTerms, LendingTermsResponse } from "types/lending"
import { StateCreator } from "zustand"
import { HttpGet } from "utils/HttpHelper"
import { getApiBaseUrl } from "config"

export interface LendingTermsSlice {
  lendingTerms: LendingTerms[]
  lastUpdatedTerms: number | null
  fetchLendingTerms: (marketId: number, chainId: number) => void
}

export const createLendingTermsSlice: StateCreator<LendingTermsSlice> = (set, get) => ({
  lendingTerms: [],
  lastUpdatedTerms: null,
  fetchLendingTerms: async (marketId: number, chainId: number) => {
   const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/terms`
    const lendingTermsApiResponse = await HttpGet<LendingTermsResponse>(apiUrl);
    set({
          lendingTerms: lendingTermsApiResponse.terms, 
          lastUpdatedTerms: lendingTermsApiResponse.updated 
        })
  },
})
