'use client';

import { ApexChartWrapper } from 'components/charts/ApexChartWrapper';
import { formatCurrencyValue } from 'utils/numbers';

export const CollateralTypes = ({ data, labels }: { data: number[]; labels: string[] }) => {
  const state = {
    series: data,
    options: {
      legend: {
        show: false
      },
      tooltip: {
        colors: ['#50bdae', 'f7b924'],
        y: {
          formatter: (val) => '$' + formatCurrencyValue(val)
        }
      },
      chart: {
        width: 300,
        type: 'pie'
      },
      labels: labels,
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: '100%'
            }
          }
        }
      ],
      colors: ['#50bdae', '#f7b924', '#9966CC', '#80BF80', '#F28073', '#B2CCE6', '#800021']
    }
  };

  return (
    <div className="my-auto">
      <ApexChartWrapper options={state.options} series={state.series} type="pie" height={300} />
    </div>
  );
};
