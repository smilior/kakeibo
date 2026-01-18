'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface RemainingCount {
  category_id: string
  category_name: string
  category_icon: string
  monthly_limit: number
  current_count: number
  remaining_count: number
}

interface RemainingCountsProps {
  counts: RemainingCount[]
}

export function RemainingCounts({ counts }: RemainingCountsProps) {
  if (counts.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">回数制限カテゴリ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {counts.map((count) => {
          const percentage = (count.current_count / count.monthly_limit) * 100
          const isWarning = count.remaining_count <= 1 && count.remaining_count > 0
          const isDanger = count.remaining_count === 0

          return (
            <div key={count.category_id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {count.category_icon} {count.category_name}
                </span>
                <span
                  className={cn(
                    'font-medium',
                    isDanger && 'text-destructive',
                    isWarning && 'text-yellow-600'
                  )}
                >
                  {count.current_count}/{count.monthly_limit}回
                </span>
              </div>
              <Progress
                value={percentage}
                className={cn(
                  'h-2',
                  isDanger && '[&>div]:bg-destructive',
                  isWarning && '[&>div]:bg-yellow-500'
                )}
              />
              <p
                className={cn(
                  'text-xs',
                  isDanger && 'text-destructive',
                  isWarning && 'text-yellow-600',
                  !isDanger && !isWarning && 'text-muted-foreground'
                )}
              >
                残り{count.remaining_count}回
                {isWarning && ' ⚠️ もうすぐ上限'}
                {isDanger && ' 上限に達しました'}
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
