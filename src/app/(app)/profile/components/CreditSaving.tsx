'use client'

import { ApexChartWrapper } from "components/charts/ApexChartWrapper"
import { formatDecimal } from "utils/numbers"

export default function CreditSaving () {
  const state = {
    series: [
      {
        name: "Your Balance",
        data: [10, 41, 42, 51, 53, 62, 69, 91, 110],
      },
      {
        name: "Interest Rate Earned",
        data: [0.04, 0.045, 0.07, 0.08, 0.065, 0.05, 0.04, 0.04, 0.045],
      },
    ],
    options: {
      chart: {
        toolbar: {
          show: false,
        },
        height: 200,
        type: "line",
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "straight",
      },
      grid: {
        row: {
          colors: ["#f3f3f3", "transparent"], // takes an array which will be repeated on columns
          opacity: 0.5,
        },
      },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
      },
      yaxis: [
        {
          seriesName: "Your Balance",
          opposite: false,
          labels: {
            formatter: function(x) {
              return formatDecimal(x, 2);
            }
          }
        },
        {
          seriesName: "Interest Rate Earned",
          opposite: true,
          labels: {
            formatter: function(x) {
              return formatDecimal(100 * x, 2) + ' %';
            }
          }
        }
      ]
    },
  }

  return (
    <div>
      <ApexChartWrapper
        options={state.options}
        series={state.series}
        type="line"
        height={250}
      />
    </div>
  )
}
