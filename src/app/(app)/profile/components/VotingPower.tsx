"use client"
import { guildContract, creditContract } from "lib/contracts"
import { readContract } from "@wagmi/core"
import { useEffect, useState } from "react"
import { useAccount, useReadContracts } from "wagmi"
import { Address, formatUnits } from "viem"
import { formatDecimal } from "utils/numbers"
import { Delegatee } from "app/(app)/governance/page"
import { ApexChartWrapper } from "components/charts/ApexChartWrapper"
import Spinner from "components/spinner"
import { wagmiConfig } from "contexts/Web3Provider"

export default function VotingPower({ userAddress }: { userAddress: Address }) {
  const [guildDelegatees, setGuildDelegatees] = useState<Delegatee[]>([])
  const [creditDelegatees, setCreditDelegatees] = useState<Delegatee[]>([])
  const [loadingGuildDelegation, setLoadingGuildDelegation] = useState<boolean>(true)
  const [loadingCreditDelegation, setLoadingCreditDelegation] = useState<boolean>(true)
  const [guildChart, setGuildChart] = useState<any>(undefined)
  const [creditChart, setCreditChart] = useState<any>(undefined)

  /* Read contracts */
  const { data, isError, isLoading, isFetched } = useReadContracts({
    contracts: [
      {
        ...guildContract,
        functionName: "balanceOf",
        args: [userAddress],
      },
      {
        ...guildContract,
        functionName: "freeVotes",
        args: [userAddress],
      },
      {
        ...guildContract,
        functionName: "getVotes",
        args: [userAddress],
      },
      {
        ...creditContract,
        functionName: "balanceOf",
        args: [userAddress],
      },
      {
        ...creditContract,
        functionName: "freeVotes",
        args: [userAddress],
      },
      {
        ...creditContract,
        functionName: "getVotes",
        args: [userAddress],
      },
      {
        ...guildContract,
        functionName: "delegates",
        args: [userAddress],
      },
      {
        ...creditContract,
        functionName: "delegates",
        args: [userAddress],
      },
    ],
    query: {
      select: (data) => {
        return {
          guildBalance: data[0].result as bigint,
          guildNotUsed: data[1].result as bigint,
          guildVotingWeight: data[2].result as bigint,
          creditBalance: data[3].result as bigint,
          creditNotUsed: data[4].result as bigint,
          creditVotingWeight: data[5].result as bigint,
          guildDelegatees: data[6].result as string[],
          creditDelegatees: data[7].result as string[],
        }
      },
    },
  })

  useEffect(() => {
    async function getDelegateeAndVotes(): Promise<void> {
      setLoadingGuildDelegation(true)
      for (const delegatee of data.guildDelegatees) {
        const result = await readContract(wagmiConfig, {
          ...guildContract,
          functionName: "delegatesVotesCount",
          args: [userAddress, delegatee],
        })
        const tempDelegatees = {
          address: delegatee,
          votes: Number(formatUnits(result as bigint, 18)),
        }
        setGuildDelegatees((guildDelegatees) => [...guildDelegatees, tempDelegatees])
      }
      setLoadingGuildDelegation(false)
    }
    if (data && data.guildDelegatees) {
      getDelegateeAndVotes()
    }
  }, [data])

  useEffect(() => {
    async function getDelegateeAndVotes(): Promise<void> {
      setLoadingCreditDelegation(true)
      for (const delegatee of data.creditDelegatees) {
        const result = await readContract(wagmiConfig, {
          ...creditContract,
          functionName: "delegatesVotesCount",
          args: [userAddress, delegatee],
        })
        const tempDelegatees = {
          address: delegatee,
          votes: Number(formatUnits(result as bigint, 18)),
        }
        setGuildDelegatees((creditDelegatees) => [...creditDelegatees, tempDelegatees])
      }
      setLoadingCreditDelegation(false)
    }
    if (data && data.creditDelegatees) {
      getDelegateeAndVotes()
    }
  }, [data])

  /* End Read Contracts  */
  useEffect(() => {
    if (!loadingGuildDelegation && !loadingCreditDelegation) {
      const guildChart = {
        series: [
          Number(formatUnits(data.guildNotUsed, 18)),
          Number(formatUnits(data.guildVotingWeight, 18)),
          guildDelegatees
            .filter((delegatee) => delegatee.address != userAddress)
            .reduce((a, b) => a + b.votes, 0),
        ],
        options: {
          legend: {
            show: false,
          },
          tooltip: {
            y: {
              formatter: (val) => formatDecimal(val, 2) + " GUILD",
            },
          },
          chart: {
            width: 380,
            type: "pie",
          },
          labels: [
            "Voting power not delegated yet",
            "Voting power delegated to himself",
            "Voting power delegated to others",
          ],
          responsive: [
            {
              breakpoint: 480,
              options: {
                chart: {
                  width: "100%",
                },
                legend: {
                  position: "bottom",
                },
              },
            },
          ],
        },
      }

      const creditChart = {
        series: [
          Number(formatUnits(data.creditNotUsed, 18)),
          Number(formatUnits(data.creditVotingWeight, 18)),
          creditDelegatees
            .filter((delegatee) => delegatee.address != userAddress)
            .reduce((a, b) => a + b.votes, 0),
        ],
        options: {
          legend: {
            show: false,
          },
          tooltip: {
            y: {
              formatter: (val) => formatDecimal(val, 2) + " gUSDC",
            },
          },
          chart: {
            width: 380,
            type: "pie",
          },
          labels: [
            "Voting power not delegated yet",
            "Voting power delegated to himself",
            "Voting power delegated to others",
          ],
          responsive: [
            {
              breakpoint: 480,
              options: {
                chart: {
                  width: "100%",
                },
                legend: {
                  position: "bottom",
                },
              },
            },
          ],
        },
      }

      setGuildChart(guildChart)
      setCreditChart(creditChart)
    }
  }, [loadingCreditDelegation, loadingGuildDelegation])

  return (
    <div>
      <dl className="mt-3 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow dark:divide-navy-600 dark:bg-navy-700 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div key="guildVotingPower" className="px-2 py-4 sm:p-5">
          <dt className="text-sm font-normal text-gray-500 dark:text-gray-300 xl:text-base">
            Max GUILD Voting Power
          </dt>
          <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
            <div className="flex items-baseline overflow-hidden text-lg font-semibold text-gray-700 dark:text-gray-200 xl:text-2xl">
              {data &&
                data.guildBalance &&
                formatDecimal(Number(formatUnits(data.guildBalance, 18)), 2)}{" "}
              <span className="ml-1 text-base font-medium">GUILD</span>
            </div>
          </dd>
        </div>
        <div key="creditVotingPower" className="px-2 py-4 sm:p-5">
          <dt className="text-sm font-normal text-gray-500 dark:text-gray-300 xl:text-base">
            Max gUSDC Voting Power
          </dt>
          <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
            <div className="flex items-baseline overflow-hidden text-lg font-semibold text-gray-700 dark:text-gray-200 xl:text-2xl">
              {data &&
                data.guildBalance &&
                formatDecimal(Number(formatUnits(data.creditBalance, 18)), 2)}{" "}
              <span className="ml-1 text-base font-medium">gUSDC</span>
            </div>
          </dd>
        </div>
      </dl>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2">
        {guildChart != undefined ? (
          <ApexChartWrapper
            options={guildChart.options}
            series={guildChart.series}
            type="pie"
          />
        ) : (
          <Spinner />
        )}
        {creditChart != undefined ? (
          <ApexChartWrapper
            options={creditChart.options}
            series={creditChart.series}
            type="pie"
          />
        ) : (
          <Spinner />
        )}
      </div>
    </div>
  )
}
