"use client"

import { useEffect } from "react"
import { useAppStore } from "store"

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    fetchLendingTerms,
    fetchPrices,
    fetchHistoricalData,
    fetchContractsList,
    appChainId,
    contractsList,
  } = useAppStore()

  useEffect(() => {
    //fetch collateral prices
    fetchPrices()

    //fetch historical data
    fetchHistoricalData()
  }, [])

  useEffect(() => {
    //fetch contract addresses for a given chain
    console.log("appChainId", appChainId)
    fetchContractsList(appChainId)
  }, [appChainId])

  useEffect(() => {
    //fetch lending terms
    contractsList && fetchLendingTerms(contractsList)
  }, [contractsList])

  if(!contractsList) return null

  return <>{children}</>
}

export default StoreProvider
