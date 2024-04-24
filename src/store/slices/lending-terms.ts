// Libraries
import { LendingTerms, LendingTermsResponse } from 'types/lending';
import { StateCreator } from 'zustand';
import { HttpGet } from 'utils/HttpHelper';
import { getApiBaseUrl } from 'config';
import { sleep } from 'utils/utils';

export interface LendingTermsSlice {
  lendingTerms: LendingTerms[];
  lastUpdatedTerms: number | null;
  fetchLendingTerms: (marketId: number, chainId: number) => Promise<void>;
  fetchLendingTermsUntilBlock: (block: number, marketId: number, chainId: number) => Promise<void>;
}

export const createLendingTermsSlice: StateCreator<LendingTermsSlice> = (set, get) => ({
  lendingTerms: [],
  lastUpdatedTerms: null,
  fetchLendingTerms: async (marketId: number, chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/terms`;
    const lendingTermsApiResponse = await HttpGet<LendingTermsResponse>(apiUrl);
    set({
      lendingTerms: lendingTermsApiResponse.terms,
      lastUpdatedTerms: lendingTermsApiResponse.updated
    });
  },
  fetchLendingTermsUntilBlock: async (block: number, marketId: number, chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/terms`;
    while (true) {
      const lendingTermsApiResponse = await HttpGet<LendingTermsResponse>(apiUrl);
      if (lendingTermsApiResponse.updateBlock < block) {
        await sleep(2000);
        console.log(
          `fetchLendingTermsUntilBlock[${block}]: fetched data up to block ${lendingTermsApiResponse.updateBlock}, will retry`
        );
        continue;
      }
      console.log(
        `fetchLendingTermsUntilBlock[${block}]: success. Fetched data up to block ${lendingTermsApiResponse.updateBlock}`
      );
      set({
        lendingTerms: lendingTermsApiResponse.terms,
        lastUpdatedTerms: lendingTermsApiResponse.updated
      });

      break;
    }
  }
});
