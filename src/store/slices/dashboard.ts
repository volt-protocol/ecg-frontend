import axios, { AxiosResponse } from "axios"
import { getApiBaseUrl } from "config"
import { MintRedeemLogs } from "lib/logs/mint-redeem"
import { VoteLogs } from "lib/logs/votes"
import { useAppStore } from "store"
import { formatDecimal } from "utils/numbers"
import { Address } from "viem"
import { StateCreator } from "zustand"


const getCreditSupply = async (marketId: number, chainId: number) => {
  const res: AxiosResponse<any, any> = await axios.get(
    getApiBaseUrl(chainId) + `/history/CreditSupply?marketId=${marketId}`
  )
  const formattedValues = res.data.values.map((item) => {
    return Number(item)
  })

  const formattedTimestamps = res.data.timestamps.map((item) => {
    return item * 1000
  })

  return {
    values: formattedValues,
    timestamps: formattedTimestamps,
  }
}

const getCreditTotalIssuance = async (marketId: number, chainId: number) => {
  const res: AxiosResponse<any, any> = await axios.get(
    getApiBaseUrl(chainId) + `/history/CreditTotalIssuance?marketId=${marketId}`
  )

  const formattedValues = res.data.values.map((item) => {
    return Number(item)
  })

  const formattedTimestamps = res.data.timestamps.map((item) => {
    return item * 1000
  })

  return {
    values: formattedValues,
    timestamps: formattedTimestamps,
  }
}

const getAverageInterestRate = async (marketId: number, chainId: number) => {
  const res: AxiosResponse<any, any> = await axios.get(
    getApiBaseUrl(chainId) + `/history/AverageInterestRate?marketId=${marketId}`
  )

  const formattedValues = res.data.values.map((item) => {
    return (Number(item) * 100).toFixed(2)
  })

  const formattedTimestamps = res.data.timestamps.map((item) => {
    return item * 1000
  })

  return {
    values: formattedValues,
    timestamps: formattedTimestamps,
  }
}

const getTVL = async (marketId: number, chainId: number) => {
  const res: AxiosResponse<any, any> = await axios.get(
    getApiBaseUrl(chainId) + `/history/TVL?marketId=${marketId}`
  )

  const formattedValues = res.data.values.map((item) => {
    return formatDecimal(Number(item), 2)
  })

  const formattedTimestamps = res.data.timestamps.map((item) => {
    return item * 1000
  })

  return {
    values: formattedValues,
    timestamps: formattedTimestamps,
  }
}

export interface HistoricalData {
  creditSupply: { values: string[]; timestamps: string[] }
  creditTotalIssuance: { values: string[]; timestamps: string[] }
  averageInterestRate: { values: string[]; timestamps: string[] }
  tvl: { values: string[]; timestamps: string[] }
}

export interface DashboardSlice {
  allLoans: any[]
  userData: any[]
  lastLoanUpdate: number | null
  historicalData: HistoricalData
  setAllLoans: (array: any[]) => void
  addUserLoans: (userAddress: Address, array: any[]) => void
  addLastVotes: (userAddress: Address, array: VoteLogs[]) => void
  addLastMints: (userAddress: Address, array: MintRedeemLogs[]) => void
  setLastLoanUpdate: (timestamp: number) => void
  fetchHistoricalData: (marketId: number, chainId: number) => void
}

export const createDashboardSlice: StateCreator<DashboardSlice> = (set, get) => ({
  allLoans: [],
  userData: [],
  lastLoanUpdate: null,
  historicalData: null,
  setAllLoans: (array) => set(() => ({ allLoans: [...array] })),
  addLastVotes: (userAddress, array) => {
    //check if user already exists
    const user = get().userData.find((item) => item.address === userAddress)
    if (!user) {
      set(() => ({
        userData: [
          { address: userAddress, lastVotes: [...array], lastUpdated: Date.now() },
          ...get().userData,
        ],
      }))
    } else {
      set(() => ({
        userData: [
          ...get().userData.filter((item) => item.address !== user.address),
          { ...user, lastVotes: [...array], lastUpdated: Date.now() },
        ],
      }))
    }
  },
  addLastMints: (userAddress, array) => {
    //check if user already exists

    const user = get().userData.find((item) => item.address === userAddress)
    if (!user) {
      set(() => ({
        userData: [
          ...get().userData,
          { address: userAddress, lastMints: [...array], lastUpdated: Date.now() },
        ],
      }))
    } else {
      set(() => ({
        userData: [
          ...get().userData.filter((item) => item.address !== user.address),
          { ...user, lastMints: [...array], lastUpdated: Date.now() },
        ],
      }))
    }
  },
  addUserLoans: (userAddress, array) => {
    //check if user already exists
    const user = get().userData.find((item) => item.address === userAddress)

    if (!user) {
      set(() => ({
        userData: [
          { address: userAddress, loans: [...array], lastUpdated: Date.now() },
          ...get().userData,
        ],
      }))
    } else {
      set(() => ({
        userData: [
          ...get().userData.filter((item) => item.address !== user.address),
          { ...user, loans: [...array], lastUpdated: Date.now() },
        ],
      }))
    }
  },
  setLastLoanUpdate: (timestamp) => set(() => ({ lastLoanUpdate: timestamp })),
  fetchHistoricalData: async (marketId: number, chainId: number) => {
    const creditSupplyData = await getCreditSupply(marketId, chainId)
    const creditTotalIssuanceData = await getCreditTotalIssuance(marketId, chainId)
    const averageInterestRateData = await getAverageInterestRate(marketId, chainId)
    const tvlData = await getTVL(marketId, chainId)

    const data = {
      creditSupply: creditSupplyData,
      creditTotalIssuance: creditTotalIssuanceData,
      averageInterestRate: averageInterestRateData,
      tvl: tvlData,
    }

    set({ historicalData: data })
  },
})
