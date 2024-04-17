// Libraries
import { LoansObj, LoansResponse } from 'types/lending';
import { StateCreator } from 'zustand';
import { HttpGet } from 'utils/HttpHelper';
import { getApiBaseUrl } from 'config';

export interface LoansSlice {
  loans: LoansObj[];
  lastUpdatedLoans: number | null;
  fetchLoans: (marketId: number, chainId: number) => Promise<void>;
}

export const createLoansSlice: StateCreator<LoansSlice> = (set, get) => ({
  loans: [],
  lastUpdatedLoans: null,
  fetchLoans: async (marketId: number, chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/loans`;
    const loansApiResponse = await HttpGet<LoansResponse>(apiUrl);
    set({
      loans: loansApiResponse.loans,
      lastUpdatedLoans: loansApiResponse.updated
    });
  }
});
