'use client';

import { ApexChartWrapper } from 'components/charts/ApexChartWrapper';
import { formatCurrencyValue } from 'utils/numbers';

export const FirstLossCapital = ({ symbol, data, labels }: { symbol: string; data: number[]; labels: string[] }) => {
  const state = {
    series: data,
    options: {
      legend: {
        show: false
      },
      tooltip: {
        y: {
          formatter: (val: number) => formatCurrencyValue(val) + ` ${symbol}`
        }
      },
      chart: {
        width: 350,
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
      colors: ['#50bdae', '#f7b924']
    }
  };

  return (
    <div className="my-auto">
      {typeof window !== 'undefined' && (
        <ApexChartWrapper options={state.options} series={state.series} type="pie" height={250} />
      )}
    </div>
  );
};
