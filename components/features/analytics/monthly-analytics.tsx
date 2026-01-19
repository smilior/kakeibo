'use client'

import { useState } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, isSameMonth } from 'date-fns'

// 先月の開始日を取得（振り返り用）
const getLastMonthStart = () => {
  const now = new Date()
  const lastMonth = subMonths(now, 1)
  return startOfMonth(lastMonth)
}
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMonthlyComparison } from '@/lib/queries/analytics'
import { ComparisonSummary } from './comparison-summary'
import { PeriodAnalysisCard } from './period-analysis-card'
import { CategoryPieChart } from '@/components/features/dashboard/category-pie-chart'
import { UserComparisonChart } from '@/components/features/dashboard/user-comparison-chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Expense, Category, User } from '@/types/database'

interface ExpenseWithRelations extends Expense {
  category: Category | null
  user: User | null
}

interface MonthlyAnalyticsProps {
  householdId: string | undefined
}

export function MonthlyAnalytics({ householdId }: MonthlyAnalyticsProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const { data, isLoading } = useMonthlyComparison(householdId, currentMonth)

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  // 今月の集計
  const currentExpenses = (data?.current || []) as ExpenseWithRelations[]
  const previousExpenses = (data?.previous || []) as ExpenseWithRelations[]

  const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0)
  const previousTotal = previousExpenses.reduce((sum, e) => sum + e.amount, 0)

  // カテゴリ別集計
  const categoryTotals = currentExpenses.reduce(
    (acc, expense) => {
      const categoryId = expense.category_id
      if (!acc[categoryId]) {
        acc[categoryId] = {
          categoryId,
          categoryName: expense.category?.name || '',
          icon: expense.category?.icon || '',
          amount: 0,
        }
      }
      acc[categoryId].amount += expense.amount
      return acc
    },
    {} as Record<string, { categoryId: string; categoryName: string; icon: string; amount: number }>
  )

  // ユーザー別集計
  const userTotals = currentExpenses.reduce(
    (acc, expense) => {
      const userId = expense.user_id
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName: expense.user?.name || '',
          nickname: expense.user?.nickname,
          amount: 0,
        }
      }
      acc[userId].amount += expense.amount
      return acc
    },
    {} as Record<string, { userId: string; userName: string; nickname?: string | null; amount: number }>
  )

  // 週別集計（月内の週ごとの支出）
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const weeklyTotals: { week: number; label: string; amount: number }[] = []
  let weekNum = 1
  let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 })

  while (weekStart <= monthEnd) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const weekAmount = currentExpenses
      .filter((e) => {
        const expenseDate = new Date(e.date)
        return expenseDate >= weekStart && expenseDate <= weekEnd && isSameMonth(expenseDate, currentMonth)
      })
      .reduce((sum, e) => sum + e.amount, 0)

    // 月内に含まれる週のみ追加
    if (weekStart <= monthEnd && weekEnd >= monthStart) {
      weeklyTotals.push({
        week: weekNum,
        label: `第${weekNum}週`,
        amount: weekAmount,
      })
      weekNum++
    }
    weekStart = addWeeks(weekStart, 1)
  }

  // カテゴリ別棒グラフ用データ
  const categoryBarData = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((item) => ({
      name: item.categoryName,
      icon: item.icon,
      amount: item.amount,
    }))

  // AI分析用: 常に先月の開始日（振り返りは完結した期間で行う）
  const lastMonthStart = getLastMonthStart()
  const periodStartStr = format(lastMonthStart, 'yyyy-MM-dd')

  return (
    <div className="space-y-4">
      {/* 月選択 */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold">
              {format(currentMonth, 'yyyy年M月', { locale: ja })}
            </p>
            <p className="text-sm text-muted-foreground">
              合計: ¥{currentTotal.toLocaleString()}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
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
          {/* AI分析 */}
          <PeriodAnalysisCard
            householdId={householdId}
            periodType="month"
            periodStart={periodStartStr}
          />

          {/* 先月比 */}
          <ComparisonSummary
            currentTotal={currentTotal}
            previousTotal={previousTotal}
            currentLabel="今月"
            previousLabel="先月"
          />

          {/* 週別推移 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">週別推移</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyTotals.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyTotals}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [`¥${Number(value).toLocaleString()}`, '支出']}
                      />
                      <Bar dataKey="amount" fill="#F97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  データがありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* カテゴリ別棒グラフ */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">カテゴリ別支出</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryBarData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={10} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" fontSize={10} width={80} />
                      <Tooltip
                        formatter={(value) => [`¥${Number(value).toLocaleString()}`, '支出']}
                      />
                      <Bar dataKey="amount" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  データがありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* カテゴリ別・ユーザー別 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <CategoryPieChart
              data={Object.values(categoryTotals).sort((a, b) => b.amount - a.amount)}
            />
            <UserComparisonChart data={Object.values(userTotals)} />
          </div>

          {/* カテゴリ別詳細 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">カテゴリ別詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.values(categoryTotals)
                  .sort((a, b) => b.amount - a.amount)
                  .map((item) => (
                    <div key={item.categoryId} className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <span className="flex-1">{item.categoryName}</span>
                      <span className="font-medium">
                        ¥{item.amount.toLocaleString()}
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
