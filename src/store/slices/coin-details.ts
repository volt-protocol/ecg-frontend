import { StateCreator } from "zustand"
import axios, { AxiosResponse } from "axios"
import getToken from "lib/getToken"
import { coinsList } from "config"

const BASE_URL = process.env.NEXT_PUBLIC_COINGECKO_API_URL

export interface CoinSettings {
  address: string
  symbol: string
  decimals: number
  name: string
}

export interface CoinDetailsSlice {
  prices: number[]
  coinDetails: CoinSettings[]
  fetchCoins: () => Promise<any>
}

export const createCoinDetailsSlice: StateCreator<CoinDetailsSlice> = (set, get) => ({
  prices: [],
  coinDetails: [],
  fetchCoins: async () => {
    const res: AxiosResponse<any, any> = await axios.get(
      BASE_URL +
        `/simple/price?ids=${coinsList.map(
          (coin) => coin.nameCG + ","
        )}&vs_currencies=usd`
    )

    //fetch token details
    const getTokenDetails = async (tokenAddress: string) => {
      const token = await getToken(tokenAddress)
      return {
        address: tokenAddress,
        decimals: token[0].result,
        symbol: token[1].result,
        name: token[2].result,
      }
    }

    const tokenDetails = await Promise.all(
      coinsList.map(async (coin) => {
        return await getTokenDetails(coin.address)
      })
    )

    set({ coinDetails: tokenDetails })
    set({ prices: res.data })
  },
})
