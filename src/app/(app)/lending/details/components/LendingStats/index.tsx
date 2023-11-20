import { QuestionMarkIcon, TooltipHorizon } from "components/tooltip"
import Widget from "components/widget/Widget"
import { AiFillClockCircle } from "react-icons/ai"
import { BsBank2 } from "react-icons/bs"
import { GiProgression } from "react-icons/gi"
import { MdBarChart, MdCurrencyExchange } from "react-icons/md"
import { TbArrowsExchange } from "react-icons/tb"
import { formatDecimal, formatNumberDecimal } from "utils/numbers"
import {
  formatCurrencyValue,
  preciseRound,
  secondsToAppropriateUnit,
} from "utils/utils-old"

export default function LendingStats({
  lendingTermData,
  currentDebt,
  debtCeilling,
  utilization,
  termTotalCollateral,
  collateralPrice,
}: {
  lendingTermData: any
  currentDebt: any
  debtCeilling: any
  utilization: any
  termTotalCollateral: any
  collateralPrice: any
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
                {preciseRound(termTotalCollateral, 2)}
              </span>{" "}
              {lendingTermData.collateral}
            </p>
            <p>
              Unit Collateral Price :{" "}
              <span className="font-semibold">{collateralPrice}</span> $
            </p>
            <p>
              Total Collateral Value :{" "}
              <span className="font-semibold">
                {preciseRound(termTotalCollateral * collateralPrice, 0)}
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
                  ? "-.--$"
                  : formatCurrencyValue(
                      parseFloat(
                        formatNumberDecimal(
                          termTotalCollateral * collateralPrice
                        )
                      )
                    ) + "$"
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
              <span className="font-semibold">
                {preciseRound(currentDebt, 0)}
              </span>{" "}
              CREDIT
            </p>
            <p>
              Debt Ceilling :{" "}
              <span className="font-semibold">
                {preciseRound(debtCeilling, 0)}
              </span>{" "}
              CREDIT
            </p>
            <p>
              <br />
                New borrows increase the Current Debt.{" "}
                GUILD & CREDIT stake increase the Debt Ceiling.
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
                  : preciseRound((currentDebt / debtCeilling) * 100, 2) + "%"
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
              The opening fee is added to the interest owed directly after you open a new loan.
            </p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<MdBarChart className="h-7 w-7" />}
              title={"Opening Fee"}
              subtitle={
                preciseRound(lendingTermData.openingFee, 2).toString() + "%"
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
              Interest rate is non-compounding, and is charged based on a period of ~1 year (31557600 seconds).
            </p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<TbArrowsExchange className="h-6 w-6" />}
              title={"Interest Rate"}
              subtitle={
                preciseRound(lendingTermData.interestRate * 100, 2).toString() +
                "%"
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
                {preciseRound(lendingTermData.borrowRatio, 2)}
              </span>{" "}
              CREDIT per unit of DAI collateral.
            </p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<MdCurrencyExchange className="h-7 w-7" />}
              title={"Borrow Ratio"}
              subtitle={preciseRound(lendingTermData.borrowRatio, 2).toString()}
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
                {formatDecimal(lendingTermData.minPartialRepayPercent, 9)}%
              </span>
            </p>
            <p>
              Periodic Payment maximum interval :{" "}
              <span className="font-semibold">
                {secondsToAppropriateUnit(
                  lendingTermData.maxDelayBetweenPartialRepay
                )}
              </span>
            </p>
            <p>
              <br />
                As a borrower, if you miss Periodic Payments, your loan will be
                called.
            </p>
          </>
        }
        trigger={
          <div className="">
            <Widget
              icon={<AiFillClockCircle className="h-6 w-6" />}
              title={"Periodic Payments"}
              subtitle={lendingTermData.minPartialRepayPercent ? "Yes" : "No"}
              extra={<QuestionMarkIcon />}
            />
          </div>
        }
        placement="left"
      />
    </div>
  )
}
