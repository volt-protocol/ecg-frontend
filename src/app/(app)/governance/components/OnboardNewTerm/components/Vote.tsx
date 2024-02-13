import React, { useEffect, useState } from "react"
import {
  getPublicClient,
  readContracts,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core"
import { toastError, toastRocket } from "components/toast"
import {
  onboardGovernorGuildContract,
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
import { MdChevronLeft, MdChevronRight, MdOpenInNew } from "react-icons/md"
import Spinner from "components/spinner"
import DropdownSelect from "components/select/DropdownSelect"
import { useAppStore } from "store"
import ButtonPrimary from "components/button/ButtonPrimary"
import { useAccount} from "wagmi"
import { formatCurrencyValue, formatDecimal } from "utils/numbers"
import { ActiveOnboardingVotes, VoteOption, ProposalState } from "types/governance"
import { fromNow } from "utils/date"
import moment from "moment"
import { formatUnits, keccak256, stringToBytes, Address } from "viem"
import { QuestionMarkIcon, TooltipHorizon } from "components/tooltip"
import {
  BLOCK_LENGTH_MILLISECONDS,
  FROM_BLOCK,
} from "utils/constants"
import { getVotableTerms } from "./helper"
import VoteStatusBar from "components/bar/VoteStatusBar"
import { extractTermAddress } from "utils/strings"
import { wagmiConfig } from "contexts/Web3Provider"

function Vote({ guildVotingWeight }: { guildVotingWeight: bigint }) {
  const { address } = useAccount()
  const { lendingTerms, fetchLendingTerms } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [activeOnboardingVotes, setActiveOnboardingVotes] = useState<
    ActiveOnboardingVotes[]
  >([])
  const [loading, setLoading] = useState<boolean>(false)
  const [voteOptionsSelected, setVoteOptionsSelected] = useState<
    { optionSelected: number; proposalId: string }[]
  >([])
  const [currentBlock, setCurrentBlock] = useState<BigInt>()

  /* Multicall Onchain reads */

  /* End Get Onchain desgin */

  useEffect(() => {
    fetchActiveOnboardingVotes()
  }, [])

  /* Getters */
  const fetchActiveOnboardingVotes = async () => {
    setLoading(true)
    const currentBlockData = await getPublicClient(wagmiConfig).getBlockNumber()
    setCurrentBlock(currentBlockData)

    // get TermCreated logs
    const termsCreated = await getVotableTerms()

    //logs are returned from oldest to newest
    const logs = await getPublicClient(wagmiConfig).getLogs({
      address: process.env.NEXT_PUBLIC_ONBOARD_GOVERNOR_GUILD_ADDRESS as Address,
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
      fromBlock: BigInt(FROM_BLOCK),
      toBlock: currentBlockData,
    })

    const activeVotes = await Promise.all(
      logs.map(async (log) => {
        //Get term name
        const term = termsCreated.find(
          (term) =>
            term.termAddress.toLowerCase() ===
            extractTermAddress(log.args.description).toLowerCase()
        )

        //Get votes for a given proposal id
        const proposalVoteInfo = await readContracts(wagmiConfig, {
          contracts: [
            {
              ...onboardGovernorGuildContract,
              functionName: "proposalVotes",
              args: [log.args.proposalId],
            },
            {
              ...onboardGovernorGuildContract,
              functionName: "hasVoted",
              args: [log.args.proposalId, address],
            },
            {
              ...onboardGovernorGuildContract,
              functionName: "quorum",
              args: [Number(log.args.voteStart)],
            },
            {
              ...onboardGovernorGuildContract,
              functionName: "state",
              args: [log.args.proposalId],
            },
            {
              ...onboardGovernorGuildContract,
              functionName: "proposalEta",
              args: [log.args.proposalId],
            },
          ],
        })

        return {
          termAddress: term.termAddress,
          termName: term.termName,
          collateralTokenSymbol: term.collateralTokenSymbol,
          interestRate: term.interestRate,
          borrowRatio: term.borrowRatio,
          quorum:
            proposalVoteInfo[1].status == "success" &&
            formatUnits(proposalVoteInfo[2].result as bigint, 18),
          proposalId: BigInt(log.args.proposalId),
          proposer: log.args.proposer as Address,
          votes: proposalVoteInfo[0].status == "success" && proposalVoteInfo[0].result,
          hasVoted: proposalVoteInfo[1].status == "success" && proposalVoteInfo[1].result,
          voteStart: Number(log.args.voteStart),
          voteEnd: Number(log.args.voteEnd),
          isActive: Number(currentBlockData) < Number(log.args.voteEnd),
          proposalState:
            proposalVoteInfo[3].status == "success" && proposalVoteInfo[3].result,
          proposeArgs: [
            log.args.targets,
            log.args.values,
            log.args.calldatas,
            log.args.description,
          ],
          queueEnd: Number(
            proposalVoteInfo[3].status == "success" && proposalVoteInfo[4].result
          ),
        }
      })
    )

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
  const castVote = async (proposalId: BigInt, vote: number): Promise<void> => {
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
      const hash = await writeContract(wagmiConfig, {
        ...onboardGovernorGuildContract,
        functionName: "castVote",
        args: [proposalId, vote],
      })

      const tx = await waitForTransactionReceipt(wagmiConfig, {
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

  const queue = async (proposal: ActiveOnboardingVotes): Promise<void> => {
    //Init Steps
    setSteps([
      {
        name: "Queue Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
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
        "Queue Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
        "In Progress"
      )
      const hash = await writeContract(wagmiConfig, {
        ...onboardGovernorGuildContract,
        functionName: "queue",
        args: [
          proposal.proposeArgs[0],
          proposal.proposeArgs[1],
          proposal.proposeArgs[2],
          keccak256(stringToBytes(proposal.proposeArgs[3])),
        ],
      })

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (tx.status != "success") {
        updateStepStatus(
          "Queue Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
          "Error"
        )
        return
      }

      updateStepStatus(
        "Queue Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
        "Success"
      )
      await fetchActiveOnboardingVotes()
    } catch (e: any) {
      console.log(e)
      updateStepStatus(
        "Queue Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
        "Error"
      )
      toastError(e.shortMessage)
    }
  }

  const execute = async (proposal: ActiveOnboardingVotes): Promise<void> => {
    //Init Steps
    setSteps([
      {
        name: "Execute Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
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
        "Execute Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
        "In Progress"
      )
      const hash = await writeContract(wagmiConfig, {
        ...onboardGovernorGuildContract,
        functionName: "execute",
        args: [
          proposal.proposeArgs[0],
          proposal.proposeArgs[1],
          proposal.proposeArgs[2],
          keccak256(stringToBytes(proposal.proposeArgs[3])),
        ],
      })

      const tx = await waitForTransactionReceipt(wagmiConfig, {
        hash: hash,
      })

      if (tx.status != "success") {
        updateStepStatus(
          "Execute Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
          "Error"
        )
        return
      }

      updateStepStatus(
        "Execute Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
        "Success"
      )
      await fetchActiveOnboardingVotes()
      //fetch lending terms globally
      await fetchLendingTerms()
    } catch (e: any) {
      console.log(e)
      updateStepStatus(
        "Execute Proposal " + proposal.proposalId.toString().slice(0, 6) + "...",
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
  const columnHelper = createColumnHelper<ActiveOnboardingVotes>()

  const columns = [
    columnHelper.accessor("collateralTokenSymbol", {
      id: "tokenSymbol",
      header: "Collateral",
      enableSorting: true,
      cell: (info) => {
        return (
          <a
            className="flex items-center gap-1 pl-2 text-center text-sm font-bold text-gray-600 hover:text-brand-500 dark:text-white"
            target="__blank"
            href={`${process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_ADDRESS}/${info.row.original.termAddress}`}
          >
            {info.getValue()}
            <MdOpenInNew />
          </a>
        )
      },
    }),
    columnHelper.accessor("interestRate", {
      id: "interestRate",
      header: "Interest",
      enableSorting: true,
      cell: (info) => {
        return (
          <span className="text-center text-sm font-bold text-gray-600 dark:text-white">
            {info.getValue()}%
          </span>
        )
      },
    }),
    columnHelper.accessor("borrowRatio", {
      id: "borrowRatio",
      header: "Ratio",
      enableSorting: true,
      cell: (info) => {
        return (
          <span className="text-center text-sm font-bold text-gray-600 dark:text-white">
            {info.getValue()}
          </span>
        )
      },
    }),
    columnHelper.accessor("voteEnd", {
      id: "expiry",
      header: "Expiry",
      enableSorting: true,
      cell: (info) => {
        return (
          <p className="text-sm font-bold text-gray-600 dark:text-white">
            {info.row.original.isActive
              ? fromNow(
                  Number(
                    moment().add(
                      (Number(info.getValue()) - Number(currentBlock)) *
                        BLOCK_LENGTH_MILLISECONDS,
                      "milliseconds"
                    )
                  )
                )
              : "Expired"}
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
                  <ul>
                    <li className="flex items-center gap-1">
                      <svg
                        className="h-2 w-2 fill-red-400"
                        viewBox="0 0 8 8"
                        aria-hidden="true"
                      >
                        <circle cx={4} cy={4} r={4} />
                      </svg>
                      <span className="font-semibold">Against:</span>{" "}
                      {formatCurrencyValue(
                        Number(formatUnits(info.row.original.votes[0].toString(), 18))
                      )}
                    </li>
                    <li className="flex items-center gap-1">
                      <svg
                        className="h-2 w-2 fill-green-400"
                        viewBox="0 0 8 8"
                        aria-hidden="true"
                      >
                        <circle cx={4} cy={4} r={4} />
                      </svg>
                      <span className="font-semibold">For:</span>{" "}
                      {formatCurrencyValue(
                        Number(formatUnits(info.row.original.votes[1].toString(), 18))
                      )}
                    </li>
                    <li className="flex items-center gap-1">
                      <svg
                        className="h-2 w-2 fill-gray-400"
                        viewBox="0 0 8 8"
                        aria-hidden="true"
                      >
                        <circle cx={4} cy={4} r={4} />
                      </svg>
                      <span className="font-semibold">Abstain:</span>{" "}
                      {formatCurrencyValue(
                        Number(formatUnits(info.row.original.votes[2].toString(), 18))
                      )}
                    </li>
                    <li>
                      <span className="font-semibold">Quorum:</span>{" "}
                      {formatCurrencyValue(
                        Number(formatUnits(info.row.original.votes[0].toString(), 18)) +
                          Number(formatUnits(info.row.original.votes[1].toString(), 18)) +
                          Number(formatUnits(info.row.original.votes[2].toString(), 18))
                      ) +
                        "/" +
                        formatCurrencyValue(Number(info.row.original.quorum))}
                    </li>
                  </ul>
                </div>
              }
              trigger={
                <div className="flex items-center gap-1">
                  <VoteStatusBar
                    width={100}
                    height={10}
                    votes={info.row.original.votes}
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
    if (proposal.hasVoted && proposal.isActive)
      return (
        <span className="items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
          Already voted
        </span>
      )

    // Add proposal to queue
    if (proposal.proposalState === ProposalState.Succeeded) {
      return (
        <ButtonPrimary
          variant="xs"
          title="Queue"
          onClick={() => queue(proposal)}
          extra="mt-1"
        />
      )
    }

    if (
      proposal.proposalState === ProposalState.Queued &&
      Number(moment().unix()) < proposal.queueEnd
    ) {
      return (
        <span className="items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-600">
          Queued
        </span>
      )
    }

    // Execute proposal
    if (proposal.proposalState === ProposalState.Queued) {
      return (
        <ButtonPrimary
          variant="xs"
          title="Execute"
          onClick={() => execute(proposal)}
          extra="mt-1"
        />
      )
    }

    if (proposal.proposalState === ProposalState.Executed) {
      return (
        <span className="items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
          Executed
        </span>
      )
    }

    if (proposal.isActive) {
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
        </>
      )
    }

    return null
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
              {guildVotingWeight != undefined &&
                formatDecimal(Number(formatUnits(guildVotingWeight, 18)), 2)}
            </span>
          </p>
        </div>
        <div>
          {loading ? (
            <div className="mt-4 flex flex-grow flex-col items-center justify-center gap-2">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="overflow-auto">
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
              </div>
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
