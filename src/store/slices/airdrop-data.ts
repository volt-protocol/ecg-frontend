// Libraries
import { getApiBaseUrl } from 'config';
import { HttpGet } from 'utils/HttpHelper';
import { StateCreator } from 'zustand';

export interface AirdropData {
  rebasingSupplyUsd: number;
  termSurplusBufferUsd: number;
  totalIssuanceUsd: number;
}

export interface AirdropDataSlice {
  rebasingSupplyUsd: number;
  termSurplusBufferUsd: number;
  totalIssuanceUsd: number;
  marketUtilization: { [marketId: number]: number };
  marketTVL: { [marketId: number]: number };
  fetchAirdropData: (chainId: number) => Promise<void>;
}

export const createAirdropDataSlice: StateCreator<AirdropDataSlice> = (set, get) => ({
  rebasingSupplyUsd: 0,
  termSurplusBufferUsd: 0,
  totalIssuanceUsd: 0,
  fetchAirdropData: async (chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/protocol/airdropdata`;
    const res = await HttpGet<any>(apiUrl);
    set({
      airdropData: res
    });
  }
});
