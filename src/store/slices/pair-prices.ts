import { StateCreator } from "zustand"
import axios, { AxiosResponse } from "axios"

export type CoinGeckoName = {
  nameECG: string
  nameCG: string
  logo: string
}

export const coinsList: CoinGeckoName[] = [
  {
    nameECG: "gUSDC",
    nameCG: "geist-usdc",
    logo: "/img/crypto-logos/usdc.png",
  },
  {
    nameECG: "USDC",
    nameCG: "usd-coin",
    logo: "/img/crypto-logos/usdc.png",
  },
  {
    nameECG: "sDAI",
    nameCG: "savings-dai",
    logo: "/img/crypto-logos/dai.png",
  },
  {
    nameECG: "WBTC",
    nameCG: "bitcoin",
    logo: "/img/crypto-logos/btc.png",
  },
]

const BASE_URL = process.env.NEXT_PUBLIC_COINGECKO_API_URL

export interface PairPricesSlice {
  prices: number[]
  fetchPrices: () => Promise<any>
}

export const createPairPricesSlice: StateCreator<PairPricesSlice> = (set, get) => ({
  prices: [],
  fetchPrices: async () => {
    const res: AxiosResponse<any, any> = await axios.get(
      BASE_URL +
        `/simple/price?ids=${coinsList.map(
          (coin) => coin.nameCG + ","
        )}&vs_currencies=usd`
    )

    set({ prices: res.data })
  },
})
