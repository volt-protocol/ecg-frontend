"use client"

import { ApexChartWrapper } from "components/charts/ApexChartWrapper"

export const FirstLossCapital = ({
  data,
  labels,
}: {
  data: number[]
  labels: string[]
}) => {
  const state = {
    series: data,
    options: {
      legend: {
        show: false,
      },
      tooltip: {
        y: {
          formatter: (val) => "$" + val,
        },
      },
      chart: {
        width: 380,
        type: "pie",
      },
      labels: labels,
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: "100%",
            },
          },
        },
      ],
    },
  }

  return (
    <div className="my-auto">
      {typeof window !== "undefined" && (
        <ApexChartWrapper options={state.options} series={state.series} type="pie" />
      )}
    </div>
  )
}
