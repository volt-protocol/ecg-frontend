// Libraries
import { LendingTerms, LendingTermsResponse } from "types/lending"
import { StateCreator } from "zustand"
import axios, { AxiosResponse } from "axios"

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

export interface LendingTermsSlice {
  lendingTerms: LendingTerms[]
  lastUpdatedTerms: number | null
  fetchLendingTerms: () => void;
}

export const createLendingTermsSlice: StateCreator<LendingTermsSlice> = (
  set,
  get
) => ({
  lendingTerms: [],
  lastUpdatedTerms: null,
  fetchLendingTerms: async () => {
    const res: AxiosResponse<LendingTermsResponse, any> = await axios.get(
      BASE_URL + "/views/lendingterms"
    )
    set({ lendingTerms: res.data.lendingTerms, lastUpdatedTerms: Date.now()})
  }
})
