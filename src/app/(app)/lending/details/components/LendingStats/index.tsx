import { QuestionMarkIcon, TooltipHorizon } from "components/tooltip"
import Widget from "components/widget/Widget"
import { AiFillClockCircle } from "react-icons/ai"
import { BsBank2 } from "react-icons/bs"
import { GiProgression } from "react-icons/gi"
import { MdBarChart, MdCurrencyExchange } from "react-icons/md"
import { TbArrowsExchange } from "react-icons/tb"
import { LendingTerms } from "types/lending"
import { formatDecimal, formatNumberDecimal, formatCurrencyValue, toLocaleString } from "utils/numbers"
import { formatUnits } from "viem"
import { secondsToAppropriateUnit } from "utils/date"

export default function LendingStats({
  lendingTermData,
  currentDebt,
  debtCeiling,
  utilization,
  termTotalCollateral,
  collateralPrice,
  creditMultiplier,
}: {
  lendingTermData: LendingTerms
  currentDebt: number
  debtCeiling: number
  utilization: string
  termTotalCollateral: number
  collateralPrice: number
  creditMultiplier: bigint
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5 xs:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-6">
      <TooltipHorizon
        extra="dark:text-gray-200"
        content={
          <>
            <p>
              Total Collateral Amount :{" "}
              <span className="font-semibold">
                {formatDecimal(termTotalCollateral, 2)}
              </span>{" "}
              {lendingTermData.collateral.symbol}
            </p>
            <p>
              Unit Collateral Price :{" "}
              <span className="font-semibold">{collateralPrice}</span> $
            </p>
            <p>
              Total Collateral Value :{" "}
              <span className="font-semibold">
                {formatDecimal(termTotalCollateral * collateralPrice, 2)}
              </span>{" "}
              $
            </p>
          </>
        }
        trigger={
          <div>
            <Widget
              icon={<BsBank2 className="h-7 w-7" />}
              title={"TVL"}
              subtitle={
                collateralPrice === 0
                  ? "$ -.--"
                  :  "$ " + formatCurrencyValue(
                      parseFloat(
                        formatNumberDecimal(termTotalCollateral * collateralPrice)
                      )
                    )
              }
              extra={<QuestionMarkIcon />}
            />
          </div>
        }
        placement="bottom"
      />
      <TooltipHorizon
        extra="dark:text-gray-200 w-[240px]"
        content={
          <div>
            <p>
              Current Debt :{" "}
              <span className="font-semibold">{formatDecimal(currentDebt, 2)}</span> gUSDC
            </p>
            <p>
              Debt Ceilling :{" "}
              <span className="font-semibold">{formatDecimal(debtCeiling, 2)}</span>{" "}
              gUSDC
            </p>
            <p>
              <br />
              New borrows increase the Current Debt. GUILD & gUSDC stake increase the Debt
              Ceiling.
            </p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<GiProgression className="h-6 w-6" />}
              title={"Utilization"}
              subtitle={
                utilization === "NaN"
                  ? "-.--%"
                  : formatDecimal((currentDebt / debtCeiling) * 100, 2) + "%"
              }
              extra={<QuestionMarkIcon />}
            />
          </div>
        }
        placement="bottom"
      />
      <TooltipHorizon
        extra="dark:text-gray-200 w-[240px]"
        content={
          <div>
            <p>
              The opening fee is added to the interest owed directly after you open a new
              loan.
            </p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<MdBarChart className="h-7 w-7" />}
              title={"Opening Fee"}
              subtitle={
                formatDecimal(lendingTermData.openingFee * 100, 2).toString() + "%"
              }
              extra={<QuestionMarkIcon />}
            />
          </div>
        }
        placement="bottom"
      />
      <TooltipHorizon
        extra="dark:text-gray-200 w-[240px]"
        content={
          <div>
            <p>
              Interest rate is non-compounding, and is charged based on a period of ~1
              year (31557600 seconds).
            </p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<TbArrowsExchange className="h-6 w-6" />}
              title={"Interest Rate"}
              subtitle={
                formatDecimal(lendingTermData.interestRate * 100, 2).toString() + "%"
              }
              extra={<QuestionMarkIcon />}
            />
          </div>
        }
        placement="bottom"
      />
      <TooltipHorizon
        extra="dark:text-gray-200 w-[240px]"
        content={
          <div>
            <p>
              This term allows to borrow{" "}
              <span className="font-semibold">
                {toLocaleString(
                  formatDecimal(
                    lendingTermData.borrowRatio /
                      Number(formatUnits(creditMultiplier, 18)),
                    2
                  )
                )}
              </span>{" "}
              gUSDC per unit of {lendingTermData.collateral.symbol} collateral.
            </p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<MdCurrencyExchange className="h-7 w-7" />}
              title={"Borrow Ratio"}
              subtitle={toLocaleString(
                formatDecimal(
                  lendingTermData.borrowRatio / Number(formatUnits(creditMultiplier, 18)),
                  2
                )
              )}
              extra={<QuestionMarkIcon />}
            />
          </div>
        }
        placement="bottom"
      />
      <TooltipHorizon
        extra="dark:text-gray-200 w-[300px]"
        content={
          <>
            <p>
              Periodic Payment minimum size :{" "}
              <span className="font-semibold">
                {lendingTermData.minPartialRepayPercent}%
              </span>
            </p>
            <p>
              Periodic Payment maximum interval :{" "}
              <span className="font-semibold">
                {secondsToAppropriateUnit(lendingTermData.maxDelayBetweenPartialRepay)}
              </span>
            </p>
            <p>
              <br />
              As a borrower, if you miss Periodic Payments, your loan will be called.
            </p>
          </>
        }
        trigger={
          <div className="">
            <Widget
              icon={<AiFillClockCircle className="h-6 w-6" />}
              title={"Periodic Payments"}
              subtitle={lendingTermData.maxDelayBetweenPartialRepay != 0 ? "Yes" : "No"}
              extra={<QuestionMarkIcon />}
            />
          </div>
        }
        placement="left"
      />
    </div>
  )
}
