import React, { useEffect } from 'react'
import TotalSpent from '../default/components/TotalSpent'
import Card from 'components/card'
import { Address, useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { creditAbi } from 'guildAbi';
import { readContract, waitForTransaction, writeContract } from '@wagmi/core';
import { DecimalToUnit } from 'utils';
import { toastError, toastRocket } from 'toast';
import SpinnerLoader from 'components/spinner';

function SavingRate() {
  const [creditAvailable, setCreditAvailable] = React.useState(0);
  const { address, isConnected, isDisconnected } = useAccount();
  const [loading, setLoading] = React.useState(false);
  
  useEffect(() => {
    async function getCreditAvailable():Promise<void> {
      const result = await readContract({
        address:import.meta.env.VITE_CREDIT_ADDRESS as Address,
        abi: creditAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setCreditAvailable(DecimalToUnit(result as bigint,18));
    } 
    if (isConnected) {
      getCreditAvailable();
    }else
    setCreditAvailable(0)
  }, [isConnected]);

  async function saving(rebaseMode:string):Promise<void> {
    try{
      setLoading(true)
    const { hash } = await writeContract({
      address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
      abi: creditAbi,
      functionName: rebaseMode,
    })
    const checkStartSaving = await waitForTransaction({
      hash: hash,
    })
    if (checkStartSaving.status != 'success') {
      toastError(rebaseMode==="enterRebase"? 'Start Saving transaction failed':'Stop Saving transaction failed')
      setLoading(false)
      return
    }
    toastRocket(rebaseMode=== "enterRebase"? 'Start Saving transaction success' : 'Stop Saving transaction success')
    setLoading(false)
  } catch (error) {
    toastError(rebaseMode ==="enterRebase" ?  'Start Saving transaction failed' : 'Stop Saving transaction failed')
    setLoading(false)
    console.log(error)

  }
}

  
  return (
    <div className='mt-10 space-y-10'>
      {loading && <SpinnerLoader />}
       <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-1">
        <TotalSpent name="Earning/Drawddowns" percentage="2.45%" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
      <Card extra='space-y-5 p-4'> 
        <p className='font-semibold mt-5'>Your current CREDIT balance is {creditAvailable} </p>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 gap-x-10 font-semibold text-white">
        <button onClick={()=>saving("enterRebase")} className='bg-primary rounded-lg'>Start Saving</button>
        <button onClick={()=>saving("exitRebase")} className='bg-red-500 rounded-lg'>Stop Saving</button>
        </div>
      </Card>
    </div>
    </div>
  )
}

export default SavingRate