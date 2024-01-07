// Libraries
import { LendingTerms, LendingTermsResponse } from "types/lending"
import { StateCreator } from "zustand"
import axios, { AxiosResponse } from "axios"
import { getTermsLogs } from "lib/logs/terms"
import { Abi, Address, formatUnits } from "viem"
import { formatCurrencyValue, formatDecimal, formatNumberDecimal } from "utils/numbers"
import { generateTermName } from "utils/strings"
import { SECONDS_IN_DAY } from "utils/constants"
import getToken from "lib/getToken"
import { TermABI } from "lib/contracts"
import { readContracts } from "wagmi"
import { coinsList } from "./pair-prices"

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

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

        const data = await readContracts({
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

        //Calulate borrow ratio and interest rate
        const calculatedBorrowRatio = Number(
          formatNumberDecimal(
            Number(log.maxDebtPerCollateralToken) /
              (Number(10 ** (18 - collateralTokenDetails[0].result)) * 1e18)
          )
        )

        const calculatedInterestRate = Number(
          formatDecimal(Number(formatUnits(log.interestRate, 18)), 3)
        )

        return {
          address: log.term,
          collateral: {
            address: log.collateralToken as Address,
            name: collateralTokenDetails[1].result,
            logo: coinsList.find(item => item.nameECG === collateralTokenDetails[1].result)?.logo,
            decimals: collateralTokenDetails[0].result,
          },
          // collateral: collateralTokenDetails[1].result,
          // collateralAddress: log.collateralToken as Address,
          // collateralDecimals: collateralTokenDetails[0].result,
          interestRate: calculatedInterestRate,
          borrowRatio: calculatedBorrowRatio,
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
          label: generateTermName(
            collateralTokenDetails[1].result,
            calculatedInterestRate,
            calculatedBorrowRatio
          ),
        }
      })
    )

    set({ lendingTerms: activeTermLogs, lastUpdatedTerms: Date.now() })
  },
})
