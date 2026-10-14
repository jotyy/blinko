import { Card, CardBody } from "@heroui/react"
import { observer } from "mobx-react-lite"
import { useTranslation } from "react-i18next"
import { useTheme } from "next-themes"
import { useEffect, useRef } from "react"
import * as echarts from 'echarts'
import { useMediaQuery } from "usehooks-ts"

interface TagDistributionChartProps {
  tagStats: {
    tagName: string
    count: number
  }[]
}

export const TagDistributionChart = observer(({ tagStats }: TagDistributionChartProps) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const chartRef = useRef<HTMLDivElement>(null)
  let chart: echarts.ECharts | null = null
  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (!chartRef.current) return

    if (!chart) {
      chart = echarts.init(chartRef.current)
    }

    const isDark = theme === 'dark'

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        type: 'scroll',
        orient: isMobile ? 'horizontal' : 'vertical',
        right: isMobile ? 'center' : 10,
        top: isMobile ? 'bottom' : 'center',
        bottom: isMobile ? 0 : undefined,
        textStyle: {
          color: isDark ? '#a19b90' : '#6f6b63',
          fontSize: isMobile ? 12 : 13
        },
        pageTextStyle: {
          color: isDark ? '#a19b90' : '#6f6b63'
        },
        pageIconColor: isDark ? '#ebe7de' : '#1d1c1a',
        pageIconInactiveColor: isDark ? '#666' : '#aaa'
      },
      series: [
        {
          name: t('tag-distribution'),
          type: 'pie',
          radius: isMobile ? ['30%', '60%'] : ['40%', '70%'],
          center: isMobile ? ['50%', '40%'] : ['40%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDark ? '#201f1c' : '#fffefb',
            borderWidth: 2
          },
          label: {
            show: !isMobile,
            position: 'outer',
            formatter: '{b}\n{d}%',
            color: isDark ? '#ebe7de' : '#1d1c1a',
            fontSize: 12,
            lineHeight: 16
          },
          emphasis: {
            label: {
              show: true,
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600
            },
            itemStyle: {
              shadowBlur: 8,
              shadowOffsetX: 0,
              shadowColor: 'rgba(29, 28, 26, 0.18)'
            }
          },
          labelLine: {
            show: !isMobile,
            length: 15,
            length2: 10,
            smooth: true
          },
          data: tagStats.map(item => ({
            value: item.count,
            name: item.tagName === 'Others' ? t('other-tags') : item.tagName
          }))
        }
      ],
      // Muted, paper-theme palette: ink green, terracotta, amber, slate, sage, clay, plum, olive,
      // sand, teal grey. Lifted a step for the dark theme.
      color: isDark
        ? ['#7fb8a8', '#d98a64', '#d9b26a', '#8fa0b2', '#a8c3ab', '#e0a588', '#a98aa6', '#b3b37a', '#d8c7a8', '#7fa9b0']
        : ['#2f6b5e', '#b4613a', '#c99a3c', '#5b6b7a', '#8aa68f', '#c98468', '#7a5c78', '#8a8a4e', '#b8a585', '#4f7f87']
    }

    chart.setOption(option)

    const handleResize = () => {
      if (chart) {
        chart.resize()
        const newIsMobile = window.innerWidth < 768
        chart.setOption({
          legend: {
            orient: newIsMobile ? 'horizontal' : 'vertical',
            right: newIsMobile ? 'center' : 10,
            top: newIsMobile ? 'bottom' : 'center',
            bottom: newIsMobile ? 0 : undefined,
            textStyle: {
              fontSize: newIsMobile ? 12 : 14
            }
          },
          series: [{
            radius: newIsMobile ? ['30%', '60%'] : ['40%', '70%'],
            center: newIsMobile ? ['50%', '40%'] : ['40%', '50%'],
            label: {
              show: !newIsMobile
            },
            labelLine: {
              show: !newIsMobile
            }
          }]
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart?.dispose()
      chart = null
    }
  }, [tagStats, theme, t])

  return (
    <Card className="bg-card col-span-full" shadow="sm" radius="lg">
      <CardBody>
        <h2 className="text-lg font-medium mb-4">{t('tag-distribution')}</h2>
        <div ref={chartRef} className="w-full h-[500px] md:h-[400px]" />
      </CardBody>
    </Card>
  )
}) 