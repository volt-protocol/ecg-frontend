import React, { useEffect } from 'react'
import TotalSpent from '../default/components/TotalSpent'
import Card from 'components/card'
import { Flowbite, Tabs } from 'flowbite-react'
import customTheme from 'customThemeFlowbite'
import { BsArrowDownLeft, BsArrowUpRight } from 'react-icons/bs'
import { Address, readContract } from '@wagmi/core'
import { guildAbi } from 'guildAbi'
import { useAccount } from 'wagmi'
import { DecimalToUnit } from 'utils'
import Delegate from './components/Delegate'
// import Delegate from './components/Delegate'

function Governance() {
  const { address, isConnected, isDisconnected } = useAccount()
  const [guildBalance, setGuildBalance] = React.useState(undefined)
  const [guildUsed, setGuildUsed] = React.useState(undefined)

  async function getGuildBalance(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_GUILD_ADDRESS as Address,
      abi: guildAbi,
      functionName: 'balanceOf',
      args: [address],
    })
    setGuildBalance(DecimalToUnit(result as bigint, 18))
  }
  async function getGuildUsed(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_GUILD_ADDRESS,
      abi: guildAbi,
      functionName: "getUserWeight",
      args: [address],
    });
    setGuildUsed(DecimalToUnit(result as bigint, 18));
  }

  useEffect(() => {
    if(isConnected){
      getGuildBalance()
      getGuildUsed()
    }
  }, [isConnected])


  const lineChartDataDebtCeiling = [
    {
      name: "DebCeiling",
      data: [50, 64, 48, 66, 49, 68],
      color: "#4318FF",
    },
    {
      name: "Utilization",
      data: [30, 40, 24, 46, 20, 46],
      color: "#6AD2FF",
    },
  ];

  return (
    <div className="space-y-5">
     <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
        <TotalSpent name="utilization/cap vs time" percentage="2.45%" data={lineChartDataDebtCeiling} /> 
        <TotalSpent name="Earning vs time" percentage="2.45%" data={lineChartDataDebtCeiling} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
      <Card extra="order-4" >
          <div className=" rounded-xl">
          <h2 className="ml-4 text-left text-xl font-bold mt-6 text-black dark:text-white">Delegate CREDIT</h2>
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
                    title="Delegate GUILD"
                  >
                    <Delegate
                      textButton="delegate"
                      balance={guildBalance}
                      used={guildUsed}
                    ></Delegate>
                  </Tabs.Item>
                  <Tabs.Item icon={BsArrowDownLeft} title="Undelegate GUILD">
                    <Delegate
                      textButton="UnDelegate"
                      balance={guildBalance}
                      used={guildUsed}
            
                    ></Delegate>
                  </Tabs.Item>
                </Tabs.Group>
              </Flowbite>
            </div>
          </div>
          </div>
        </Card>
    </div>
    </div>
  )
}

export default Governance