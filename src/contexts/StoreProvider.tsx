"use client"

import Spinner from "components/spinner"
import { useEffect } from "react"
import { useAppStore } from "store"

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    fetchLendingTerms,
    fetchCoins,
    fetchHistoricalData,
    fetchContractsList,
    appMarketId,
    appChainId,
    contractsList
  } = useAppStore()

  //Note: when several chains will be supported, reload the data when the appChainId changes
  useEffect(() => {
    //fetch supported collateral coins prices and data
    fetchCoins(appMarketId)
    //fetch historical data
    fetchHistoricalData(appMarketId)
    fetchContractsList(appChainId)
    fetchLendingTerms(appMarketId)
    
  }, [appMarketId, appChainId])

  //make sure we have the contracts list before rendering the children
  if (!contractsList) {
    return (
      <div className="absolute bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 transform">
        <Spinner />
      </div>
    )
  }

  return <>{children}</>
}

export default StoreProvider
