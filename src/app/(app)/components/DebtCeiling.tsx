"use client"

import * as am5 from "@amcharts/amcharts5"
import * as am5radar from "@amcharts/amcharts5/radar"
import * as am5xy from "@amcharts/amcharts5/xy"
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated"
import am5themes_Responsive from "@amcharts/amcharts5/themes/Responsive"
import { useLayoutEffect, useEffect } from "react"
import { formatCurrencyValue } from "utils/numbers"

export const DebtCeiling = ({ data, labels }: { data: any[]; labels: string[] }) => {
  const dataProcessed = data.map((item) => {
    return [Number(item.currentDebt), Number(item.debitCeiling) - Number(item.currentDebt)]
  })

  useLayoutEffect(() => {
      let root = am5.Root.new("chartdiv")

      root.setThemes([am5themes_Animated.new(root), am5themes_Responsive.new(root)])

      function generateDatas(count, index) {
        let data = []
        for (var i = 0; i < count; ++i) {
          data.push({
            category: labels[i],
            value: dataProcessed[i][index],
          })
        }
        return data
      }

      let chart = root.container.children.push(
        am5radar.RadarChart.new(root, {
          panX: false,
          panY: false,
          wheelX: "panX",
          wheelY: "zoomX",
        })
      )

      let xRenderer = am5radar.AxisRendererCircular.new(root, {})
      xRenderer.labels.template.setAll({
        radius: 10,
      })

      let xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          maxDeviation: 0,
          categoryField: "category",
          renderer: xRenderer,
          tooltip: am5.Tooltip.new(root, {}),
        })
      )

      let yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: am5radar.AxisRendererRadial.new(root, {}),
        })
      )

      for (let i = 0; i < 2; i++) {
        let series = chart.series.push(
          am5radar.RadarColumnSeries.new(root, {
            stacked: true,
            name: i == 0 ? "Current Debt" : "Remaining Debt",
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "value",
            categoryXField: "category",
          })
        )

        series.set("stroke", root.interfaceColors.get("background"))
        series.columns.template.setAll({
          width: am5.p100,
          strokeOpacity: 0.1,
          tooltipText: "{name}: {valueY} gUSDC",
        })

        series.data.setAll(generateDatas(dataProcessed.length, i))
        series.appear(1000)
      }

      let data = generateDatas(dataProcessed.length, 0)
      xAxis.data.setAll(data)

      chart.appear(300, 100)

      return () => {
        root.dispose()
      }
  }, [])

  return <div id="chartdiv" style={{ width: "320px", height: "320px" }} className="dark:text-gray-200"></div>
}
