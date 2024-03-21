import { Fragment, useState } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { MdCheck } from "react-icons/md"
import ButtonPrimary from "components/button/ButtonPrimary"
import { useAppStore } from "store"

export default function TermsConditionsModal() {
  const [open, setOpen] = useState<boolean>(true)
  const [checkedTerms, isCheckedTerms] = useState<boolean>(false)
  const [checkedRisks, isCheckedRisks] = useState<boolean>(false)
  const { setTermsAccepted } = useAppStore()

  const handleAcceptterms = () => {
    setTermsAccepted(true)
    setOpen(false)
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={() => setOpen(true)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-700 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-[100] w-screen overflow-y-auto">
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-8">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <MdCheck className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center text-sm sm:mt-5 sm:text-base">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      Terms and Conditions
                    </Dialog.Title>
                    <div className="my-2">
                      <p className="text-gray-500">
                        Please carefully read our terms and conditions before using the
                        app.
                      </p>
                    </div>
                    <div className="mb-2 flex items-center justify-center gap-1">
                      <div className="flex h-6 items-center">
                        <input
                          onClick={() => isCheckedRisks(!checkedRisks)}
                          id="risks"
                          aria-describedby="risks-conditions"
                          name="risks"
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:text-brand-500 focus:ring-brand-600"
                        />
                      </div>
                      <div className="leading-6">
                        <label htmlFor="risks" className="text-gray-500 cursor-pointer">
                          I fully agree to the{" "}
                          <a href="/risk-statement" target="_blank" className="font-medium text-brand-500">
                            Risk and Security agreement
                          </a>{" "}
                          of the Ethereum Credit Guild.
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <div className="flex h-6 items-center">
                        <input
                          onClick={() => isCheckedTerms(!checkedTerms)}
                          id="terms"
                          aria-describedby="terms-conditions"
                          name="terms"
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:text-brand-500 focus:ring-brand-600"
                        />
                      </div>
                      <div className="leading-6">
                        <label htmlFor="terms" className="text-gray-500 cursor-pointer">
                          I fully agree to the{" "}
                          <a href="/terms-conditions" target="_blank"  className="font-medium text-brand-500">
                            Terms and Conditions
                          </a>{" "}
                          of the Ethereum Credit Guild.
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <ButtonPrimary
                    onClick={handleAcceptterms}
                    title="Enter the app"
                    extra="w-full"
                    disabled={!checkedTerms || !checkedRisks}
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
