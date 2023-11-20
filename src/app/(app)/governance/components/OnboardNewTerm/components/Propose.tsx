import { Address, getPublicClient, writeContract, waitForTransaction } from "@wagmi/core"
import DropdownSelect from "components/select/DropdownSelect"
import Spinner from "components/spinner"
import StepModal from "components/stepLoader"
import { Step } from "components/stepLoader/stepType"
import { useEffect, useState } from "react"
import Create, { CreateTermForm } from "./Create"
import { formatEther, formatUnits } from "viem"
import {
  decimalToUnit,
  formatCurrencyValue,
  formatDecimal,
  formatNumberDecimal,
} from "utils/numbers"
import { toastError } from "components/toast"
import { getToken } from "./helper"
import ButtonPrimary from "components/button/ButtonPrimary"
import { lendingTermOnboardingContract, guildContract } from "lib/contracts"
import { generateTermName } from "utils/strings"
import { SECONDS_IN_DAY } from "utils/constants"
import { MdOpenInNew } from "react-icons/md"
import { useAccount, useContractReads } from "wagmi"

export type PropoosedTerm = {
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
  const [lendingTermsCreated, setLendingTermsCreated] = useState<PropoosedTerm[]>([])
  const [selectedTerm, setSelectedTerm] = useState<PropoosedTerm | null>(null)
  const [collateralTokenDecimal, setCollateralTokenDecimal] = useState<number>()
  const [collateralTokenSymbol, setCollateralTokenSymbol] = useState<string>()

  const { data, isError, isLoading } = useContractReads({
    contracts: [
      {
        ...lendingTermOnboardingContract,
        functionName: "proposalThreshold",
      },
      {
        ...guildContract,
        functionName: "getVotes",
        args: [address],
      }
    ],
    select: (data) => {
      return {
        proposalThreshold: data[0].result,
        guildVotes: data[1].result,
      }
    },
  })

  const createSteps = (): Step[] => {
    return [{ name: "Propose Offboarding", status: "Not Started" }]
  }

  const [steps, setSteps] = useState<Step[]>(createSteps())

  useEffect(() => {
    fetchCreatedTerms()
  }, [])

  /* Getters */
  const fetchCreatedTerms = async () => {
    setLoading(true)
    const currentBlock = await getPublicClient().getBlockNumber()

    //logs are returned from oldest to newest
    const logs = await getPublicClient().getLogs({
      address: process.env.NEXT_PUBLIC_LENDING_TERM_ONBOARDING_ADDRESS as Address,
      event: {
        type: "event",
        name: "TermCreated",
        inputs: [
          { type: "uint256", indexed: true, name: "when" },
          { type: "address", indexed: true, name: "term" },
          {
            type: "tuple",
            indexed: false,
            name: "params",
            components: [
              { internalType: "address", name: "collateralToken", type: "address" },
              {
                internalType: "uint256",
                name: "maxDebtPerCollateralToken",
                type: "uint256",
              },
              { internalType: "uint256", name: "interestRate", type: "uint256" },
              {
                internalType: "uint256",
                name: "maxDelayBetweenPartialRepay",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "minPartialRepayPercent",
                type: "uint256",
              },
              { internalType: "uint256", name: "openingFee", type: "uint256" },
              { internalType: "uint256", name: "hardCap", type: "uint256" },
            ],
          },
        ],
      },
      fromBlock: BigInt(20),
      toBlock: currentBlock,
    })

    // build proposed terms data from logs
    const termsCreated = await Promise.all(
      logs.map(async (log) => {
        const collateralTokenDetails = await getToken(
          log.args.params.collateralToken as Address
        )

        //Calulate borrow ratio and interest rate
        const calculatedBorrowRatio = Number(
          formatNumberDecimal(
            Number(log.args.params.maxDebtPerCollateralToken) /
              (Number(10 ** (18 - collateralTokenDetails[0].result)) * 1e18)
          )
        )

        const calculatedInterestRate = Number(
          formatDecimal(Number(formatUnits(log.args.params.interestRate, 18)), 3)
        )

        return {
          termAddress: log.args.term,
          collateralTokenSymbol: collateralTokenDetails[1].result,
          termName: generateTermName(
            collateralTokenDetails[1].result,
            calculatedInterestRate,
            calculatedBorrowRatio
          ),
          collateralToken: log.args.params.collateralToken as Address,
          openingFee: Number(formatUnits(log.args.params.openingFee, 18)) * 100,
          interestRate: (calculatedInterestRate * 100).toFixed(1),
          borrowRatio: calculatedBorrowRatio,
          maxDelayBetweenPartialRepay: (
            Number(log.args.params.maxDelayBetweenPartialRepay) / SECONDS_IN_DAY
          ).toFixed(0),
          minPartialRepayPercent: (
            Number(formatUnits(log.args.params.minPartialRepayPercent, 18)) * 100
          ).toFixed(3),
          hardCap: formatCurrencyValue(Number(formatUnits(log.args.params.hardCap, 18))),
        }
      })
    )

    setLoading(false)
    setSelectedTerm(termsCreated[0])
    setLendingTermsCreated(termsCreated)
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
        ...lendingTermOnboardingContract,
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
      //TODO: trigger refetch terms in offboarding page
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
            <div className="mt-2 sm:col-span-2 sm:mt-0">
              <label
                htmlFor="price"
                className="block text-sm font-medium leading-6 text-gray-500 dark:text-gray-200"
              >
                Select a Term to Propose
              </label>
              {lendingTermsCreated && lendingTermsCreated.length > 0 && (
                <DropdownSelect
                  options={lendingTermsCreated}
                  selectedOption={selectedTerm}
                  onChange={setSelectedTerm}
                  getLabel={(item) => item.termName}
                  extra={"w-full mt-1"}
                />
              )}
            </div>
            <div className="mt-4">
              <dl className="divide-y divide-gray-100">
                <div className="px2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-700">Contract Address</dt>
                  <dd className="mt-1 leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                    <a
                      className="flex items-center gap-1 transition-all duration-150 ease-in-out hover:text-brand-500"
                      href={
                        process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL +
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
                <div className="px2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-700">Collateral Token</dt>
                  <dd className="mt-1 flex items-center gap-1 leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                    {selectedTerm?.collateralTokenSymbol}
                    {" · "}
                    <a
                      className="flex items-center gap-1 transition-all duration-150 ease-in-out hover:text-brand-500"
                      href={
                        process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL +
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
                <div className="px2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-700">Opening Fee</dt>
                  <dd className="mt-1 leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                    {selectedTerm?.openingFee}%
                  </dd>
                </div>
                <div className="px2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-700">Interest Rate</dt>
                  <dd className="mt-1 leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                    {selectedTerm?.interestRate}%
                  </dd>
                </div>
                <div className="px2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-700">Borrow Ratio</dt>
                  <dd className="mt-1 leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                    {formatNumberDecimal(selectedTerm?.borrowRatio)}
                  </dd>
                </div>
                <div className="px2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-700">Periodic Payments</dt>
                  <dd className="mt-1 leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                    {selectedTerm?.minPartialRepayPercent}% every{" "}
                    {selectedTerm?.maxDelayBetweenPartialRepay}d
                  </dd>
                </div>
                <div className="px2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-700">Hard Cap</dt>
                  <dd className="mt-1 leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
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
                disabled={!selectedTerm || data.guildVotes < data.proposalThreshold}
                titleDisabled={formatUnits(data?.proposalThreshold, 18)+' GUILD needed to Propose Onboard'}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}
