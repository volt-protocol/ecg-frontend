import React from 'react'
import TotalSpent from '../default/components/TotalSpent'

function Governance() {
  return (
    <div className='mt-10'>
     <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <TotalSpent name="utilization/cap vs time" percentage="2.45%" />
        <TotalSpent name="Earning vs time" percentage="2.45%" />
      </div>
    
    </div>
  )
}

export default Governance