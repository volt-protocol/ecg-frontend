// Libraries
import { LoansObj, LoansResponse } from 'types/lending';
import { StateCreator } from 'zustand';
import { HttpGet } from 'utils/HttpHelper';
import { getApiBaseUrl } from 'config';
import { sleep } from 'utils/utils';

export interface LoansSlice {
  loans: LoansObj[];
  lastUpdatedLoans: number | null;
  fetchLoans: (marketId: number, chainId: number) => Promise<void>;
  fetchLoansUntilBlock: (block: number, marketId: number, chainId: number) => Promise<void>;
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
  },
  fetchLoansUntilBlock: async (block: number, marketId: number, chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/loans`;
    while (true) {
      const response = await HttpGet<LoansResponse>(apiUrl);
      if (response.updateBlock < block) {
        await sleep(2000);
        console.log(`fetchLoansUntilBlock[${block}]: fetched data up to block ${response.updateBlock}, will retry`);
        continue;
      }
      console.log(`fetchLoansUntilBlock[${block}]: success. Fetched data up to block ${response.updateBlock}`);
      set({
        loans: response.loans,
        lastUpdatedLoans: response.updated
      });

      break;
    }
  }
});
