// Libraries
import { StateCreator } from 'zustand';
import { HttpGet } from 'utils/HttpHelper';
import { getApiBaseUrl } from 'config';
import { ProposalParams, ProposalsParamsApiResponse } from 'types/proposals';
import { sleep } from 'utils/utils';

export interface ProposalsParamsSlice {
  proposalsParams: ProposalParams[];
  lastUpdatedProposals: number | null;
  fetchProposalsParams: (marketId: number, chainId: number) => Promise<void>;
  fetchProposalsParamsUntilBlock: (block: number, marketId: number, chainId: number) => Promise<void>;
}

export const createProposalsParamsSlice: StateCreator<ProposalsParamsSlice> = (set, get) => ({
  proposalsParams: [],
  lastUpdatedProposals: null,
  fetchProposalsParams: async (marketId: number, chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/proposalsParams`;
    const apiResponse = await HttpGet<ProposalsParamsApiResponse>(apiUrl);
    console.log('GET', apiUrl, apiResponse);
    set({
      proposalsParams: apiResponse.proposals,
      lastUpdatedProposals: apiResponse.updated
    });
  },
  fetchProposalsParamsUntilBlock: async (block: number, marketId: number, chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/proposalsParams`;
    while (true) {
      const apiResponse = await HttpGet<ProposalsParamsApiResponse>(apiUrl);
      if (apiResponse.updateBlock < block) {
        await sleep(2000);
        console.log(
          `fetchLendingTermsUntilBlock[${block}]: fetched data up to block ${apiResponse.updateBlock}, will retry`
        );
        continue;
      }
      console.log(
        `fetchLendingTermsUntilBlock[${block}]: success. Fetched data up to block ${apiResponse.updateBlock}`
      );
      set({
        proposalsParams: apiResponse.proposals,
        lastUpdatedProposals: apiResponse.updated
      });

      break;
    }
  }
});
