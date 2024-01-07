import { VoteLogs, MintRedeemLogs } from "types/governance"
import { Address } from "viem"
import { StateCreator } from "zustand"

export interface DashboardSlice {
  allLoans: any[]
  userData: any[]
  lastLoanUpdate: number | null
  creditMultiplier: bigint
  setAllLoans: (array: any[]) => void
  addUserLoans: (userAddress: Address, array: any[]) => void
  addLastVotes: (userAddress: Address, array: VoteLogs[]) => void
  addLastMints: (userAddress: Address, array: MintRedeemLogs[]) => void
  setLastLoanUpdate: (timestamp: number) => void
  setCreditMultiplier: (value: bigint) => void
}

export const createDashboardSlice: StateCreator<DashboardSlice> = (set, get) => ({
  creditMultiplier: 0,
  allLoans: [],
  userData: [],
  lastLoanUpdate: null,
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
  setCreditMultiplier: (value: bigint) => {
    set({ creditMultiplier: value })
  },
})
