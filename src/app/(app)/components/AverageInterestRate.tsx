'use client'

import { ApexChartWrapper } from "components/charts/ApexChartWrapper"

export const AverageInterestRate = () => {
  const state = {
    series: [
      {
        name: "Desktops",
        data: [10, 41, 35, 51, 49, 62, 69, 91, 148],
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
