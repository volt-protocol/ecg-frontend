"use client"

import { ApexChartWrapper } from "components/charts/ApexChartWrapper"
import { getDateFrom, getTimelineButton } from "./helper"
import moment from "moment"
import { useEffect, useState } from "react"
import { ChartTimeline } from "types/charts"
import Spinner from "components/spinner"
import Card from "components/card"

export const TVLChart = ({ tvl }: { tvl: any }) => {
  const [chartData, setChartData] = useState<any>([])
  const [timeline, setTimeline] = useState<ChartTimeline>("all")

  useEffect(() => {
    if (!tvl) return

    const state = {
      series: [
        {
          name: "TVL",
          data: tvl.values,
          color: "#50bdae",
        },
      ],
      options: {
        chart: {
          id: "tvlChart",
          toolbar: {
            show: false,
          },
          height: 350,
          type: "area",
          zoom: {
            autoScaleYaxis: true,
          },
        },
        tooltip: {
          y: {
            formatter: (val) => "$" + val,
          },
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
          min: new Date(tvl.timestamps[0]).getTime(),
          categories: tvl.timestamps,
        },
        fill: {
          colors: ["#50bdae"],
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
  }, [tvl])

  const updateData = (timeline: ChartTimeline) => {
    // reload the chart with the new timeline
    ApexCharts.exec(
      "tvlChart",
      "zoomX",
      getDateFrom(timeline, chartData),
      moment().toDate().getTime()
    )

    setTimeline(timeline)
  }

  return (
    <Card
      title="TVL"
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
