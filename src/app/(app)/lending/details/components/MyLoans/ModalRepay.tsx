"use client"

import { Fragment, useEffect, useState } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { MdCheck, MdWarning } from "react-icons/md"
import ButtonPrimary from "components/button/ButtonPrimary"
import clsx from "clsx"
import DefiInputBox from "components/box/DefiInputBox"
import { LendingTerms } from "types/lending"
import { formatDecimal } from "utils/numbers"
import { formatUnits } from "viem"
import { getTitleDisabled } from "./helper"
import Link from "next/link"

export default function ModalRepay({
  lendingTerm,
  isOpen,
  setOpen,
  creditBalance,
  rowData,
  repay,
  partialRepay,
}: {
  lendingTerm: LendingTerms
  isOpen: boolean
  setOpen: (arg: boolean) => void
  creditBalance: number
  rowData: any
  repay: (id: string, borrowAmount: BigInt) => void
  partialRepay: (id: string, amount: string) => void
}) {
  const [value, setValue] = useState<string>("")
  const [match, setMatch] = useState<boolean>(false)
  const setAvailable = (): string => {
    return formatDecimal(creditBalance, 2)
  }

  useEffect(() => {
    setValue("")
  }, [isOpen])

  useEffect(() => {
    rowData && setMatch(Number(value) >= Number(formatUnits(rowData.loanDebt, 18)))
  }, [value, rowData])

  const setMax = () => {
    setValue(creditBalance.toString())
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^\d*$/.test(inputValue)) {
      setValue(inputValue as string)
    }
  }

  return (
    <>
      {rowData && (
        <Transition.Root show={isOpen} as={Fragment}>
          <Dialog as="div" className="z-[40] relative" onClose={setOpen}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-500 dark:bg-navy-900/90 bg-opacity-75 transition-opacity" />
            </Transition.Child>

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                  enterTo="opacity-100 translate-y-0 sm:scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                  leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                >
                  <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-navy-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                    <h3 className="text-xl font-medium text-gray-800 dark:text-white">
                      Repay Loan
                    </h3>

                    <div className="w-full">
                      <DefiInputBox
                        topLabel={"Amount of gUSDC to repay"}
                        currencyLogo="/img/crypto-logos/credit.png"
                        currencySymbol="gUSDC"
                        placeholder="0"
                        pattern="^[0-9]*[.,]?[0-9]*$"
                        inputSize="text-2xl sm:text-3xl"
                        value={value}
                        onChange={handleValueChange}
                        rightLabel={
                          <>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Available: {setAvailable()}
                            </p>
                            <button
                              className="text-sm font-medium text-brand-500 hover:text-brand-400"
                              onClick={(e) => setMax()}
                            >
                              {rowData &&
                              creditBalance <= Number(formatUnits(rowData.loanDebt, 18))
                                ? "Max"
                                : "Full Repay"}
                            </button>
                          </>
                        }
                      />

                      <ButtonPrimary
                        variant="lg"
                        title={
                          rowData &&
                          Number(value) >= Number(formatUnits(rowData.loanDebt, 18))
                            ? "Full Repay"
                            : "Partial Repay"
                        }
                        titleDisabled={getTitleDisabled(
                          Number(value),
                          rowData.loanDebt,
                          creditBalance
                        )}
                        extra="w-full mt-4 !rounded-xl"
                        disabled={!value || Number(value) > creditBalance}
                        onClick={() =>
                          match
                            ? repay(
                                rowData.id,
                                rowData.loanDebt +
                                  (rowData.loanDebt * BigInt(5)) / BigInt(10000000)
                              )
                            : partialRepay(rowData.id, value)
                        }
                      />

                      {Number(value) > creditBalance && (
                        <div className="my-4 flex items-center justify-center gap-x-3 rounded-md bg-amber-100 px-2.5 py-1.5 text-sm text-amber-500/90 dark:bg-amber-100/0 dark:text-amber-500">
                          <MdWarning className="h-5 w-5" />
                          <p>
                            You do not have enought gUSDC. Go to{" "}
                            <Link href="/mint" className="font-bold">
                              Mint & Saving
                            </Link>{" "}
                            to mint new gUSDCs.
                          </p>
                        </div>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition.Root>
      )}
    </>
  )
}
