'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface SummaryCardProps {
  totalExpense: number
  subscriptionTotal: number
  period?: {
    startDate: string
    endDate: string
  }
}

export function SummaryCard({ totalExpense, subscriptionTotal, period }: SummaryCardProps) {
  // 期間の表示文字列を生成
  const periodText = period
    ? `${format(new Date(period.startDate), 'M/d', { locale: ja })} 〜 ${format(new Date(period.endDate), 'M/d', { locale: ja })}`
    : ''

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-base">今月の支出</CardTitle>
          {periodText && (
            <span className="text-sm text-muted-foreground">{periodText}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">総支出</p>
            <p className="text-3xl font-bold">
              ¥{(totalExpense + subscriptionTotal).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">サブスク </span>
              <span className="font-medium">¥{subscriptionTotal.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">変動費 </span>
              <span className="font-medium">¥{totalExpense.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
