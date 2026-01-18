'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SummaryCardProps {
  totalExpense: number
  subscriptionTotal: number
}

export function SummaryCard({ totalExpense, subscriptionTotal }: SummaryCardProps) {
  const month = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{month}</CardTitle>
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
