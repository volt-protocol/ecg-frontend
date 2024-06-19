'use client';

import { ApexChartWrapper } from 'components/charts/ApexChartWrapper';
import { getDateFrom, getTimelineButton } from './helper';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { ChartTimeline } from 'types/charts';
import Spinner from 'components/spinner';
import Card from 'components/card';
import { formatCurrencyValue } from 'utils/numbers';

export const TVLChart = ({ tvl, lastTVL }: { tvl: any; lastTVL: number }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [timeline, setTimeline] = useState<ChartTimeline>('all');

  useEffect(() => {
    if (!tvl) return;
    if (lastTVL != -1) {
      tvl.values.push(lastTVL);
      tvl.timestamps.push(Date.now());
    }

    const state = {
      series: [
        {
          name: 'TVL',
          data: tvl.values,
          color: '#50bdae'
        }
      ],
      options: {
        chart: {
          id: 'tvlChart',
          toolbar: {
            show: false
          },
          height: 350,
          type: 'area',
          zoom: {
            autoScaleYaxis: true
          }
        },
        tooltip: {
          y: {
            formatter: (val) => '$' + formatCurrencyValue(val)
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'straight'
        },
        yaxis: {
          labels: {
            formatter: (val) => '$' + formatCurrencyValue(val)
          }
        },
        xaxis: {
          type: 'datetime',
          tickAmount: 6,
          labels: {
            datetimeFormatter: {
              year: 'yyyy',
              month: "MMM 'yy",
              day: 'dd MMM',
              hour: 'HH:mm'
            }
          },
          min: new Date(tvl.timestamps[0]).getTime(),
          categories: tvl.timestamps
        },
        fill: {
          colors: ['#50bdae'],
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.9,
            stops: [0, 100]
          }
        }
      }
    };

    setChartData(state);
  }, [tvl, lastTVL]);

  const updateData = (timeline: ChartTimeline) => {
    // reload the chart with the new timeline
    ApexCharts.exec('tvlChart', 'zoomX', getDateFrom(timeline, chartData), moment().toDate().getTime());

    setTimeline(timeline);
  };

  return (
    <Card
      title="Market TVL (Collateral + PSM Liquidity)"
      extra="w-full min-h-[300px] md:col-span-2 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
      rightText={getTimelineButton({ timeline, updateData })}
    >
      {chartData === null ? (
        <div className="flex h-96 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div>
          <ApexChartWrapper options={chartData.options} series={chartData.series} type="area" height={350} />
        </div>
      )}
    </Card>
  );
};
