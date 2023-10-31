import { Button } from 'flowbite-react';
import React from 'react'
import { useRecoilState } from 'recoil';
import { lendingTermsAtom } from 'store';
import { preciseRound } from 'utils';

function OffBoardTerm({notUsed}:{notUsed:number}) {
  const [lendingTermsState, setLendingTermsState] =
  useRecoilState(lendingTermsAtom);
  const [selectedLoan, setSelectedLoan] = React.useState<any>();
  return (
    <div className="relative flex  pt-4 flex-col space-y-4">
        <div className="text-xl font-bold text-navy-700 dark:text-white">
        <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Offboard an Active Term
            </h2>
        </div>
        <div className='flex flex-row justify-between '>
        {lendingTermsState && lendingTermsState?.length > 0 && (
          <select
            value={selectedLoan?.address}
            onChange={(e) => {
              const selected = lendingTermsState.find((lendingTerm) => lendingTerm.address === e.target.value);
              setSelectedLoan(selected);
            }}
          >
            {lendingTermsState.map((loan) => (
              <option key={loan.label} value={loan.label}>
                {loan.label.split("-")[0]+"-"+loan.label.split("-")[1]+"-"+preciseRound(Number(loan.label.split("-")[2]),2)}
              </option>
            ))}
          </select>
        )}
        <Button className='bg-blueSecondary  rounded-2xl'>Propose Offboard</Button>
        </div>
        <div className='flex flex-row justify-between'>
          <p>
        Active Offboarding polls :
        </p>
        <p>
          Your GUILD voting weight : <strong>{preciseRound(notUsed,2)}</strong>
        </p>
        </div> 
      </div>

  )
}

export default OffBoardTerm