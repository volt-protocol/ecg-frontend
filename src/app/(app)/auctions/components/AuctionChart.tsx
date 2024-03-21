"use client"

import { ApexChartWrapper } from "components/charts/ApexChartWrapper"

export const AuctionChart = () => {
  const state = {
    series: [
      {
        name: "Debt Asked",
        data: [100, 100, 100, 100, 0, 0, 0],
      },
      {
        name: "Collateral Offered",
        data: [0, 0, 0, 100, 100, 100, 100],
      },
    ],
    options: {
      chart: {
        height: 350,
        type: "area",
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      tooltip: {
        // y: {
        //   formatter: (val) => val + "%",
        // },
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
          var dataDebit = w.globals.initialSeries[seriesIndex].data[dataPointIndex]
          var dataCollateral =
            w.globals.initialSeries[seriesIndex + 1].data[dataPointIndex]

          var dataInferredCollateralPrice = dataCollateral == 0 ? '∞' : dataDebit / dataCollateral

          return (
            "<ul class='custom-apex-tooltip'>" +
            "<li><b>Debt Asked</b>: " +
            dataDebit +
            "%" +
            "</li>" +
            "<li><b>Collateral Offered</b>: " +
            dataCollateral +
            "%" +
            "</li>" +
            "<li><b>Inferred Collateral Price</b>: " +
            dataInferredCollateralPrice +
            " gUSDC" +
            "</li>" +
            "</ul>"
          )
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "straight",
      },
      xaxis: {
        type: "number",
        tickPlacement: "between",
        categories: [
          "",
          "",
          "auction start",
          "start + midpoint",
          "start + auctionDuration",
          "",
          "",
        ],
      },
    },
  }

  return (
    <div>
      <ApexChartWrapper
        options={state.options}
        series={state.series}
        type="line"
        height={350}
      />
    </div>
  )
}
