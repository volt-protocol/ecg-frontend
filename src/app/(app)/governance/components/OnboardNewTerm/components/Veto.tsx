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
  daoTimelockContract,
  daoVetoCreditContract,
  creditContract,
  onboardGovernorGuildContract,
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
import { MdChevronLeft, MdChevronRight } from "react-icons/md"
import Spinner from "components/spinner"
import { useAppStore } from "store"
import ButtonPrimary from "components/button/ButtonPrimary"
import { readContracts, useAccount, useContractReads } from "wagmi"
import { decimalToUnit, formatCurrencyValue, formatDecimal } from "utils/numbers"
import { ActiveVetoVotes, VoteOption } from "types/governance"
import { fromNow } from "utils/date"
import moment from "moment"
import { bytesToNumber, formatUnits } from "viem"
import { QuestionMarkIcon, TooltipHorizon } from "components/tooltip"
import { BLOCK_LENGTH_MILLISECONDS, FROM_BLOCK } from "utils/constants"
import { checkVetoVoteValidity, getProposalIdFromActionId, getTermsCreated } from "./helper"
import VoteStatusBar from "components/bar/VoteStatusBar"
import Progress from "components/progress"

function Veto({ creditVotingWeight }: { creditVotingWeight: bigint }) {
  const { address } = useAccount()
  const { lendingTerms } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [activeVetoVotes, setActiveVetoVotes] = useState<ActiveVetoVotes[]>([])
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
    const currentBlockNumber = await getPublicClient().getBlockNumber()

    setCurrentBlock(currentBlockNumber)

    //logs are returned from oldest to newest
    const logs = await getPublicClient().getLogs({
      address: process.env.NEXT_PUBLIC_ONBOARD_TIMELOCK_ADDRESS as Address,
      event: {
        type: "event",
        name: "CallScheduled",
        inputs: [
          { indexed: true, name: "id", type: "bytes32" },
          { indexed: true, name: "index", type: "uint256" },
          { indexed: false, name: "target", type: "address" },
          { indexed: false, name: "value", type: "uint256" },
          { indexed: false, name: "data", type: "bytes" },
          { indexed: false, name: "predecessor", type: "bytes32" },
          { indexed: false, name: "delay", type: "uint256" },
        ],
      },
      fromBlock: BigInt(FROM_BLOCK),
      toBlock: currentBlockNumber,
    })

    const activeVetoVotes = await Promise.all(
      logs
        .map((log) => {
          return {
            id: log.args.id,
            target: log.args.target,
            data: log.args.data,
            delay: Number(log.args.delay),
            timestamp: Number(log.blockNumber),
          }
        })
        .reduce((acc, item) => {
          const existing = acc.find((i) => i.id === item.id)
          if (existing) {
            existing.targets.push(item.target)
            existing.datas.push(item.data)
          } else {
            acc.push({
              id: item.id,
              targets: [item.target],
              datas: [item.data],
              timestamp: item.timestamp,
              onboardIn: item.delay + item.timestamp,
            })
          }
          return acc
        }, [] as { id: string; targets: Address[]; datas: string[]; timestamp: number; onboardIn: number }[])
        .filter((item) => checkVetoVoteValidity(item.targets, item.datas))
        .map((item) => {
          //TODO : get term name decoding data[0]
          // TODO : transform action id to proposalID
          // const proposalId = getProposalIdFromActionId(item.id)

          return {
            ...item,
            termAddress: "0x6b498e33A66485cc39Eb259E2500d8ce3aFA23Ec",
            termName: "Term Name",
            proposalId: "0x2232323",
          }
        })
        .map(async (item) => {
          //get proposal votes
          const vetoGovernorData = await readContracts({
            contracts: [
              {
                ...daoVetoCreditContract,
                functionName: "proposalVotes",
                args: [item.proposalId],
              },
              {
                ...daoVetoCreditContract,
                functionName: "quorum",
                args: [item.timestamp],
              },
              {
                ...daoVetoCreditContract,
                functionName: "state",
                args: [item.proposalId],
              },
            ],
          })

          return {
            ...item,
            supportVotes: Number(vetoGovernorData[0].result[0]),
            quorum: vetoGovernorData[1].result,
            state:
              vetoGovernorData[2].status == "success"
                ? Number(vetoGovernorData[2].result)
                : 0,
          }
        })
    )

    setLoading(false)
    setActiveVetoVotes(activeVetoVotes)
  }
  /* End Getters*/

  /* Smart Contract Writes */
  const castVote = async (proposalId: BigInt, vote: number): Promise<void> => {
    //Init Steps
    setSteps([
      {
        name:
          "Support Veto against Term Proposal " +
          proposalId.toString().slice(0, 6) +
          "...",
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
        "Support Veto against Term Proposal " + proposalId.toString().slice(0, 6) + "...",
        "In Progress"
      )
      const { hash } = await writeContract({
        ...daoVetoCreditContract,
        functionName: "castVote",
        args: [proposalId, vote],
      })

      const tx = await waitForTransaction({
        hash: hash,
      })

      if (tx.status != "success") {
        updateStepStatus(
          "Support Veto against Term Proposal " +
            proposalId.toString().slice(0, 6) +
            "...",
          "Error"
        )
        return
      }

      updateStepStatus(
        "Support Veto against Term Proposal " + proposalId.toString().slice(0, 6) + "...",
        "Success"
      )
      await fetchActiveOnboardingVotes()
    } catch (e: any) {
      console.log(e)
      updateStepStatus(
        "Support Veto against Term Proposal " + proposalId.toString().slice(0, 6) + "...",
        "Error"
      )
      toastError(e.shortMessage)
    }
  }

  const createVeto = async (actionId: number): Promise<void> => {
    //Init Steps
    setSteps([
      {
        name: "Create Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
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
        "Create Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
        "In Progress"
      )
      const { hash } = await writeContract({
        ...daoVetoCreditContract,
        functionName: "createVeto",
        args: [actionId],
      })

      const tx = await waitForTransaction({
        hash: hash,
      })

      if (tx.status != "success") {
        updateStepStatus(
          "Create Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
          "Error"
        )
        return
      }

      updateStepStatus(
        "Create Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
        "Success"
      )
      await fetchActiveOnboardingVotes()
    } catch (e: any) {
      console.log(e)
      updateStepStatus(
        "Create Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
        "Error"
      )
      toastError(e.shortMessage)
    }
  }

  const executeVeto = async (actionId: number): Promise<void> => {
    //Init Steps
    setSteps([
      {
        name: "Execute Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
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
        "Execute Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
        "In Progress"
      )
      const { hash } = await writeContract({
        ...daoVetoCreditContract,
        functionName: "executeVeto",
        args: [actionId],
      })

      const tx = await waitForTransaction({
        hash: hash,
      })

      if (tx.status != "success") {
        updateStepStatus(
          "Execute Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
          "Error"
        )
        return
      }

      updateStepStatus(
        "Execute Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
        "Success"
      )
      await fetchActiveOnboardingVotes()
    } catch (e: any) {
      console.log(e)
      updateStepStatus(
        "Execute Veto for Term Proposal " + actionId.toString().slice(0, 6) + "...",
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
    columnHelper.accessor("termName", {
      id: "term",
      header: "Term",
      enableSorting: true,
      cell: (info) => {
        return (
          <span className="text-center text-sm font-bold text-gray-600 dark:text-white">
            {info.getValue()}
          </span>
        )
      },
    }),
    columnHelper.accessor("onboardIn", {
      id: "onboardIn",
      header: "Onboard in",
      enableSorting: true,
      cell: (info) => {
        return (
          <p className="text-sm font-bold text-gray-600 dark:text-white">
            {Number(info.getValue()) - Number(currentBlock) > 0
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
      header: "Veto Support",
      cell: (info: any) => {
        return (
          <div>
            <TooltipHorizon
              extra=""
              content={
                <div className="text-gray-700 dark:text-white">
                  <ul>
                    <li className="flex items-center gap-1">
                      <span className="font-semibold">Support:</span>{" "}
                      {formatCurrencyValue(info.row.original.supportVotes)}
                    </li>
                    <li className="flex items-center gap-1">
                      <span className="font-semibold">Quorum:</span>{" "}
                      {formatCurrencyValue(Number(formatUnits(info.row.original.quorum, 18)))}
                    </li>
                  </ul>
                </div>
              }
              trigger={
                <div className="flex items-center gap-1">
                  <Progress
                    width="w-[100px]"
                    value={Math.round(
                      (info.row.original.supportVotes / Number(formatUnits(info.row.original.quorum, 18))) * 100
                    )}
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
    data: activeVetoVotes,
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
          id: "onboardIn",
          desc: true,
        },
      ],
    },
  })
  /* End Create Table */

  const getActionButton = (item: ActiveVetoVotes) => {
    if (item.state == 0) {
      return (
        <ButtonPrimary
          variant="xs"
          title="Create Veto"
          onClick={() => createVeto(item.id)}
        />
      )
    }

    if (item.state == 1) {
      return (
        <ButtonPrimary
          variant="xs"
          title="Support Veto"
          onClick={() => castVote(item.proposalId, 0)}
        />
      )
    }

    if (item.state == 4) {
      return (
        <ButtonPrimary
          variant="xs"
          title="Execute Veto"
          onClick={() => executeVeto(item.id)}
        />
      )
    }

    if (item.state == 7) {
      return <ButtonPrimary variant="xs" title="Veto Successful" disabled={true} />
    }

    return null
  }

  console.log('proposalID', BigInt(getProposalIdFromActionId("0x626d97158f351d32e7dd3064b8e392538bec6ef4d0da1136a3ac8f7162c77bcc")))

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
        <p>
          Using gUSDC veto power will cancel the onboarding of a lending term that GUILD
          votes successfully voted to add.
        </p>
        <div className="mt-2 flex justify-end">
          <p>
            Your gUSDC voting weight:{" "}
            <span className="font-semibold">
              {creditVotingWeight ?
                formatDecimal(Number(formatUnits(creditVotingWeight, 18)), 2)
                : 0}
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

export default Veto
