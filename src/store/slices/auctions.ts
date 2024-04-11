// Libraries
import { StateCreator } from "zustand"
import { HttpGet } from "utils/HttpHelper"

export interface Auction {
  loanId: string;
  auctionHouseAddress: string;
  lendingTermAddress: string;
  status: AuctionStatus;
  startTime: number; // unix ms
  endTime: number; // unix ms
  collateralAmount: string;
  callDebt: string;
  callCreditMultiplier: string;
  collateralTokenAddress: string;
  collateralSold: string;
  debtRecovered: string;
  bidTxHash: string;
}

export interface AuctionHouse {
  address: string;
  midPoint: number;
  duration: number;
}

export enum AuctionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed'
}

export interface AuctionsApiReponse {
  updated: number;
  updatedHuman: string;
  auctions: Auction[];
  auctionHouses: AuctionHouse[];
}

export interface AuctionsSlice {
  auctionHouses: AuctionHouse[]
  auctions: Auction[]
  updated: number | null
  fetchAuctions: (marketId: number) => void
}

export const createAuctionsSlice: StateCreator<AuctionsSlice> = (set, get) => ({
  auctionHouses: [],
  auctions: [],
  updated: null,
  fetchAuctions: async (marketId: number) => {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL + `/markets/${marketId}/auctions`
    const response = await HttpGet<any>(apiUrl);
    set({
      auctionHouses: response.auctionHouses, 
      auctions: response.auctions, 
      updated: response.updated
    })
  },
})
