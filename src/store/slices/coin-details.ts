import { StateCreator } from 'zustand';
import { HttpGet } from 'utils/HttpHelper';
import { getApiBaseUrl } from 'config';

export interface CoinSettings {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  price: number;
}

export interface CoinDetailsSlice {
  coinDetails: CoinSettings[];
  fetchCoins: (marketId: number, chainId: number) => Promise<any>;
}

export const createCoinDetailsSlice: StateCreator<CoinDetailsSlice> = (set, get) => ({
  coinDetails: [],
  fetchCoins: async (marketId: number, chainId: number) => {
    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/tokens`;
    const tokensReponse = await HttpGet<CoinSettings[]>(apiUrl);

    // console.log('tokensResponse', JSON.stringify(tokensReponse, null, 2));
    set({ coinDetails: tokensReponse });
  }
});
