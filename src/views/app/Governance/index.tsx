import React from 'react'
import TotalSpent from '../default/components/TotalSpent'
import Card from 'components/card'
import { Flowbite, Tabs } from 'flowbite-react'
import customTheme from 'customThemeFlowbite'
import { BsArrowUpRight } from 'react-icons/bs'
// import Delegate from './components/Delegate'

function Governance() {
  return (
    <div className='mt-10'>
     <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <TotalSpent name="utilization/cap vs time" percentage="2.45%" />
        <TotalSpent name="Earning vs time" percentage="2.45%" />
      </div>
      {/* <Card extra="order-4" >
          <div className="  rounded-xl">
          <h2 className="text-center text-3xl font-bold mt-6 text-black dark:text-white">Stake CREDIT</h2>
          <div className=" mt-8 space-y-8">
            <div className="rounded-xl ">
              <Flowbite theme={{ theme: customTheme }}>
                <Tabs.Group
                  aria-label="Tabs with underline"
                  style="underline"
                  className="text-white"
                >
                  <Tabs.Item
                    active
                    className=""
                    icon={BsArrowUpRight}
                    title="Stake Credit"
                  >
                    <Delegate
                      textButton="delegate"
                      allocatedCredit={creditAllocated}
                      availableCredit={creditAvailable}
                    ></Delegate>
                  </Tabs.Item>
                  <Tabs.Item icon={BsArrowDownLeft} title="UnDelegate Credit">
                    <Delegate
                      textButton="UnDelegate"
                      allocatedCredit={creditAllocated}
                      availableCredit={creditAvailable}
            
                    ></Delegate>
                  </Tabs.Item>
                </Tabs.Group>
              </Flowbite>
            </div>
          </div>
          </div>
        </Card> */}
    
    </div>
  )
}

export default Governance