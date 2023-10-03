import React, { useEffect, useState } from 'react'
import CheckTable from '../default/components/CheckTable'
import { useRecoilState, useRecoilValue } from 'recoil';
import { lendingTermsAtom } from '../../../store/index';




function LendingTerms() {

const [lendingTermsState, setLendingTermsState] = useRecoilState(lendingTermsAtom);




  return (
    <div className='mt-3'>
    <CheckTable tableData={lendingTermsState} />
  </div>
  )
}

export default LendingTerms