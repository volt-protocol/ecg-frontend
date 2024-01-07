import { Address, erc20ABI, readContracts } from "wagmi"
import { getPublicClient, readContract } from "@wagmi/core"
import { formatCurrencyValue, formatDecimal, formatNumberDecimal } from "utils/numbers"
import {
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  formatUnits,
  keccak256,
  slice,
  stringToBytes,
} from "viem"
import { getFunctionSignature } from "utils/crypto"
import { generateTermName } from "utils/strings"
import { FROM_BLOCK, SECONDS_IN_DAY } from "utils/constants"
import { DaoTimelockABI, guildContract } from "lib/contracts"
import { getProposableTermsLogs, getVotableTermsLogs } from "lib/logs/terms"
import getToken from "lib/getToken"

//get the newly created terms using TermCreated event from LendingTermOnboarding contract
export const getProposableTerms = async () => {

  const proposableTermsLogs = await getProposableTermsLogs()

  const proposableTerms = await Promise.all(
    proposableTermsLogs
      .map(async (log) => {
        const collateralTokenDetails = await getToken(
          log.params.collateralToken as Address
        )

        //Calulate borrow ratio and interest rate
        const calculatedBorrowRatio = Number(
          formatNumberDecimal(
            Number(log.params.maxDebtPerCollateralToken) /
              (Number(10 ** (18 - collateralTokenDetails[0].result)) * 1e18)
          )
        )

        const calculatedInterestRate = Number(
          formatDecimal(Number(formatUnits(log.params.interestRate, 18)), 3)
        )

        return {
          termAddress: log.term,
          collateralTokenSymbol: collateralTokenDetails[1].result,
          termName: generateTermName(
            collateralTokenDetails[1].result,
            calculatedInterestRate,
            calculatedBorrowRatio
          ),
          collateralToken: log.params.collateralToken as Address,
          openingFee: Number(formatUnits(log.params.openingFee, 18)) * 100,
          interestRate: (calculatedInterestRate * 100).toFixed(1),
          borrowRatio: calculatedBorrowRatio,
          maxDelayBetweenPartialRepay: formatDecimal((
            Number(log.params.maxDelayBetweenPartialRepay) / SECONDS_IN_DAY
          ), 1),
          minPartialRepayPercent: formatDecimal((
            Number(formatUnits(log.params.minPartialRepayPercent, 18)) * 100
          ), 4),
          hardCap: formatCurrencyValue(Number(formatUnits(log.params.hardCap, 18))),
        }
      })
  )

  return proposableTerms
}

export const getVotableTerms = async () => {
  const votableTermsLogs = await getVotableTermsLogs()

  const votableTerms = await Promise.all(
    votableTermsLogs
      .map(async (log) => {
        const collateralTokenDetails = await getToken(
          log.params.collateralToken as Address
        )

        //Calulate borrow ratio and interest rate
        const calculatedBorrowRatio = Number(
          formatNumberDecimal(
            Number(log.params.maxDebtPerCollateralToken) /
              (Number(10 ** (18 - collateralTokenDetails[0].result)) * 1e18)
          )
        )

        const calculatedInterestRate = Number(
          formatDecimal(Number(formatUnits(log.params.interestRate, 18)), 3)
        )

        return {
          termAddress: log.term,
          collateralTokenSymbol: collateralTokenDetails[1].result,
          termName: generateTermName(
            collateralTokenDetails[1].result,
            calculatedInterestRate,
            calculatedBorrowRatio
          ),
          collateralToken: log.params.collateralToken as Address,
          openingFee: Number(formatUnits(log.params.openingFee, 18)) * 100,
          interestRate: (calculatedInterestRate * 100).toFixed(1),
          borrowRatio: calculatedBorrowRatio,
          maxDelayBetweenPartialRepay: formatDecimal((
            Number(log.params.maxDelayBetweenPartialRepay) / SECONDS_IN_DAY
          ), 4),
          minPartialRepayPercent: formatDecimal((
            Number(formatUnits(log.params.minPartialRepayPercent, 18)) * 100
          ), 4),
          hardCap: formatCurrencyValue(Number(formatUnits(log.params.hardCap, 18))),
        }
      })
  )

  return votableTerms
}


export const checkVetoVoteValidity = (targets: Address[], datas: string[]): boolean => {
  //check if there are 3 calls scheduled
  if (targets.length != 3) {
    return false
  }

  //check the targets
  if (targets[0] != process.env.NEXT_PUBLIC_ERC20_GUILD_ADDRESS) {
    return false
  }
  if (
    targets[1] != process.env.NEXT_PUBLIC_CORE_ADDRESS &&
    targets[2] != process.env.NEXT_PUBLIC_CORE_ADDRESS
  ) {
    return false
  }

  //check the datas
  if (!datas[0].startsWith(getFunctionSignature("addGauge(uint256,address)"))) {
    return false
  }

  if (
    !datas[1].startsWith(getFunctionSignature("grantRole(bytes32,address)")) &&
    !datas[2].startsWith(getFunctionSignature("grantRole(bytes32,address)"))
  ) {
    return false
  }

  return true
}

export const getProposalIdFromActionId = (actionId: string) => {
  return keccak256(
    encodeAbiParameters(
      [
        { name: "targets", type: "address[]" },
        { name: "values", type: "uint256[]" },
        { name: "calldatas", type: "bytes[]" },
        { name: "descriptionHash", type: "bytes32" },
      ],
      [
        [process.env.NEXT_PUBLIC_ONBOARD_TIMELOCK_ADDRESS as Address],
        [BigInt(0)],
        [
          encodeFunctionData({
            abi: DaoTimelockABI,
            functionName: "cancel",
            args: [actionId],
          }),
        ],
        keccak256(
          stringToBytes(
            "Veto proposal for " + encodePacked(["string"], [actionId as Address])
          )
        ),
      ]
    )
  )
}
