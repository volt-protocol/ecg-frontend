import { StateCreator } from "zustand"
import { HttpGet } from "utils/HttpHelper"

export interface CoinSettings {
  address: string
  symbol: string
  decimals: number
  name: string,
  price: number
}

export interface CoinDetailsSlice {
  coinDetails: CoinSettings[]
  fetchCoins: () => Promise<any>
}

export const createCoinDetailsSlice: StateCreator<CoinDetailsSlice> = (set, get) => ({
  coinDetails: [],
  fetchCoins: async () => {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL + `/markets/${999999999}/tokens`
    const tokensReponse = await HttpGet<CoinSettings[]>(apiUrl);

    console.log('tokensResponse', JSON.stringify(tokensReponse, null, 2));
    set({ coinDetails: tokensReponse })
  },
})
