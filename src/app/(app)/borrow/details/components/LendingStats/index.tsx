import { QuestionMarkIcon, TooltipHorizon } from 'components/tooltip';
import Widget from 'components/widget/Widget';
import { AiFillClockCircle } from 'react-icons/ai';
import { BsBank2 } from 'react-icons/bs';
import { GiProgression } from 'react-icons/gi';
import { MdBarChart, MdCurrencyExchange } from 'react-icons/md';
import { TbArrowsExchange } from 'react-icons/tb';
import { LendingTerms } from 'types/lending';
import { formatDecimal, formatNumberDecimal, formatCurrencyValue } from 'utils/numbers';
import { formatUnits } from 'viem';
import { secondsToAppropriateUnit } from 'utils/date';
import { getPegTokenLogo, marketsConfig } from 'config';
import { useAppStore } from 'store';
import Image from 'next/image';
import ImageWithFallback from 'components/image/ImageWithFallback';

export default function LendingStats({
  lendingTermData,
  currentDebt,
  debtCeiling,
  termTotalCollateral,
  creditMultiplier
}: {
  lendingTermData: LendingTerms;
  currentDebt: number;
  debtCeiling: number;
  termTotalCollateral: number;
  creditMultiplier: bigint;
}) {
  const { appMarketId, appChainId, coinDetails, contractsList } = useAppStore();
  const collateralToken = coinDetails.find(
    (item) => item.address.toLowerCase() === lendingTermData.collateral.address.toLowerCase()
  );
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const collateralTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(collateralToken.price * 100)), 0);
  const creditTokenSymbol = 'g' + pegToken.symbol + '-' + (appMarketId > 999e6 ? 'test' : appMarketId);
  const creditTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);
  const creditMultiplierNumber = Number(formatUnits(creditMultiplier, 18));

  return (
    <div className="order-1 grid h-full w-full grid-cols-1 gap-5 xs:col-span-1 xs:grid-cols-2 sm:overflow-auto lg:col-span-4 lg:grid-cols-2 2xl:col-span-4 2xl:grid-cols-2 3xl:col-span-4 3xl:grid-cols-3">
      <TooltipHorizon
        extra="dark:text-gray-200"
        content={
          <>
            <p>
              Total Collateral Amount :{' '}
              <ImageWithFallback
                className="inline-block"
                src={lendingTermData.collateral.logo}
                fallbackSrc="/img/crypto-logos/unk.png"
                width={18}
                height={18}
                alt="logo"
              />{' '}
              <span className="font-semibold">
                {formatDecimal(termTotalCollateral, collateralTokenDecimalsToDisplay)}
              </span>{' '}
              {lendingTermData.collateral.symbol}
            </p>
            <p>
              Unit Collateral Price : <span className="font-semibold">{collateralToken.price}</span> ${' '}
              <span className="text-gray-400">(DefiLlama)</span>
            </p>
            <p>
              Total Collateral Value :{' '}
              <span className="font-semibold">{formatDecimal(termTotalCollateral * collateralToken.price, 2)}</span> ${' '}
              <span className="text-gray-400">(DefiLlama)</span>
            </p>
          </>
        }
        trigger={
          <div>
            <Widget
              icon={<BsBank2 className="h-7 w-7" />}
              title={'Total Collateral'}
              subtitle={
                collateralToken.price === 0
                  ? '$ -.--'
                  : '$ ' +
                    formatCurrencyValue(parseFloat(formatNumberDecimal(termTotalCollateral * collateralToken.price)))
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
              Current Debt : <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
              <span className="font-semibold">
                {formatDecimal(currentDebt * creditMultiplierNumber, creditTokenDecimalsToDisplay)}
              </span>{' '}
              {pegToken.symbol}
            </p>
            <p>
              Debt Ceilling : <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
              <span className="font-semibold">
                {formatDecimal(debtCeiling * creditMultiplierNumber, creditTokenDecimalsToDisplay)}
              </span>{' '}
              {pegToken.symbol}
            </p>
            <p>
              <br />
              New borrows increase the Current Debt.
              <br />
              GUILD & {creditTokenSymbol} stake increase the Debt Ceiling.
            </p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<GiProgression className="h-6 w-6" />}
              title={'Utilization'}
              subtitle={
                isNaN(currentDebt) || isNaN(debtCeiling)
                  ? '-.--%'
                  : formatDecimal((currentDebt / debtCeiling) * 100, 2) + '%'
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
            <p>The opening fee is added to the interest owed directly after you open a new loan.</p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<MdBarChart className="h-7 w-7" />}
              title={'Opening Fee'}
              subtitle={formatDecimal(lendingTermData.openingFee * 100, 2).toString() + '%'}
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
            <p>Interest rate is non-compounding, and is charged based on a period of ~1 year (31557600 seconds).</p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<TbArrowsExchange className="h-6 w-6" />}
              title={'Interest Rate'}
              subtitle={formatDecimal(lendingTermData.interestRate * 100, 2).toString() + '%'}
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
              This term allows to borrow{' '}
              <Image className="inline-block" src={pegTokenLogo} width={18} height={18} alt="logo" />{' '}
              <span className="font-semibold">
                {formatDecimal(lendingTermData.borrowRatio, creditTokenDecimalsToDisplay)}
              </span>{' '}
              {pegToken.symbol} per unit of{' '}
              <ImageWithFallback
                className="inline-block"
                src={lendingTermData.collateral.logo}
                fallbackSrc="/img/crypto-logos/unk.png"
                width={18}
                height={18}
                alt="logo"
              />{' '}
              {lendingTermData.collateral.symbol} collateral.
            </p>
          </div>
        }
        trigger={
          <div>
            <Widget
              icon={<MdCurrencyExchange className="h-7 w-7" />}
              title={'Borrow Ratio'}
              subtitle={formatDecimal(lendingTermData.borrowRatio, creditTokenDecimalsToDisplay)}
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
              Periodic Payment minimum size :{' '}
              <span className="font-semibold">{lendingTermData.minPartialRepayPercent}%</span>
            </p>
            <p>
              Periodic Payment maximum interval :{' '}
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
              title={'Periodic Payments'}
              subtitle={lendingTermData.maxDelayBetweenPartialRepay != 0 ? 'Yes' : 'No'}
              extra={<QuestionMarkIcon />}
            />
          </div>
        }
        placement="left"
      />
    </div>
  );
}
