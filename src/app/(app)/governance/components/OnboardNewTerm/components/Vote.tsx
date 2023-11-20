import React, { useEffect, useState } from "react"
import {
  getPublicClient,
  Address,
  readContract,
  waitForTransaction,
  writeContract,
} from "@wagmi/core"
import { toastError, toastRocket } from "components/toast"
import {
  TermABI,
  guildContract,
  lendingTermOffboardingContract,
  lendingTermOnboardingContract,
  termContract,
} from "lib/contracts"
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  getPaginationRowModel,
} from "@tanstack/react-table"
import {
  MdArrowLeft,
  MdArrowRight,
  MdChevronLeft,
  MdChevronRight,
  MdOpenInNew,
} from "react-icons/md"
import Spinner from "components/spinner"
import DropdownSelect from "components/select/DropdownSelect"
import { useAppStore } from "store"
import { LendingTerms } from "types/lending"
import { generateTermName } from "utils/strings"
import ButtonPrimary from "components/button/ButtonPrimary"
import { readContracts, useAccount, useContractRead, useContractReads } from "wagmi"
import { decimalToUnit, formatCurrencyValue } from "utils/numbers"
import {
  ActiveOnboardingVotes,
  VoteOption,
} from "types/governance"
import Progress from "components/progress"
import { fromNow } from "utils/date"
import moment from "moment"
import { Abi, RpcError, parseUnits } from "viem"
import { QuestionMarkIcon, TooltipHorizon } from "components/tooltip"
import { BLOCK_LENGTH_MILLISECONDS } from "utils/constants"
import { isActivePoll } from "../../OffboardTerm/helper"
import { m } from "framer-motion"

function Vote({
  notUsed,
  guildReceived,
  isConnected,
}: {
  notUsed: number
  guildReceived: number
  isConnected: boolean
}) {
  const { address } = useAccount()
  const { lendingTerms } = useAppStore()
  const [selectedTerm, setSelectedTerm] = useState<LendingTerms>(lendingTerms[0])
  const [showModal, setShowModal] = useState(false)
  const [activeOnboardingVotes, setActiveOnboardingVotes] = useState<
    ActiveOnboardingVotes[]
  >([])
  const [loading, setLoading] = useState<boolean>(false)
  const [voteOptionsSelected, setVoteOptionsSelected] = useState<
    { optionSelected: number; proposalId: string }[]
  >([])

  /* Multicall Onchain reads */
  const createAllTermContractRead = () => {
    return lendingTerms.map((term) => {
      return {
        ...termContract(term.address as Address),
        functionName: "issuance",
      }
    })
  }

  const { data, isError, isLoading } = useContractReads({
    contracts: [
      {
        ...lendingTermOnboardingContract,
        functionName: "quorum",
        args: [4684984],
      },
      {
        ...guildContract,
        functionName: "getVotes",
        args: [address],
      },
      ...createAllTermContractRead(),
    ],
    select: (data) => {
      return {
        quorum: Number(data[0].result),
        votingPower: Number(data[1].result),
      }
    },
  })
  /* End Get Onchain desgin */

  useEffect(() => {
    fetchActiveOnboardingVotes()
  }, [])

  /* Getters */
  const fetchActiveOnboardingVotes = async () => {
    setLoading(true)
    const currentBlock = await getPublicClient().getBlockNumber()

    //logs are returned from oldest to newest
    const logs = await getPublicClient().getLogs({
      address: process.env.NEXT_PUBLIC_LENDING_TERM_ONBOARDING_ADDRESS as Address,
      event: {
        type: "event",
        name: "ProposalCreated",
        inputs: [
          {
            indexed: false,
            name: "proposalId",
            type: "uint256",
          },
          {
            indexed: false,
            name: "proposer",
            type: "address",
          },
          {
            indexed: false,
            name: "targets",
            type: "address[]",
          },
          {
            indexed: false,
            name: "values",
            type: "uint256[]",
          },
          {
            indexed: false,
            name: "signatures",
            type: "string[]",
          },
          {
            indexed: false,
            name: "calldatas",
            type: "bytes[]",
          },
          {
            indexed: false,
            name: "voteStart",
            type: "uint256",
          },
          {
            indexed: false,
            name: "voteEnd",
            type: "uint256",
          },
          {
            indexed: false,
            name: "description",
            type: "string",
          },
        ],
      },
      fromBlock: BigInt(20),
      toBlock: currentBlock,
    })

    const activeVotes = await Promise.all(
      logs.map(async (log) => {
        //Get quorum for given timestamp ?
        const quorum = await readContract({
          ...lendingTermOnboardingContract,
          functionName: "quorum",
          args: [log.args.voteStart.toString()],
        })
        //Get votes for a given proposal id
        const proposalVoteInfo = await readContracts({
          contracts: [
            {
              ...lendingTermOnboardingContract,
              functionName: "proposalVotes",
              args: [log.args.proposalId.toString()],
            },
            {
              ...lendingTermOnboardingContract,
              functionName: "hasVoted",
              args: [log.args.proposalId, address],
            },
          ],
        })

        console.log("proposalVoteInfo", proposalVoteInfo)

        return {
          // termName:
          quorum: parseUnits(quorum.toString(), 18),
          proposalId: BigInt(log.args.proposalId),
          proposer: log.args.proposer as Address,
          votes: proposalVoteInfo[0].status == "success" && proposalVoteInfo[0].result,
          hasVoted: proposalVoteInfo[1].status == "success" && proposalVoteInfo[1].result,
          voteStart: Number(log.args.voteStart),
          voteEnd: Number(log.args.voteEnd),
          isActive: currentBlock < Number(log.args.voteEnd),
        }
      })
    )

    console.log("activeVotes", activeVotes)

    setLoading(false)
    setActiveOnboardingVotes(activeVotes)
    setVoteOptionsSelected(
      activeVotes.map((vote) => ({
        proposalId: vote.proposalId.toString(),
        optionSelected: VoteOption.Abstain,
      }))
    )
  }
  /* End Getters*/

  /* Smart Contract Writes */
  const castVote = async (proposalId: number, vote: number): Promise<void> => {
    //Init Steps
    setSteps([
      {
        name: "Vote for Proposal " + proposalId.toString().slice(0, 6) + "...",
        status: "Not Started",
      },
    ])

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }

    try {
      setShowModal(true)
      updateStepStatus(
        "Vote for Proposal " + proposalId.toString().slice(0, 6) + "...",
        "In Progress"
      )
      const { hash } = await writeContract({
        ...lendingTermOnboardingContract,
        functionName: "castVote",
        args: [proposalId, vote],
      })

      const tx = await waitForTransaction({
        hash: hash,
      })

      if (tx.status != "success") {
        updateStepStatus(
          "Vote for Proposal " + proposalId.toString().slice(0, 6) + "...",
          "Error"
        )
        return
      }

      updateStepStatus(
        "Vote for Proposal " + proposalId.toString().slice(0, 6) + "...",
        "Success"
      )
      await fetchActiveOnboardingVotes()
    } catch (e: any) {
      console.log(e)
      updateStepStatus(
        "Vote for Proposal " + proposalId.toString().slice(0, 6) + "...",
        "Error"
      )
      toastError(e.shortMessage)
    }
  }

  /* End Smart Contract Writes */

  /* Create Modal Steps */
  const createSteps = (): Step[] => {
    return [{ name: "Propose Offboarding", status: "Not Started" }]
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())
  /* End Create Modal Steps */

  /* Create Table */
  const columnHelper = createColumnHelper<ActiveOnboardingPolls>()

  const columns = [
    columnHelper.accessor("proposalId", {
      id: "term",
      header: "Term",
      enableSorting: true,
      // cell: (info) => {
      //   const lendingTerm = lendingTerms.find((term) => term.address === info.getValue())
      //   return (
      //     <a
      //       className="flex items-center gap-1 pl-2 text-center text-sm font-bold text-gray-600 hover:text-brand-500 dark:text-white"
      //       target="__blank"
      //       href={`${process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL}/${info.getValue()}`}
      //     >
      //       {generateTermName(
      //         lendingTerm.collateral,
      //         lendingTerm.interestRate,
      //         lendingTerm.borrowRatio
      //       )}
      //       <MdOpenInNew />
      //     </a>
      //   )
      // },
      cell: (info) => "#" + info.getValue().toString().slice(0, 6) + "...",
    }),
    columnHelper.accessor("voteEnd", {
      id: "expiry",
      header: "Expiry",
      enableSorting: true,
      cell: (info) => {
        // console.log('voteEnd', moment(BLOCK_LENGTH_MILLISECONDS * Number(info.getValue()) / 1000))
        // console.log('now', moment())

        return (
          <p className="text-sm font-bold text-gray-600 dark:text-white">
            {info.row.original.isActive ? "Ongoing" : "Expired"}
          </p>
        )
      },
    }),
    {
      id: "support",
      header: "Support",
      cell: (info: any) => {
        return (
          <div>
            <TooltipHorizon
              extra=""
              content={
                <div className="text-gray-700 dark:text-white">
                  {formatCurrencyValue(Number(parseUnits(info.row.original.votes[1].toString(), 18))) +
                    "/" +
                    formatCurrencyValue(Number(info.row.original.quorum))}
                </div>
              }
              trigger={
                <div className="flex items-center gap-1">
                  <Progress
                    width="w-[100px]"
                    value={Math.round(
                      (Number(parseUnits(info.row.original.votes[1].toString(), 18)) / Number(info.row.original.quorum)) * 100
                    ) > 100 ? 100 : Math.round( (Number(parseUnits(info.row.original.votes[1].toString(), 18)) / Number(info.row.original.quorum)) * 100)}
                    color="teal"
                  />
                  <div className="ml-1">
                    <QuestionMarkIcon />
                  </div>
                </div>
              }
              placement="top"
            />
          </div>
        )
      },
    },
    {
      id: "action",
      header: "",
      cell: (info: any) => {
        return (
          <div className="flex items-center gap-1">
            {getActionButton(info.row.original)}
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: activeOnboardingVotes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
    initialState: {
      pagination: {
        pageSize: 8,
      },
      sorting: [
        {
          id: "expiry",
          desc: true,
        },
      ],
    },
  })
  /* End Create Table */

  /* Handlers */
  const handleVoteOptionChange = (option: number, proposalId: string) => {
    setVoteOptionsSelected((prev) => {
      const newVoteOptionsSelected = prev.map((vote) => {
        if (vote.proposalId === proposalId) {
          return {
            ...vote,
            optionSelected: option,
          }
        }
        return vote
      })
      return newVoteOptionsSelected
    })
  }

  /* End Handlers */

  const getActionButton = (proposal: ActiveOnboardingVotes) => {
    if (!proposal.isActive) return null

    if (proposal.hasVoted)
      return <span className="text-medium text-sm text-brand-500">Already voted!</span>

    return (
      <>
        <DropdownSelect
          options={[0, 1, 2]}
          selectedOption={
            voteOptionsSelected.find(
              (vote) => vote.proposalId === proposal.proposalId.toString()
            )?.optionSelected
          }
          onChange={(option) =>
            handleVoteOptionChange(option, proposal.proposalId.toString())
          }
          getLabel={(item) => {
            switch (item) {
              case 0:
                return "Against"
              case 1:
                return "For"
              case 2:
                return "Abstain"
            }
          }}
          extra={"w-full mt-1"}
        />
        <ButtonPrimary
          variant="xs"
          title="Vote"
          onClick={() =>
            castVote(
              proposal.proposalId,
              voteOptionsSelected.find(
                (vote) => vote.proposalId === proposal.proposalId.toString()
              )?.optionSelected
            )
          }
          extra="mt-1"
        />
        {/* 
        <ButtonPrimary
          variant="xs"
          title="For"
          onClick={() => voteProposal(proposal.proposalId, VoteOption.For)}
        />
        <ButtonPrimary
          variant="xs"
          title="Against"
          onClick={() => voteProposal(proposal.proposalId, VoteOption.Against)}
        /> */}
      </>
    )
  }

  return (
    <>
      {showModal && (
        <StepModal
          steps={steps}
          close={setShowModal}
          initialStep={createSteps}
          setSteps={setSteps}
        />
      )}
      <div className="text-gray-700 dark:text-gray-100">
        <div className="flex flex-col 3xl:flex-row 3xl:items-center 3xl:justify-between">
          <p>Active onboarding polls: </p>
          <p>
            Your GUILD voting weight:{" "}
            <span className="font-semibold">
              {data && data.votingPower
                ? formatCurrencyValue(decimalToUnit(data.votingPower, 18))
                : 0}
            </span>
          </p>
        </div>
        <div>
          {loading || isLoading ? (
            <div className="mt-4 flex flex-grow flex-col items-center justify-center gap-2">
              <Spinner />
            </div>
          ) : (
            <>
              <table className="mt-4 w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="!border-px !border-gray-400">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          onClick={header.column.getToggleSortingHandler()}
                          className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pt-4 text-center text-start dark:border-gray-400"
                        >
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-500 dark:text-white">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </p>
                            {header.column.columnDef.enableSorting && (
                              <span className="text-sm text-gray-400">
                                {{
                                  asc: <FaSortDown />,
                                  desc: <FaSortUp />,
                                  null: <FaSort />,
                                }[header.column.getIsSorted() as string] ?? <FaSort />}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 transition-all duration-150 ease-in-out last:border-none hover:cursor-pointer hover:bg-gray-50 dark:border-gray-500 dark:hover:bg-navy-700"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="relative min-w-[85px] border-white/0 py-2"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <nav
                className="flex w-full items-center justify-between border-t border-gray-200 px-2 py-3 text-gray-400"
                aria-label="Pagination"
              >
                <div className="hidden sm:block">
                  <p className="text-sm ">
                    Showing page{" "}
                    <span className="font-medium">
                      {table.getState().pagination.pageIndex + 1}
                    </span>{" "}
                    of <span className="font-semibold">{table.getPageCount()}</span>
                  </p>
                </div>
                <div className="flex flex-1 justify-between sm:justify-end">
                  <button
                    onClick={() => table.previousPage()}
                    className="relative inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
                    disabled={!table.getCanPreviousPage()}
                  >
                    <MdChevronLeft />
                    Previous
                  </button>
                  <button
                    onClick={() => table.nextPage()}
                    className="relative ml-3 inline-flex items-center rounded-md px-1.5 py-1 text-sm  hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100/0"
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                    <MdChevronRight />
                  </button>
                </div>
              </nav>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Vote
