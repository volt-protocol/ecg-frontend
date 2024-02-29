"use client"

import Spinner from "components/spinner"
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
    lendingTerms,
  } = useAppStore()

  //Note: when several chains will be supported, reload the data when the appChainId changes
  useEffect(() => {
    //fetch collateral prices
    fetchPrices()
    //fetch historical data
    fetchHistoricalData()

    const asyncCall = async () => {
      //fetch contract addresses for a given chain
      const list = await fetchContractsList(appChainId)

      //fetch lending terms
      fetchLendingTerms(list)
    }

    asyncCall()
  }, [])

  if (!contractsList || !lendingTerms) {
    return (
      <div className="absolute bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 transform">
        <Spinner />
      </div>
    )
  }

  return <>{children}</>
}

export default StoreProvider
