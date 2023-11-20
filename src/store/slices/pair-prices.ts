// Libraries
import { LendingTerms, LendingTermsResponse } from "types/lending"
import { StateCreator } from "zustand"
import axios, { AxiosResponse } from "axios"

    const nameCoinGecko:CoinGeckoName[]=[{
      nameECG:"USDC",
      nameCG:"usd-coin",
    },{
      nameECG:"DAI",
      nameCG:"dai",
    },
  {
    nameECG: "WBTC",
    nameCG:"bitcoin",
  }]

const BASE_URL = process.env.NEXT_PUBLIC_COINGECKO_API_URL

export interface PairPricesSlice {
  prices: []
  fetchPrices: () => Promise<any>
}

export const createPairPricesSlice: StateCreator<PairPricesSlice> = (
  set,
  get
) => ({
  prices: [],
  fetchPrices: async () => {
    const res: AxiosResponse<any, any> = await axios.all(nameCoinGecko.map((coin) => axios.get(
      BASE_URL + `/simple/price?ids=${coin.nameCG}&vs_currencies=usd`
    )))
    set({ prices: res.map((item) => item.data) })
  },
})
