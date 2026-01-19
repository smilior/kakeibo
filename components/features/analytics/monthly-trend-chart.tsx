'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface MonthlyTrendChartProps {
  data: {
    month: number
    monthLabel: string
    amount: number
  }[]
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const currentMonth = new Date().getMonth()

  // データがない月も0として表示するために、全12ヶ月のデータを確保
  const chartData = data.map((item, index) => ({
    ...item,
    // 未来の月はデータを非表示に
    amount: item.month <= currentMonth ? item.amount : null,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">月別推移</CardTitle>
      </CardHeader>
      <CardContent>
        {data.some((d) => d.amount > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" fontSize={10} />
                <YAxis
                  fontSize={10}
                  tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) =>
                    value !== null
                      ? [`¥${Number(value).toLocaleString()}`, '支出']
                      : ['-', '支出']
                  }
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#F97316"
                  strokeWidth={2}
                  dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            データがありません
          </p>
        )}
      </CardContent>
    </Card>
  )
}
