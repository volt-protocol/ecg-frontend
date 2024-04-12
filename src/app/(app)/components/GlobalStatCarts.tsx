import { IoMdHome } from 'react-icons/io';
import { IoDocuments } from 'react-icons/io5';
import { MdBarChart, MdDashboard } from 'react-icons/md';
import Widget from 'components/widget/Widget';
import { formatDecimal, toLocaleString } from 'utils/numbers';
import { LendingTerms } from 'types/lending';

export const GlobalStatCarts = ({
  lendingTerms,
  data,
  collateralData,
  totalActiveLoans
}: {
  lendingTerms: LendingTerms[];
  data: any;
  collateralData: any;
  totalActiveLoans: number;
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
          (lendingTerms?.reduce((a, b) => a + b.currentDebt, 0) * data?.creditMultiplier).toFixed(2)
        )}`}
      />
      <Widget icon={<MdBarChart className="h-7 w-7" />} title={'Lending Terms'} subtitle={lendingTerms.length} />
      <Widget icon={<MdDashboard className="h-6 w-6" />} title={'Active Loans'} subtitle={totalActiveLoans ?? '-'} />
      <Widget
        icon={<MdBarChart className="h-7 w-7" />}
        title={'GUILD Staked'}
        subtitle={`${toLocaleString(formatDecimal(data?.totalWeight, 2))}`}
      />
      <div className="opacity-40">
        <Widget icon={<IoMdHome className="h-6 w-6" />} title={'All Time P&L'} subtitle={'$ 2433'} />
      </div>
    </>
  );
};
