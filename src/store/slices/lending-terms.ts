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
  fetchLendingTerms: (contractsList: ContractsList) => void
}

export const createLendingTermsSlice: StateCreator<LendingTermsSlice> = (set, get) => ({
  lendingTerms: [],
  lastUpdatedTerms: null,
  fetchLendingTerms: async (contractsList: ContractsList) => {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL + `/markets/${999999999}/terms`
    const lendingTermsApiResponse = await HttpGet<LendingTermsResponse>(apiUrl);
    set({
          lendingTerms: lendingTermsApiResponse.terms, 
          lastUpdatedTerms: lendingTermsApiResponse.updated 
        })
  },
})
