import React, { useEffect, useState } from "react"
import { Address, readContract, waitForTransaction, writeContract } from "@wagmi/core"
import { toastError, toastRocket } from "components/toast"
import { CreditABI, creditContract } from "lib/contracts"
import { DecimalToUnit, UnitToDecimal, preciseRound } from "utils/utils-old"
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa"
import { Step } from "components/stepLoader/stepType"
import StepModal from "components/stepLoader"
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table"
import { getTitleDisabled, style } from "./helper"
import { MdOpenInNew } from "react-icons/md"
import Spinner from "components/spinner"
import { useAccount } from "wagmi"
import ButtonDanger from "components/button/ButtonDanger"
import { formatCurrencyValue, formatDecimal } from "utils/numbers"
import { formatUnits, isAddress, parseEther } from "viem"
import ButtonPrimary from "components/button/ButtonPrimary"
import DefiInputBox from "components/box/DefiInputBox"

interface Delegatee {
  address: string
  votes: bigint
}

function DelegateCredit({
  creditNotUsed,
  reloadCredit,
  creditBalance,
  creditVotingWeight,
  userAddress,
  isConnected,
}: {
  creditNotUsed: bigint
  reloadCredit: React.Dispatch<React.SetStateAction<boolean>>
  creditBalance: bigint
  creditVotingWeight: bigint
  userAddress: string
  isConnected: boolean
}) {
  const { address } = useAccount()
  const [value, setValue] = useState<string>("")
  const [showModal, setShowModal] = useState(false)
  const [addressValue, setAddressValue] = useState<Address>()
  const [delegatees, setDelegatees] = useState<Delegatee[]>([])
  const [steps, setSteps] = useState<Step[]>()
  const [isLoadingDelegations, setIsLoadingDelegations] = useState<boolean>(true)

  const createSteps = (actionType?: "Delegate" | "Undelegate"): Step[] => {
    if (actionType === "Delegate") {
      return [{ name: "Delegate gUSDC", status: "Not Started" }]
    } else {
      return [{ name: "Undelegate gUSDC", status: "Not Started" }]
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as string)
    }
  }

  async function getDelegatee(): Promise<string[]> {
    const result = await readContract({
      ...creditContract,
      functionName: "delegates",
      args: [userAddress],
    })
    return result as string[]
  }

  useEffect(() => {
    const tempDelegatees: Delegatee[] = []
    async function getDelegateeAndVotes(delegatee: string): Promise<void> {
      const result = await readContract({
        ...creditContract,
        functionName: "delegatesVotesCount",
        args: [userAddress, delegatee],
      })

      if (result != BigInt(0)) {
        tempDelegatees.push({
          address: delegatee,
          votes: result as bigint,
        })
      }
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
  }, [isConnected, creditNotUsed])

  /* Smart contract write */
  async function handleDelegate(): Promise<void> {
    if (Number(value) > creditNotUsed) {
      toastError("You can't delegate more than your available GUILD")
      return
    }
    if (Number(value) <= 0) {
      toastError("You can't delegate 0 GUILD")
      return
    }
    if (!isAddress(addressValue)) {
      toastError("You must enter a valid address")
      return
    }
    setSteps(createSteps("Delegate"))
    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }
    try {
      setShowModal(true)
      updateStepStatus("Delegate gUSDC", "In Progress")
      const { hash } = await writeContract({
        ...creditContract,
        functionName: "incrementDelegation",
        args: [addressValue, parseEther(value.toString())],
      })

      const checkdelegate = await waitForTransaction({
        hash: hash,
      })

      if (checkdelegate.status != "success") {
        updateStepStatus("Delegate gUSDC", "Error")

        return
      }

      updateStepStatus("Delegate gUSDC", "Success")
      setValue("")
      setAddressValue("")
      reloadCredit(true)
    } catch (e) {
      console.log(e)
      updateStepStatus("Delegate gUSDC", "Error")
      toastError("Transaction failed")
    }
  }

  async function handleUndelegate(address: string, amount: bigint): Promise<void> {
    setSteps(createSteps("Undelegate"))

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }
    try {
      setShowModal(true)
      updateStepStatus("Undelegate gUSDC", "In Progress")
      const { hash } = await writeContract({
        ...creditContract,
        functionName: "undelegate",
        args: [address, amount],
      })

      const checkdelegate = await waitForTransaction({
        hash: hash,
      })

      if (checkdelegate.status != "success") {
        updateStepStatus("Undelegate gUSDC", "Error")

        return
      }

      updateStepStatus("Undelegate gUSDC", "Success")
      setValue("")
      setAddressValue("")
      reloadCredit(true)
    } catch (e) {
      console.log(e)
      updateStepStatus("Undelegate gUSDC", "Error")
      toastError("Transaction failed")
    }
  }
  /* End Smart contract write */

  /* Table */
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
            process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_ADDRESS
          }/${info.getValue()}`}
        >
          {info.getValue() == address
            ? "Yourself"
            : info.getValue().slice(0, 4) + "..." + info.getValue().slice(-4)}{" "}
          <MdOpenInNew />
        </a>
      ),
    }),
    columnHelper.accessor("votes", {
      id: "votes",
      header: "gUSDC Delegated",
      enableSorting: true,
      cell: (info) => (
        <p className="text-sm font-bold text-gray-600 dark:text-gray-200">
          {formatDecimal(Number(formatUnits(info.getValue(), 18)), 2)}
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
            onClick={() =>
              handleUndelegate(info.row.original.address, info.row.original.votes)
            }
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
  /* End Table */

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
      <div className="mt-4 h-full rounded-xl text-gray-700 dark:text-gray-200">
        <div className="my-2 -mt-1 grid grid-cols-2 gap-y-1">
          <p className="col-span-2">
            Your gUSDC balance :{" "}
            <span className="font-semibold">
              {creditBalance
                ? formatDecimal(Number(formatUnits(creditBalance, 18)), 2)
                : 0}
            </span>
          </p>
          <p className="col-span-2">
            Your gUSDC voting weight:{" "}
            <span className="font-semibold">
              {creditVotingWeight
                ? formatDecimal(Number(formatUnits(creditVotingWeight, 18)), 2)
                : 0}
            </span>
          </p>
        </div>

        <DefiInputBox
          topLabel="Delegate gUSDC to"
          placeholder="0x..."
          inputSize="text-xl"
          pattern="^[0-9a-fA-F]$"
          value={addressValue as Address}
          onChange={(e) => setAddressValue(e.target.value as Address)}
          rightLabel={
            <button
              className="text-sm font-medium text-brand-500 hover:text-brand-400"
              onClick={(e) => setAddressValue(address as Address)}
            >
              Delegate to myself
            </button>
          }
        />

        {/* <div className="relative mt-4 rounded-xl bg-brand-100/50">
          <div className="mb-1 px-5 pt-4 text-sm font-medium text-gray-700">
            Delegate gUSDC to
          </div>
          <input
            onChange={(e) => setAddressValue(e.target.value as Address)}
            value={addressValue as Address}
            className="block w-full border-gray-300 bg-brand-100/0 px-5 text-xl text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:text-xl sm:leading-6"
            placeholder="0x..."
            pattern="^[0-9a-fA-F]$"
          />
          <div className="mt-1 flex justify-end px-5 pb-4">
            <button
              className="text-sm font-medium text-brand-500 hover:text-brand-400 dark:text-gray-300 dark:hover:text-gray-200"
              onClick={(e) => setAddressValue(address as Address)}
            >
              Delegate to myself
            </button>
          </div>
        </div> */}

        <DefiInputBox
          topLabel="Delegate gUSDC"
          currencyLogo="/img/crypto-logos/credit.png"
          currencySymbol="gUSDC"
          placeholder="0"
          inputSize="text-2xl sm:text-3xl"
          pattern="^[0-9]*[.,]?[0-9]*$"
          value={value}
          onChange={handleInputChange}
          rightLabel={
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Available:{" "}
                {creditNotUsed
                  ? formatDecimal(Number(formatUnits(creditNotUsed, 18)), 2)
                  : 0}
              </p>
              <button
                className="text-sm font-medium text-brand-500 hover:text-brand-400"
                onClick={(e) => setValue(formatUnits(creditNotUsed, 18))}
              >
                Max
              </button>
            </>
          }
        />

        {/* <div className="relative mt-2 rounded-xl bg-brand-100/50">
          <div className="mb-1 px-5 pt-4 text-sm font-medium text-gray-700">
            Amount of gUSDC you delegate
          </div>
          <input
            onChange={handleInputChange}
            value={value}
            className="block w-full border-gray-300 bg-brand-100/0 px-5 text-2xl text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:text-3xl sm:leading-6"
            placeholder="0"
            pattern="^[0-9]*[.,]?[0-9]*$"
          />
          <div className="mt-1 flex justify-end gap-1 px-5 pb-4">
            <p className="text-sm font-medium text-gray-700">
              Available:{" "}
              {creditNotUsed ? formatDecimal(Number(formatUnits(creditNotUsed, 18)), 2) : 0}
            </p>
            <button
              className="text-sm font-medium text-brand-500 hover:text-brand-400 dark:text-gray-300 dark:hover:text-gray-200"
              onClick={(e) => setValue(formatUnits(creditNotUsed, 18))}
            >
              Max
            </button>
          </div>
        </div> */}

        <ButtonPrimary
          variant="lg"
          title="Delegate gUSDC"
          titleDisabled={getTitleDisabled(Number(value), addressValue, creditNotUsed)}
          extra="w-full mt-2 !rounded-xl"
          onClick={handleDelegate}
          disabled={
            !creditNotUsed ||
            Number(value) > Number(formatUnits(creditNotUsed, 18)) ||
            Number(value) <= 0 ||
            !value ||
            !isAddress(addressValue)
          }
        />

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
              <p>You haven't delegated any gUSDC yet</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </>
  )
}
export default DelegateCredit
