"use client"

import Card from "components/card"
import { ApexChartWrapper } from "components/charts/ApexChartWrapper"
import Spinner from "components/spinner"
import { useEffect, useState } from "react"
import { ChartTimeline } from "types/charts"
import { getDateFrom, getTimelineButton } from "./helper"
import moment from "moment"
import { useAppStore } from "store"
import { getCreditTokenSymbol } from "utils/strings"

export const CreditTotalSupply = ({
  creditSupply,
  creditTotalIssuance,
}: {
  creditSupply: any
  creditTotalIssuance: any
}) => {
  const [chartData, setChartData] = useState<any>([])
  const [timeline, setTimeline] = useState<ChartTimeline>("all")
  const { appMarketId, coinDetails, contractsList } = useAppStore()

  useEffect(() => {
    if (!creditSupply || !creditTotalIssuance) return

    const state = {
      series: [
        {
          name: "Credit Total Supply",
          data: creditSupply.values,
          color: "#50bdae",
        },
        {
          name: "Credit Total Issuance",
          data: creditTotalIssuance.values,
          color: "#f7b924",
        },
        // {
        //   name: "Credit Total Issuance",
        //   data: creditTotalIssuance.values,
        //   color: "#9966CC"
        // }
      ],
      options: {
        chart: {
          id: "creditTotalSupplyChart",
          toolbar: {
            show: false,
          },
          height: 350,
          type: "area",
          zoom: {
            autoScaleYaxis: true,
          },
        },
        legend: {
          show: true,
          floating: false,
          fontSize: "14px",
          fontFamily: "Inter",
          fontWeight: 400,
          offsetY: 3,
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          curve: "straight",
        },
        xaxis: {
          type: "datetime",
          tickAmount: 6,
          labels: {
            datetimeFormatter: {
              year: "yyyy",
              month: "MMM 'yy",
              day: "dd MMM",
              hour: "HH:mm",
            },
          },
          min: new Date(creditSupply.timestamps[0]).getTime(),
          categories: creditSupply.timestamps,
        },
        fill: {
          colors: ["#50bdae", "f7b924"],
          type: "gradient",
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.9,
            stops: [0, 100],
          },
        },
      },
    }

    setChartData(state)
  }, [creditSupply, creditTotalIssuance])

  const updateData = (timeline: ChartTimeline) => {
    // reload the chart with the new timeline
    ApexCharts.exec(
      "creditTotalSupplyChart",
      "zoomX",
      getDateFrom(timeline, chartData),
      moment().toDate().getTime()
    )

    setTimeline(timeline)
  }

  return (
    <Card
      title={`${getCreditTokenSymbol(coinDetails, appMarketId, contractsList)} Total Supply`}
      extra="w-full min-h-[300px] md:col-span-2 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
      rightText={getTimelineButton({ timeline, updateData })}
    >
      {chartData.length === 0 ? (
        <div className="flex h-96 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div>
          <ApexChartWrapper
            options={chartData.options}
            series={chartData.series}
            type="area"
            height={350}
          />
        </div>
      )}
    </Card>
  )
}
