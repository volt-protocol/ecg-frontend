"use client"
import Disconnected from "components/error/disconnected"
import React, { useEffect } from "react"
import Card from "components/card"
import { Address, readContract } from "@wagmi/core"
import { CreditABI, GuildABI } from "lib/contracts"
import { useAccount } from "wagmi"
import { DecimalToUnit } from "utils/utils-old"
import Delegate from "./components/DelegateGuild"
import DelegateGuild from "./components/DelegateGuild"
import DelegateCredit from "./components/DelegateCredit"
import OffboardTerm from "./components/OffboardTerm"
import OnboardNewterm from "./components/OnboardNewTerm"
// import CreateNewTerm from "./components/CreateNewTerm";
// import OnboardTerm from "./components/OnboardTerm";
// import OffBoardTerm from "./components/OffboardTerm";
// import CurrentOnboardingProposals from "./components/CurrentOnboardingProposal";
// import CurrentOffboardingProposals from "./components/CurrentOffboardingProposals";
// import PendingSuccessfullProposals from "./components/PendingSuccessfulProposals";
// import Delegate from './components/Delegate'

export type Delegatee = {
  address: string
  votes: number
}

function Governance() {
  const { address, isConnected, isDisconnected } = useAccount()
  const [guildBalance, setGuildBalance] = React.useState(undefined)
  const [guildNotUsed, setGuildNotUsed] = React.useState(undefined)
  const [reloadGuild, setReloadGuild] = React.useState<boolean>(false)
  const [reloadCredit, setReloadCredit] = React.useState<boolean>(false)
  const [creditBalance, setCreditBalance] = React.useState(undefined)
  const [creditNotUsed, setCreditNotUsed] = React.useState(undefined)
  const [guildreceived, setGuildreceived] = React.useState(undefined)
  const [creditreceived, setCreditreceived] = React.useState(undefined)

  //TODO:  optimize contracts call with useContractReads

  async function getGuildBalance(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
      abi: GuildABI,
      functionName: "balanceOf",
      args: [address],
    })
    setGuildBalance(DecimalToUnit(result as bigint, 18))
  }
  async function getGuildNotUsed(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
      abi: GuildABI,
      functionName: "freeVotes",
      args: [address],
    })
    setGuildNotUsed(DecimalToUnit(result as bigint, 18))
  }
  async function getGuildreceived(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
      abi: GuildABI,
      functionName: "getVotes",
      args: [address],
    })
    setGuildreceived(DecimalToUnit(result as bigint, 18))
  }

  useEffect(() => {
    if (isConnected) {
      getGuildBalance()
      getGuildNotUsed()
      getGuildreceived()
      setReloadGuild(false)
    } else {
      setGuildBalance(undefined)
      setGuildNotUsed(undefined)
      setGuildreceived(undefined)
    }
  }, [isConnected, reloadGuild])

  async function getCreditBalance(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
      abi: CreditABI,
      functionName: "balanceOf",
      args: [address],
    })
    setCreditBalance(DecimalToUnit(result as bigint, 18))
  }
  async function getCreditNotUsed(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
      abi: CreditABI,
      functionName: "freeVotes",
      args: [address],
    })
    setCreditNotUsed(DecimalToUnit(result as bigint, 18))
  }
  async function getCreditreceived(): Promise<void> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
      abi: CreditABI,
      functionName: "getVotes",
      args: [address],
    })
    setCreditreceived(DecimalToUnit(result as bigint, 18))
  }

  useEffect(() => {
    if (isConnected) {
      getCreditBalance()
      getCreditNotUsed()
      getCreditreceived()
      setReloadCredit(false)
    } else {
      setCreditBalance(undefined)
      setCreditNotUsed(undefined)
      setCreditreceived(undefined)
    }
  }, [isConnected, reloadCredit])

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
  ]

  if (!isConnected) {
    return <Disconnected />
  }

  return (
    <div>
      <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">
        Delegate
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card
          title="Delegate GUILD"
          extra="w-full h-full sm:overflow-auto px-6 py-4"
        >
          <DelegateGuild
            reloadGuild={setReloadGuild}
            balance={guildBalance}
            notUsed={guildNotUsed}
            guildReceived={guildreceived}
            userAddress={address}
            isConnected={isConnected}
          />
        </Card>
        <Card
          title="Delegate CREDIT"
          extra="w-full h-full sm:overflow-auto px-6 py-4"
        >
          <DelegateCredit
            reloadCredit={setReloadCredit}
            balance={creditBalance}
            notUsed={creditNotUsed}
            creditReceived={creditreceived}
            userAddress={address}
            isConnected={isConnected}
          />
        </Card>
      </div>
      <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">
        Participate
      </h3>
      <div className="mt-3 mb-40 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card
          title="Onboard Active Term"
          extra="w-full min-h-[300px] sm:overflow-auto px-6 py-4"
        >
          <OnboardNewterm
            notUsed={guildNotUsed}
            guildReceived={guildreceived}
            isConnected={isConnected}
          />
        </Card>
        <Card
          title="Offboard Active Term"
          extra="w-full min-h-[300px] sm:overflow-auto px-6 py-4"
        >
          <OffboardTerm
            notUsed={guildNotUsed}
            guildReceived={guildreceived}
            isConnected={isConnected}
          />
        </Card>
      </div>
      {/**<Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Onboard a New Term
            </h2>
          <OnboardTerm/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Onboard Term
            </h2>
          <OnboardTerm/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Offboard an Active Term
            </h2>
          <OffBoardTerm/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Current Onboarding Proposals
            </h2>
          <CurrentOnboardingProposals/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Current Offboarding Proposals
            </h2>
          <CurrentOffboardingProposals/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Current PendingS uccessfull Proposals
            </h2>
          <PendingSuccessfullProposals/>
          </div>
        </Card> */}
    </div>
  )
}

export default Governance
