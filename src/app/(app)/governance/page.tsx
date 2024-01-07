"use client"
import Disconnected from "components/error/disconnected"
import React, { useEffect } from "react"
import Card from "components/card"
import { guildContract, creditContract } from "lib/contracts"
import { useAccount, useContractReads } from "wagmi"
import DelegateGuild from "./components/DelegateGuild"
import DelegateCredit from "./components/DelegateCredit"
import OffboardTerm from "./components/OffboardTerm"
import OnboardNewterm from "./components/OnboardNewTerm"
import Spinner from "components/spinner"
import { ref } from "yup"

export type Delegatee = {
  address: string
  votes: number
}

function Governance() {
  const { address, isConnected, isDisconnected } = useAccount()
  const [reloadGuild, setReloadGuild] = React.useState<boolean>(false)
  const [reloadCredit, setReloadCredit] = React.useState<boolean>(false)

  //TODO:  optimize contracts call with useContractReads
  const { data, isError, isLoading, refetch } = useContractReads({
    contracts: [
      {
        ...guildContract,
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...guildContract,
        functionName: "freeVotes",
        args: [address],
      },
      {
        ...guildContract,
        functionName: "getVotes",
        args: [address],
      },
      {
        ...creditContract,
        functionName: "balanceOf",
        args: [address],
      },
      {
        ...creditContract,
        functionName: "freeVotes",
        args: [address],
      },
      {
        ...creditContract,
        functionName: "getVotes",
        args: [address],
      },
    ],
    select: (data) => {
      return {
        guildBalance: data[0].result as bigint,
        guildNotUsed: data[1].result as bigint,
        guildVotingWeight: data[2].result as bigint,
        creditBalance: data[3].result as bigint,
        creditNotUsed: data[4].result as bigint,
        creditVotingWeight: data[5].result as bigint,
      }
    },
  })
  // TODO : listen to event to update guild and credit values

  useEffect(() => {
    if (isConnected && ( reloadGuild || reloadCredit )) {
      refetch()
      setReloadGuild(false)
      setReloadCredit(false)
    }
  }, [isConnected, reloadGuild, reloadCredit])


  if (!isConnected) {
    return <Disconnected />
  }

  if (data) {
    return (
      <div>
        <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">
          Delegate
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card title="Delegate GUILD" extra="w-full h-full sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
            <DelegateGuild
              reloadGuild={setReloadGuild}
              guildBalance={data?.guildBalance}
              guildNotUsed={data?.guildNotUsed}
              guildVotingWeight={data?.guildVotingWeight}
              userAddress={address}
              isConnected={isConnected}
            />
          </Card>
          <Card title="Delegate gUSDC" extra="w-full h-full sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
            <DelegateCredit
              reloadCredit={setReloadCredit}
              creditBalance={data?.creditBalance}
              creditNotUsed={data?.creditNotUsed}
              creditVotingWeight={data?.creditVotingWeight}
              userAddress={address}
              isConnected={isConnected}
            />
          </Card>
        </div>
        <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">
          Participate
        </h3>
        <div className="mb-40 mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card
            title="Onboard Active Term"
            extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
          >
            <OnboardNewterm
              guildVotingWeight={data?.guildVotingWeight}
              creditVotingWeight={data?.creditVotingWeight}
            />
          </Card>
          <Card
            title="Offboard Active Term"
            extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
          >
            <OffboardTerm guildVotingWeight={data?.guildVotingWeight} />
          </Card>
        </div>
      </div>
    )
  }
}

export default Governance
