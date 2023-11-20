'use client'

import { useEffect, useState } from "react"
import { useAppStore } from "store"

const StoreProvider = ({ children }: {
  children: React.ReactNode
}) => {
  const { fetchLendingTerms, fetchPrices, prices, lendingTerms } = useAppStore()
    const [mount, setMount] = useState(false)

  //Fetch lending terms
  useEffect(() => {
    fetchLendingTerms()
  }, [])

  //Fetch prices from Coinsgecko
  useEffect(() => {
    fetchPrices()
  }, [])

  return (
    <>{children}</>
  )
}

export default StoreProvider
