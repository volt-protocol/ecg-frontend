import { IoMdHome } from 'react-icons/io';
import { IoDocuments } from 'react-icons/io5';
import { MdBarChart, MdDashboard } from 'react-icons/md';
import Widget from 'components/widget/Widget';
import { formatDecimal, toLocaleString } from 'utils/numbers';
import { LendingTerms } from 'types/lending';
import { CoinSettings } from 'store/slices/coin-details';

export const GlobalStatCarts = ({
  lendingTerms,
  data,
  collateralData,
  totalActiveLoans,
  allTimePnL,
  pegToken
}: {
  lendingTerms: LendingTerms[];
  data: any;
  collateralData: any;
  totalActiveLoans: number;
  allTimePnL: number;
  pegToken: CoinSettings;
}) => {
  return (
    <>
      <Widget
        icon={<MdBarChart className="h-7 w-7" />}
        title={'Total Collateral'}
        subtitle={`$ ${toLocaleString(collateralData.reduce((a, b) => a + b.collateralValueDollar, 0).toFixed(2))}`}
      />
      <Widget
        icon={<IoDocuments className="h-6 w-6" />}
        title={'Total Debt'}
        subtitle={`$ ${toLocaleString(
          (lendingTerms?.reduce((a, b) => a + b.currentDebt, 0) * data?.creditMultiplier * pegToken.price).toFixed(2)
        )}`}
      />
      <Widget icon={<MdBarChart className="h-7 w-7" />} title={'Lending Terms'} subtitle={lendingTerms.length} />
      <Widget icon={<MdDashboard className="h-6 w-6" />} title={'Active Loans'} subtitle={totalActiveLoans ?? '-'} />
      <Widget
        icon={<MdBarChart className="h-7 w-7" />}
        title={'GUILD Staked'}
        subtitle={`${toLocaleString(formatDecimal(data?.totalWeight, 2))}`}
      />
      <Widget
        icon={<IoMdHome className="h-6 w-6" />}
        title={'All Time P&L'}
        subtitle={`$ ${toLocaleString(formatDecimal(allTimePnL, 2))}`}
      />
    </>
  );
};
