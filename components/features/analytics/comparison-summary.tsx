'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ComparisonSummaryProps {
  currentTotal: number
  previousTotal: number
  currentLabel: string
  previousLabel: string
}

export function ComparisonSummary({
  currentTotal,
  previousTotal,
  currentLabel,
  previousLabel,
}: ComparisonSummaryProps) {
  const diff = currentTotal - previousTotal
  const diffPercent = previousTotal > 0 ? Math.round((diff / previousTotal) * 100) : 0
  const isIncrease = diff > 0
  const isDecrease = diff < 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {isIncrease ? (
            <TrendingUp className="h-5 w-5 text-red-500" />
          ) : isDecrease ? (
            <TrendingDown className="h-5 w-5 text-green-500" />
          ) : (
            <Minus className="h-5 w-5 text-muted-foreground" />
          )}
          {previousLabel}比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* 差額 */}
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                isIncrease
                  ? 'text-red-500'
                  : isDecrease
                    ? 'text-green-500'
                    : 'text-muted-foreground'
              }`}
            >
              {isIncrease ? '+' : ''}¥{diff.toLocaleString()}
            </span>
            <span
              className={`text-sm ${
                isIncrease
                  ? 'text-red-500'
                  : isDecrease
                    ? 'text-green-500'
                    : 'text-muted-foreground'
              }`}
            >
              ({isIncrease ? '+' : ''}{diffPercent}%)
            </span>
          </div>

          {/* 今期間と前期間の金額 */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{currentLabel}</span>
              <span className="font-medium">¥{currentTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{previousLabel}</span>
              <span className="font-medium">¥{previousTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
