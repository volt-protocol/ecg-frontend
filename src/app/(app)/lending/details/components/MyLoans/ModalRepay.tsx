"use client"

import { Fragment, useEffect, useState } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { MdWarning } from "react-icons/md"
import ButtonPrimary from "components/button/ButtonPrimary"
import DefiInputBox from "components/box/DefiInputBox"
import { formatDecimal, gUsdcToUsdc, usdcToGUsdc } from "utils/numbers"
import { formatUnits, parseUnits } from "viem"
import { getTitleDisabled } from "./helper"
import Link from "next/link"
import { min } from "moment"

export default function ModalRepay({
  isOpen,
  setOpen,
  creditBalance,
  usdcBalance,
  creditMultiplier,
  rowData,
  repay,
  partialRepay,
  minBorrow,
}: {
  isOpen: boolean
  setOpen: (arg: boolean) => void
  creditBalance: bigint
  usdcBalance: bigint
  creditMultiplier: bigint
  rowData: any
  repay: (id: string) => void
  partialRepay: (id: string, amount: string) => void
  minBorrow: bigint
}) {
  const [value, setValue] = useState<string>("")
  const [match, setMatch] = useState<boolean>(false)

  // Reset value when modal opens
  useEffect(() => {
    setValue("")
  }, [isOpen])

  useEffect(() => {
    rowData &&
      setMatch(parseUnits(value, 6) >= gUsdcToUsdc(rowData.loanDebt, creditMultiplier))
  }, [value, rowData])

  /* Handlers */
  const setAvailable = (): string => {
    return formatDecimal(Number(formatUnits(usdcBalance, 6)), 2)
  }

  const setMax = () => {
    usdcBalance > gUsdcToUsdc(rowData.loanDebt, creditMultiplier)
      ? setValue(formatUnits(gUsdcToUsdc(rowData.loanDebt, creditMultiplier), 6))
      : setValue(formatUnits(usdcBalance, 6))
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Vérifier si la valeur saisie ne contient que des numéros
    if (/^[0-9]*\.?[0-9]*$/i.test(inputValue)) {
      usdcToGUsdc(parseUnits(inputValue, 6), creditMultiplier) > rowData.loanDebt
        ? setValue(formatUnits(gUsdcToUsdc(rowData.loanDebt, creditMultiplier), 6))
        : setValue(inputValue as string)
    }
  }
  /* End Handlers */

  return (
    <>
      {rowData && (
        <Transition.Root show={isOpen} as={Fragment}>
          <Dialog as="div" className="relative z-[40]" onClose={setOpen}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-navy-900/90" />
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
                  <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-4 text-left shadow-xl transition-all dark:bg-navy-800 sm:my-8 sm:w-full sm:max-w-lg sm:p-5">
                    <h3 className="text-xl font-medium text-gray-800 dark:text-white">
                      Repay Loan
                    </h3>

                    <div className="mt-2 flex w-full flex-col gap-2">
                      <DefiInputBox
                        topLabel={"Amount of USDC to repay"}
                        currencyLogo="/img/crypto-logos/usdc.png"
                        currencySymbol="USDC"
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
                              usdcBalance >
                                gUsdcToUsdc(rowData.loanDebt, creditMultiplier)
                                ? "Full Repay"
                                : "Max"}
                            </button>
                          </>
                        }
                      />

                      <ButtonPrimary
                        variant="lg"
                        title={
                          rowData &&
                          parseUnits(value, 6) >=
                            gUsdcToUsdc(rowData.loanDebt, creditMultiplier)
                            ? "Full Repay"
                            : "Partial Repay"
                        }
                        titleDisabled={getTitleDisabled(
                          value,
                          rowData.loanDebt,
                          usdcBalance,
                          creditMultiplier,
                          minBorrow,
                          match
                        )}
                        extra="w-full !rounded-xl"
                        disabled={
                          !value ||
                          parseUnits(value, 6) > usdcBalance ||
                          (!match &&
                            rowData.loanDebt -
                              usdcToGUsdc(parseUnits(value, 6), creditMultiplier) <
                              minBorrow)
                        }
                        onClick={() =>
                          match ? repay(rowData.id) : partialRepay(rowData.id, value)
                        }
                      />

                      {/* TODO */}
                      {parseUnits(value, 6) >
                        gUsdcToUsdc(creditBalance, creditMultiplier) && (
                        <div className="my-1 flex items-center justify-center gap-x-3 rounded-md bg-amber-100 px-2.5 py-1.5 text-sm text-amber-500/90 dark:bg-amber-100/0 dark:text-amber-500">
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
                      {/* END TODO */}
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
