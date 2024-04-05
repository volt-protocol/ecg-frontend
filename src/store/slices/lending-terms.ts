// Libraries
import { LendingTerms, LendingTermsResponse } from "types/lending"
import { StateCreator } from "zustand"
import { getTermsLogs } from "lib/logs/terms"
import { Abi, Address, formatUnits } from "viem"
import { formatDecimal } from "utils/numbers"
import getToken from "lib/getToken"
import { TermABI } from "lib/contracts"
import { readContracts } from "@wagmi/core"
import { coinsList } from "config"
import { wagmiConfig } from "contexts/Web3Provider"
import { ContractsList } from "./contracts-list"
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
