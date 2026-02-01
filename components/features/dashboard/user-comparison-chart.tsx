'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UserTotal {
  userId: string
  userName: string
  nickname?: string | null
  amount: number
  count?: number
  isFamilyMember?: boolean
}

interface UserComparisonChartProps {
  data: UserTotal[]
  onUserClick?: (userId: string, label: string) => void
}

const COLORS = ['#F97316', '#3B82F6', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B']
const FAMILY_MEMBER_COLOR = '#22C55E'

export function UserComparisonChart({ data, onUserClick }: UserComparisonChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">家族別支出</CardTitle>
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
        <CardTitle className="text-base">家族別支出</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {data.map((user, index) => {
            const percentage = total > 0 ? (user.amount / total) * 100 : 0
            const color = user.isFamilyMember
              ? FAMILY_MEMBER_COLOR
              : COLORS[index % COLORS.length]
            const label = user.nickname || user.userName
            const isClickable = !!onUserClick
            return (
              <div
                key={user.userId}
                className={`text-center ${isClickable ? 'cursor-pointer' : ''}`}
                onClick={() => isClickable && onUserClick(user.userId, label)}
              >
                <p className="text-sm text-muted-foreground">
                  {label}
                </p>
                <div
                  className={`mx-auto my-2 flex h-16 w-16 items-center justify-center rounded-full text-white ${isClickable ? 'hover:opacity-80 transition-opacity' : ''}`}
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
