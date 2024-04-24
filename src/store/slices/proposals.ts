// Libraries
import { LoansObj, LoansResponse } from 'types/lending';
import { StateCreator } from 'zustand';
import { HttpGet } from 'utils/HttpHelper';
import { getApiBaseUrl } from 'config';
import { Proposal, ProposalsApiResponse } from 'types/proposals';
import { sleep } from 'utils/utils';

export interface ProposalsSlice {
  proposals: Proposal[];
  lastUpdatedProposals: number | null;
  fetchProposals: (marketId: number, chainId: number) => Promise<void>;
  fetchProposalsUntilBlock: (block: number, marketId: number, chainId: number) => Promise<void>;
}

export const createProposalsSlice: StateCreator<ProposalsSlice> = (set, get) => ({
  proposals: [],
  lastUpdatedProposals: null,
  fetchProposals: async (marketId: number, chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/proposals`;
    const proposalsApiResponse = await HttpGet<ProposalsApiResponse>(apiUrl);
    set({
      proposals: proposalsApiResponse.proposals,
      lastUpdatedProposals: proposalsApiResponse.updated
    });
  },
  fetchProposalsUntilBlock: async (block: number, marketId: number, chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/proposals`;
    while (true) {
      const proposalsApiResponse = await HttpGet<ProposalsApiResponse>(apiUrl);
      if (proposalsApiResponse.updateBlock < block) {
        await sleep(2000);
        console.log(
          `fetchLendingTermsUntilBlock[${block}]: fetched data up to block ${proposalsApiResponse.updateBlock}, will retry`
        );
        continue;
      }
      console.log(
        `fetchLendingTermsUntilBlock[${block}]: success. Fetched data up to block ${proposalsApiResponse.updateBlock}`
      );
      set({
        proposals: proposalsApiResponse.proposals,
        lastUpdatedProposals: proposalsApiResponse.updated
      });

      break;
    }
  }
});
