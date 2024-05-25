// Libraries
import { getApiBaseUrl } from 'config';
import { HttpGet } from 'utils/HttpHelper';
import { StateCreator } from 'zustand';

export interface AirdropData {
  rebasingSupplyUsd: number;
  termSurplusBufferUsd: number;
  totalIssuanceUsd: number;
  marketUtilization: { [marketId: number]: number };
  marketTVL: { [marketId: number]: number };
  marketDebt: { [marketId: number]: number };
}

export interface AirdropDataSlice {
  airdropData: AirdropData
  fetchAirdropData: (chainId: number) => Promise<void>;
}

export const createAirdropDataSlice: StateCreator<AirdropDataSlice> = (set, get) => ({
  airdropData: {
    rebasingSupplyUsd: 0,
    termSurplusBufferUsd: 0,
    totalIssuanceUsd: 0,
    marketUtilization: {},
    marketTVL: {},
    marketDebt: {}
  },
  fetchAirdropData: async (chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/protocol/airdropdata`;
    const res = await HttpGet<AirdropData>(apiUrl);
    set({
      airdropData: res
    });
  }
});
