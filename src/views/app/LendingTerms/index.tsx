import React, { useEffect, useState } from 'react'
import CheckTable from '../default/components/CheckTable'
import api from 'api'
import { AxiosResponse } from 'axios'



function LendingTerms() {

  const [currentLending, setCurrentLending] = useState<lendingTerms[] | any>([])

  useEffect(() => {
    async function getLendingTerms():Promise<void> {
    const currentLending:AxiosResponse<LendingTerms, any>=await api.lendingTerms.getCurrentLendingTerms()
    setCurrentLending(currentLending.data.lendingTerms)
    }
    getLendingTerms()
  }
  , [])

  interface LendingTerms{
    _id: string;
    key: string;
    lastUpdateTimestamp: number;
    lendingTerms: lendingTerms[];
  }

  type lendingTerms = {
    address: string;
    collateral: string;
    collateralAddress: string;
    collateralDecimals: number;
    interestRate: number;
    borrowRatio:number;
    callFee: number;
    callPeriodSeconds: number;
    availableDebt: number;
    currentDebt: number;
    openingFee: number; 
    minPartialRepayPercent: number;
    maxDelayBetweenPartialRepay: number;
    ltvBuffer: number;
    minBorrow: number;
  };


  return (
    <div className='mt-3'>
      
    <CheckTable tableData={currentLending} />
  </div>
  )
}

export default LendingTerms