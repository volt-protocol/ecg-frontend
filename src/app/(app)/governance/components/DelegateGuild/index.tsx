import React, { useEffect, useState } from "react"
import {
  Address,
  readContract,
  waitForTransaction,
  writeContract,
} from "@wagmi/core"
import { toastError, toastRocket } from "components/toast"
import { GuildABI } from "lib/contracts"
import { DecimalToUnit, UnitToDecimal, preciseRound } from "utils/utils-old"
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import { Delegatee } from "../.."
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table"
import { style } from "./helper"
import { MdOpenInNew } from "react-icons/md"
import Spinner from "components/spinner"
import { useAccount } from "wagmi"
import ButtonDanger from "components/button/ButtonDanger"
import { formatCurrencyValue } from "utils/numbers"

function DelegateGuild({
  notUsed,
  reloadGuild,
  balance,
  guildReceived,
  userAddress,
  isConnected,
}: {
  notUsed: number
  reloadGuild: React.Dispatch<React.SetStateAction<boolean>>
  balance: number
  guildReceived: number
  userAddress: string
  isConnected: boolean
}) {
  const { address } = useAccount()
  const [value, setValue] = useState<number>()
  const [showModal, setShowModal] = useState(false)
  const [addressValue, setAddressValue] = useState<string>("")
  const [delegatees, setDelegatees] = useState<Delegatee[]>([])
  const [isLoadingDelegations, setIsLoadingDelegations] =
    useState<boolean>(true)

  const createSteps = (actionType?: "Delegate" | "Undelegate"): Step[] => {
    if (actionType === "Delegate") {
      return [{ name: "Delegate GUILD", status: "Not Started" }]
    } else {
      return [{ name: "Undelegate GUILD", status: "Not Started" }]
    }
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as unknown as number)
    }
  }

  async function getDelegatee(): Promise<string[]> {
    const result = await readContract({
      address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
      abi: GuildABI,
      functionName: "delegates",
      args: [userAddress],
    })
    return result as string[]
  }

  useEffect(() => {
    const tempDelegatees: Delegatee[] = []
    async function getDelegateeAndVotes(delegatee: string): Promise<void> {
      const result = await readContract({
        address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
        abi: GuildABI,
        functionName: "delegatesVotesCount",
        args: [userAddress, delegatee],
      })
      tempDelegatees.push({
        address: delegatee,
        votes: DecimalToUnit(result as bigint, 18),
      })
      setDelegatees(tempDelegatees)
    }
    if (isConnected) {
      setDelegatees([])
      getDelegatee().then((result) => {
        result.forEach((delegatee) => {
          getDelegateeAndVotes(delegatee)
        })
        setIsLoadingDelegations(false)
      })
    }
  }, [isConnected, notUsed])

  // faire une fonction qui permet de check si c'est une addresse ethereum valide
  function isAddress(address: string): boolean {
    return /^(0x)?[0-9a-f]{40}$/i.test(address)
  }

  async function handledelegate(): Promise<void> {
    if (value > notUsed) {
      toastError("You can't delegate more than your available GUILD")
      return
    }
    if (value <= 0) {
      toastError("You can't delegate 0 GUILD")
      return
    }
    if (addressValue === "") {
      toastError("You must enter an address")
      return
    }
    if (!isAddress(addressValue)) {
      toastError("You must enter a valid address")
      return
    }

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      )
    }
    try {
      setShowModal(true)
      setSteps(createSteps("Delegate"))
      updateStepStatus("Delegate GUILD", "In Progress")
      const { hash } = await writeContract({
        address: process.env.NEXT_PUBLIC_GUILD_ADDRESS,
        abi: GuildABI,
        functionName: "incrementDelegation",
        args: [addressValue, UnitToDecimal(value, 18)],
      })

      const checkdelegate = await waitForTransaction({
        hash: hash,
      })

      if (checkdelegate.status != "success") {
        updateStepStatus("Delegate GUILD", "Error")

        return
      }

      updateStepStatus("Delegate GUILD", "Success")
      reloadGuild(true)
    } catch (e) {
      console.log(e)
      updateStepStatus("Delegate GUILD", "Error")
      toastError("Transaction failed")
    }
  }
  async function Undelegate(address: string, amount: number): Promise<void> {
    setSteps(createSteps("Undelegate"))

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.name === stepName ? { ...step, status } : step
        )
      )
    }
    try {
      setShowModal(true)
      updateStepStatus("Undelegate GUILD", "In Progress")
      const { hash } = await writeContract({
        address: process.env.NEXT_PUBLIC_GUILD_ADDRESS,
        abi: GuildABI,
        functionName: "undelegate",
        args: [address, UnitToDecimal(amount, 18)],
      })

      const checkdelegate = await waitForTransaction({
        hash: hash,
      })

      if (checkdelegate.status != "success") {
        updateStepStatus("Undelegate GUILD", "Error")

        return
      }

      updateStepStatus("Undelegate GUILD", "Success")
      reloadGuild(true)
    } catch (e) {
      console.log(e)
      updateStepStatus("Undelegate GUILD", "Error")
      toastError("Transaction failed")
    }
  }

  const columnHelper = createColumnHelper<Delegatee>()

  const columns = [
    columnHelper.accessor("address", {
      id: "delegatee",
      header: "Delegatee",
      enableSorting: true,
      cell: (info) => (
        <a
          className="flex items-center gap-1 pl-3 text-center text-sm font-bold text-gray-600 hover:text-brand-500 dark:text-gray-200"
          target="__blank"
          href={`${
            process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL
          }/${info.getValue()}`}
        >
          {info.getValue() == address
            ? "Yourself"
            : info.getValue().slice(0, 4) +
              "..." +
              info.getValue().slice(-4)}{" "}
          <MdOpenInNew />
        </a>
      ),
    }),
    columnHelper.accessor("votes", {
      id: "votes",
      header: "GUILD Delegated",
      enableSorting: true,
      cell: (info) => (
        <p className="text-sm font-bold text-gray-600 dark:text-gray-200">
          {info.getValue()}
        </p>
      ),
    }),
    {
      id: "action",
      header: "",
      cell: (info: any) => (
        <div className="flex items-center justify-center">
          <ButtonDanger
            variant="xs"
            title="Undelegate"
            onClick={() => Undelegate(info.row.original.address, info.row.original.votes)}
          />
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: delegatees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  })
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
      <div className="mt-4 text-gray-700 dark:text-gray-200">
        <div className="my-2 -mt-1 grid grid-cols-2 gap-y-1">
          <p className="col-span-2">
            Your GUILD balance :{" "}
            <span className="font-semibold">
              {balance != undefined ? preciseRound(balance, 2) : "?"}
            </span>
          </p>
          <p className="col-span-2">
            Your GUILD available to delegate :{" "}
            {notUsed != undefined ? (
              <>
                <span className="font-semibold">
                  {preciseRound(notUsed, 2)}
                </span>{" "}
                /{" "}
                <span className="font-semibold">
                  {formatCurrencyValue(Number(preciseRound(balance, 2)))}
                </span>
              </>
            ) : (
              <span className="font-semibold">?</span>
            )}
          </p>
          <p className="col-span-2">
            Your GUILD voting weight:{" "}
            <span className="font-semibold">
              {guildReceived != undefined
                ? preciseRound(guildReceived + notUsed, 2)
                : "?"}
            </span>
          </p>
        </div>
        <div className="relative mt-4 rounded-md">
          <input
            onChange={(e) => setAddressValue(e.target.value as string)}
            value={addressValue as string}
            className="block w-full rounded-md border-2 border-gray-300 py-3 pl-7 pr-12 text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:text-lg sm:leading-6"
            placeholder="0x3...297"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-gray-500 dark:text-gray-50 sm:text-lg">
              Address to Delegate GUILD
            </span>
          </div>
        </div>
        <div className="m-1 flex justify-start">
          <button
            className="text-sm font-medium text-brand-500 hover:text-brand-400 dark:text-gray-300 dark:hover:text-gray-200"
            onClick={(e) => setAddressValue(address as Address)}
          >
            Delegate to myself
          </button>
        </div>
        <div className="relative mt-4 rounded-md">
          <input
            onChange={handleInputChange}
            value={value as number}
            className="block w-full rounded-md border-2 border-gray-300 py-3 pl-7 pr-12 text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:text-lg sm:leading-6"
            placeholder="0"
            pattern="^[0-9]*[.,]?[0-9]*$"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-gray-500 dark:text-gray-50 sm:text-lg">
              GUILD to delegate
            </span>
          </div>
        </div>
        <button
          onClick={handledelegate}
          disabled={
            value > notUsed ||
            value <= 0 ||
            value == undefined ||
            isAddress(addressValue) === false
              ? true
              : false
          }
          className={`${style.confirmButton} `}
        >
          Delegate GUILD
        </button>

        <div>
          {isLoadingDelegations ? (
            <div className="mt-4 flex flex-grow flex-col items-center justify-center gap-2">
              <Spinner />
            </div>
          ) : !isConnected ? (
            <div className="my-4 flex items-center justify-center text-gray-700 dark:text-gray-100">
              <p className="text-center">
                You have to connect your wallet to see your delegatees
              </p>
            </div>
          ) : delegatees.length === 0 ? (
            <div className="my-4 flex items-center justify-center text-gray-500 dark:text-gray-100">
              <p>You haven't delegated any GUILD yet</p>
            </div>
          ) : (
            <table className="mt-4 w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="!border-px !border-gray-400"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        onClick={header.column.getToggleSortingHandler()}
                        className="cursor-pointer border-b-[1px] border-gray-200 pb-2 pt-4 text-center text-start dark:border-gray-400"
                      >
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-200">
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
                              }[header.column.getIsSorted() as string] ?? (
                                <FaSort />
                              )}
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
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

export default DelegateGuild
