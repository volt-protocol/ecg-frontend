'use client';

import { ApexChartWrapper } from 'components/charts/ApexChartWrapper';
import { formatCurrencyValue } from 'utils/numbers';

export const FirstLossCapital = ({ symbol, data, labels }: { symbol: string; data: number[]; labels: string[] }) => {
  const colors = labels.map((e) => {
    const key = e.replace(/[0-9\.\-%]/g, '');
    const color = str2color(key).hex();
    return color;
  });

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
      colors: colors
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

function str2num(str) {
  var hash = 0,
    i,
    chr,
    len;
  if (str == 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

function str2color(str) {
  var hash = str2num(str);
  return {
    r: (hash & 0xff0000) >> 16,
    g: (hash & 0x00ff00) >> 9,
    b: hash & 0x0000ff,
    rgba: function () {
      return 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', 1)';
    },
    hex: function () {
      return '#' + ((1 << 24) + (this.r << 16) + (this.g << 8) + this.b).toString(16).slice(1);
    }
  };
}
