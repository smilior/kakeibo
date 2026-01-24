'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useYearlyExpenses } from '@/lib/queries/analytics'
import { MonthlyTrendChart } from './monthly-trend-chart'

interface YearlyAnalyticsProps {
  householdId: string | undefined
}

export function YearlyAnalytics({ householdId }: YearlyAnalyticsProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  const { data: monthlyData = [], isLoading } = useYearlyExpenses(householdId, currentYear)

  const handlePrevYear = () => setCurrentYear(currentYear - 1)
  const handleNextYear = () => setCurrentYear(currentYear + 1)

  // 年間合計と月平均を計算
  const yearTotal = monthlyData.reduce((sum, m) => sum + m.amount, 0)
  const monthsWithData = monthlyData.filter((m) => m.amount > 0).length
  const monthAverage = monthsWithData > 0 ? Math.round(yearTotal / monthsWithData) : 0

  return (
    <div className="space-y-4">
      {/* 年選択 */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={handlePrevYear}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold">{currentYear}年</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextYear}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* 年間サマリー */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">年間合計</p>
                  <p className="text-xl font-bold">¥{yearTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">月平均</p>
                  <p className="text-xl font-bold">¥{monthAverage.toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                ※サブスクは含まれません
              </p>
            </CardContent>
          </Card>

          {/* 月別推移グラフ */}
          <MonthlyTrendChart data={monthlyData} />

          {/* 月別内訳 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">月別内訳</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monthlyData.map((item) => (
                  <div key={item.month} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.monthLabel}</span>
                    <span className="font-medium">
                      {item.amount > 0 ? `¥${item.amount.toLocaleString()}` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
