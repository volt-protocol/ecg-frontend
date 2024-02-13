"use client"

import { useEffect } from "react"
import { useAppStore } from "store"

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const { fetchLendingTerms, fetchPrices, fetchHistoricalData } = useAppStore()

  useEffect(() => {
    //fetch collateral prices
    fetchPrices()
    //fetch lending terms
    fetchLendingTerms()
    //fetch historical data
    fetchHistoricalData()
  }, [])

  return <>{children}</>
}

export default StoreProvider
