'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UserTotal {
  userId: string
  userName: string
  nickname?: string | null
  amount: number
  count?: number
  isFamily?: boolean
  isSubscription?: boolean
}

interface UserComparisonChartProps {
  data: UserTotal[]
}

const COLORS = ['#F97316', '#3B82F6', '#A855F7']
const FAMILY_COLOR = '#22C55E'
const SUBSCRIPTION_COLOR = '#8B5CF6'

export function UserComparisonChart({ data }: UserComparisonChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">夫婦別支出</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            データがありません
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">夫婦別支出</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-6">
          {data.map((user, index) => {
            const percentage = total > 0 ? (user.amount / total) * 100 : 0
            const color = user.isSubscription
              ? SUBSCRIPTION_COLOR
              : user.isFamily
                ? FAMILY_COLOR
                : COLORS[index % COLORS.length]
            const label = user.isSubscription
              ? '🔄 サブスク'
              : user.isFamily
                ? '👨‍👩‍👧 家族'
                : (user.nickname || user.userName)
            return (
              <div key={user.userId} className="text-center">
                <p className="text-sm text-muted-foreground">
                  {label}
                </p>
                <div
                  className="mx-auto my-2 flex h-16 w-16 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: color }}
                >
                  <span className="font-bold">{percentage.toFixed(0)}%</span>
                </div>
                <p className="font-medium">¥{user.amount.toLocaleString()}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
