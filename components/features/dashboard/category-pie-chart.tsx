'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface CategoryTotal {
  categoryId: string
  categoryName: string
  icon: string
  amount: number
  count?: number
}

interface CategoryPieChartProps {
  data: CategoryTotal[]
}

const COLORS = [
  '#F97316', // オレンジ
  '#22C55E', // 緑
  '#3B82F6', // 青
  '#EAB308', // 黄
  '#A855F7', // 紫
  '#EC4899', // ピンク
  '#14B8A6', // ティール
  '#F43F5E', // ローズ
  '#6366F1', // インディゴ
  '#78716C', // グレー
]

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">カテゴリ別内訳</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            今月の支出はありません
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((item) => ({
    name: item.categoryName,
    value: item.amount,
    icon: item.icon,
    percentage: ((item.amount / total) * 100).toFixed(1),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">カテゴリ別内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="h-32 w-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `¥${Number(value).toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1 text-sm">
            {chartData.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="flex-1">
                  {item.icon} {item.name}
                </span>
                <span className="text-muted-foreground">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
