import { Address, getPublicClient, writeContract, waitForTransaction } from "@wagmi/core"
import DropdownSelect from "components/select/DropdownSelect"
import Spinner from "components/spinner"
import StepModal from "components/stepLoader"
import { Step } from "components/stepLoader/stepType"
import { use, useEffect, useState } from "react"
import Create, { CreateTermForm } from "./Create"
import { formatEther, formatUnits } from "viem"
import {
  decimalToUnit,
  formatCurrencyValue,
  formatDecimal,
  formatNumberDecimal,
} from "utils/numbers"
import { toastError } from "components/toast"
import { getProposableTerms } from "./helper"
import ButtonPrimary from "components/button/ButtonPrimary"
import { onboardGovernorGuildContract, guildContract } from "lib/contracts"
import { generateTermName } from "utils/strings"
import { SECONDS_IN_DAY } from "utils/constants"
import { MdError, MdOpenInNew, MdWarning } from "react-icons/md"
import { useAccount, useContractReads } from "wagmi"
import { AlertMessage } from "components/message/AlertMessage"

export type ProposedTerm = {
  termAddress: Address
  collateralTokenSymbol: string
  termName: string
  openingFee: number
  interestRate: string
  borrowRatio: number
  hardCap: string
  collateralToken: Address
  maxDelayBetweenPartialRepay: string
  minPartialRepayPercent: string
}

export default function Propose() {
  const { address } = useAccount()
  const [showModal, setShowModal] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [proposableTerms, setProposableTerms] = useState<ProposedTerm[]>([])
  const [selectedTerm, setSelectedTerm] = useState<ProposedTerm | null>(null)
  const [reload, setReload] = useState<boolean>(false)

  const { data, isError, isLoading } = useContractReads({
    contracts: [
      {
        ...onboardGovernorGuildContract,
        functionName: "proposalThreshold",
      },
      {
        ...guildContract,
        functionName: "getVotes",
        args: [address],
      },
    ],
    select: (data) => {
      return {
        proposalThreshold: data[0].result,
        guildVotes: data[1].result,
      }
    },
  })

  const createSteps = (): Step[] => {
    return [{ name: "Propose Onboarding", status: "Not Started" }]
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  useEffect(() => {
    fetchProposableTerms()
  }, [])

  useEffect(() => {
    if (reload) {
      fetchProposableTerms()
      setReload(false)
    }
  }, [reload])

  /* Getters */
  const fetchProposableTerms = async () => {
    setLoading(true)

    const terms = await getProposableTerms()

    setLoading(false)
    setSelectedTerm(terms[0])
    setProposableTerms(terms)
  }

  /* Smart contract Write */
  const proposeOnboard = async (): Promise<void> => {
    //Init Steps
    setSteps([{ name: "Propose Onboard", status: "Not Started" }])

    const updateStepStatus = (stepName: string, status: Step["status"]) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => (step.name === stepName ? { ...step, status } : step))
      )
    }

    try {
      setShowModal(true)
      updateStepStatus("Propose Onboard", "In Progress")

      const { hash } = await writeContract({
        ...onboardGovernorGuildContract,
        functionName: "proposeOnboard",
        args: [selectedTerm?.termAddress],
      })

      const tx = await waitForTransaction({
        hash: hash,
      })

      if (tx.status != "success") {
        updateStepStatus("Propose Onboard", "Error")
        return
      }

      updateStepStatus("Propose Onboard", "Success")
      setReload(true)

    } catch (e: any) {
      updateStepStatus("Propose Onboard", "Error")
      toastError(e.shortMessage)
    }
  }
  /* End Smart contract Write */

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
      <div>
        {loading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {proposableTerms && proposableTerms.length > 0 && (
              <>
                <div className="mt-2 sm:col-span-2 sm:mt-0">
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium leading-6 text-gray-500 dark:text-gray-200"
                  >
                    Select a Term to Propose
                  </label>
                  {proposableTerms && proposableTerms.length > 0 && (
                    <DropdownSelect
                      options={proposableTerms}
                      selectedOption={selectedTerm}
                      onChange={setSelectedTerm}
                      getLabel={(item) => item.termName}
                      extra={"w-full mt-1"}
                    />
                  )}
                </div>
                <div className="mt-4">
                  <dl className="divide-y divide-gray-100 text-gray-700 dark:text-gray-200">
                    <div className="px-1 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Contract Address</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        <a
                          className="flex items-center gap-1 transition-all duration-150 ease-in-out hover:text-brand-500"
                          href={
                            process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_ADDRESS +
                            "/" +
                            selectedTerm?.termAddress
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedTerm?.termAddress.slice(0, 4) +
                            "..." +
                            selectedTerm?.termAddress.slice(-4)}{" "}
                          <MdOpenInNew />
                        </a>
                      </dd>
                    </div>
                    <div className="px-1 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Collateral Token</dt>
                      <dd className="mt-1 flex items-center gap-1 leading-6  sm:col-span-2 sm:mt-0">
                        {selectedTerm?.collateralTokenSymbol}
                        {" · "}
                        <a
                          className="flex items-center gap-1 transition-all duration-150 ease-in-out hover:text-brand-500"
                          href={
                            process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_ADDRESS +
                            "/" +
                            selectedTerm?.collateralToken
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedTerm?.collateralToken.slice(0, 4) +
                            "..." +
                            selectedTerm?.collateralToken.slice(-4)}{" "}
                          <MdOpenInNew />
                        </a>
                      </dd>
                    </div>
                    <div className="px-1 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Opening Fee</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        {selectedTerm?.openingFee}%
                      </dd>
                    </div>
                    <div className="px-1 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Interest Rate</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        {selectedTerm?.interestRate}%
                      </dd>
                    </div>
                    <div className="px-1 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Borrow Ratio</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        {formatNumberDecimal(selectedTerm?.borrowRatio)}
                      </dd>
                    </div>
                    <div className="px-1 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Periodic Payments</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        {selectedTerm?.minPartialRepayPercent}% every{" "}
                        {selectedTerm?.maxDelayBetweenPartialRepay}d
                      </dd>
                    </div>
                    <div className="px-1 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="font-medium ">Hard Cap</dt>
                      <dd className="mt-1 leading-6  sm:col-span-2 sm:mt-0">
                        {selectedTerm?.hardCap}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-2 block w-full">
                  <ButtonPrimary
                    onClick={() => proposeOnboard()}
                    type="button"
                    title={`Propose Onboard`}
                    extra="w-full"
                    disabled={!selectedTerm || data?.guildVotes < data?.proposalThreshold}
                  />
                  {data?.guildVotes < data?.proposalThreshold && (
                    <AlertMessage
                      type="danger"
                      message={
                        <>
                          {formatUnits(data?.proposalThreshold, 18) +
                            " GUILD available to Propose Onboard"}
                        </>
                      }
                    />
                  )}
                </div>
              </>
            )}
            {proposableTerms && proposableTerms.length == 0 && (
              <div className="mt-2 flex justify-center">
                There is no term to propose at the moment
              </div>
            )}
          </>
        )}
      </div>
    </>
  ) 
}
