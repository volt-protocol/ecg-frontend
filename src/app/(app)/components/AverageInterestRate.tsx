'use client';

import Card from 'components/card';
import { ApexChartWrapper } from 'components/charts/ApexChartWrapper';
import Spinner from 'components/spinner';
import { useEffect, useState } from 'react';
import { ChartTimeline } from 'types/charts';
import { getDateFrom, getTimelineButton } from './helper';
import moment from 'moment';

export const AverageInterestRate = ({ averageInterestRate }: { averageInterestRate: any }) => {
  const [chartData, setChartData] = useState<any>([]);
  const [timeline, setTimeline] = useState<ChartTimeline>('all');

  useEffect(() => {
    if (!averageInterestRate) return;

    const state = {
      series: [
        {
          name: 'Average Interest Rate',
          data: averageInterestRate.values,
          color: '#50bdae'
        }
      ],
      options: {
        tooltip: {
          y: {
            formatter: (val) => val + '%'
          }
        },
        chart: {
          id: 'averageInterestChart',
          toolbar: {
            show: false
          },
          height: 350,
          type: 'area',
          zoom: {
            autoScaleYaxis: true
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'straight'
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
          min: new Date(averageInterestRate.timestamps[0]).getTime(),
          categories: averageInterestRate.timestamps
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
  }, [averageInterestRate]);

  const updateData = (timeline: ChartTimeline) => {
    // reload the chart with the new timeline
    ApexCharts.exec('averageInterestChart', 'zoomX', getDateFrom(timeline, chartData), moment().toDate().getTime());

    setTimeline(timeline);
  };

  return (
    <Card
      title="Average Interest Rate"
      extra="w-full min-h-[300px] md:col-span-2 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
      rightText={getTimelineButton({ timeline, updateData })}
    >
      {chartData.length === 0 ? (
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
