"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "store"

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const { fetchLendingTerms, fetchPrices } = useAppStore()

  //Fetch prices
  useEffect(() => {
    fetchPrices()
  }, [])

  //Fetch lending terms
  useEffect(() => {
    fetchLendingTerms()
  }, [])


  return <>{children}</>
}

export default StoreProvider
