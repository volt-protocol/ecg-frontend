"use client"

import { ApexChartWrapper } from "components/charts/ApexChartWrapper"
import { formatCurrencyValue } from "utils/numbers"

const mockData = [
  {
    x: "Open Loan",
    count: 22,
    percent: 80,
    cummulativeValue: 22,
  },
  {
    x: "Successfully Repaid",
    count: 3,
    percent: 10,
    cummulativeValue: 8,
  },
  {
    x: "Bad Debt Created, Repaid",
    count: 2,
    percent: 2,
    cummulativeValue: 2,
  },
  {
    x: "Bad Debt Created",
    count: 5,
    percent: 8,
    cummulativeValue: 4,
  },
]

export const LoanSuccessRate = ({
  data,
  labels,
}: {
  data: number[]
  labels: string[]
}) => {
  const series = mockData.map((item) => {
    return {
      x: item.x,
      y: item.count,
    }
  })

  const state = {
    series: [
      {
        data: series,
      },
    ],
    options: {
      legend: {
        show: false,
      },
      colors: ["#4AB8A6", "#93B84A", "#6F4AB8", "#B84A5C"],
      chart: {
        height: 150,
        type: "treemap",
        toolbar: {
          show: false,
        },
      },
      tooltip: {
        y: {
          formatter: function (value, { series, seriesIndex, dataPointIndex, w }) {
            return (
              "<div>" +
              mockData[dataPointIndex].count +
              " (" +
              mockData[dataPointIndex].percent +
              "%)" +
              "</div><div>" +
              "Cumulative Value: " +
              formatCurrencyValue(mockData[dataPointIndex].cummulativeValue) +
              "</div>"
            )
          },
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: "12px",
        },
        formatter: function (text, op) {
          return [text]
        },
        offsetY: -4,
      },
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: false,
        },
      },
    },
  }

  return (
    <div className="my-auto">
      <ApexChartWrapper
        options={state.options}
        series={state.series}
        type="treemap"
        height={250}
      />
    </div>
  )
}
