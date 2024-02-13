// Libraries
import { LendingTerms } from "types/lending"
import { StateCreator } from "zustand"
import { getTermsLogs } from "lib/logs/terms"
import { Abi, Address, formatUnits } from "viem"
import { formatDecimal } from "utils/numbers"
import getToken from "lib/getToken"
import { TermABI } from "lib/contracts"
import { readContracts } from "@wagmi/core"
import { coinsList } from "./pair-prices"
import { wagmiConfig } from "contexts/Web3Provider"

export interface LendingTermsSlice {
  lendingTerms: LendingTerms[]
  lastUpdatedTerms: number | null
  fetchLendingTerms: () => void
}

export const createLendingTermsSlice: StateCreator<LendingTermsSlice> = (set, get) => ({
  lendingTerms: [],
  lastUpdatedTerms: null,
  fetchLendingTerms: async () => {
    const termLogs = await getTermsLogs()

    const activeTermLogs = await Promise.all(
      termLogs.map(async (log) => {
        const collateralTokenDetails = await getToken(log.collateralToken as Address)

        const data = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: log.term as Address,
              abi: TermABI as Abi,
              functionName: "issuance",
            },
            {
              address: log.term as Address,
              abi: TermABI as Abi,
              functionName: "debtCeiling",
            },
          ],
        })

        //calcultaed borrow ratio without precision loss and taken into account collateral token decimals
        const calculatedBorrowRatio: bigint =
          BigInt(log.maxDebtPerCollateralToken) /
          BigInt(10 ** (18 - Number(collateralTokenDetails[0].result)))

        //calculate interest rate
        const calculatedInterestRate = Number(
          formatDecimal(Number(formatUnits(log.interestRate, 18)), 3)
        )

        return {
          address: log.term,
          collateral: {
            address: log.collateralToken as Address,
            name: collateralTokenDetails[2].result,
            symbol: collateralTokenDetails[1].result,
            logo: coinsList.find(
              (item) => item.nameECG === collateralTokenDetails[1].result
            )?.logo,
            decimals: collateralTokenDetails[0].result,
          },
          // collateral: collateralTokenDetails[1].result,
          // collateralAddress: log.collateralToken as Address,
          // collateralDecimals: collateralTokenDetails[0].result,
          interestRate: calculatedInterestRate,
          borrowRatio: Number(formatUnits(calculatedBorrowRatio, 18)),
          debtCeiling: Number(formatUnits(data[1].result as bigint, 18)),
          currentDebt: Number(formatUnits(data[0].result as bigint, 18)),
          openingFee: Number(formatUnits(log.openingFee, 18)),
          maxDebtPerCollateralToken: Number(
            formatUnits(log.maxDebtPerCollateralToken, 18)
          ),
          maxDelayBetweenPartialRepay: Number(log.maxDelayBetweenPartialRepay),
          minPartialRepayPercent: formatDecimal(
            Number(formatUnits(log.minPartialRepayPercent, 18)) * 100,
            4
          ),
          status: log.status,
        }
      })
    )

    set({ lendingTerms: activeTermLogs, lastUpdatedTerms: Date.now() })
  },
})
