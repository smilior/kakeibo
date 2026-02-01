'use client'

import { useState } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks } from 'date-fns'

import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMonthlyComparison } from '@/lib/queries/analytics'
import { ComparisonSummary } from './comparison-summary'
import { PeriodAnalysisCard } from './period-analysis-card'
import { ExpenseDetailSheet } from './expense-detail-sheet'
import { CategoryPieChart } from '@/components/features/dashboard/category-pie-chart'
import { UserComparisonChart } from '@/components/features/dashboard/user-comparison-chart'
import { ExpenseTrackerCard } from '@/components/features/dashboard/expense-tracker-card'
import { useTrackers } from '@/lib/queries/trackers'
import { aggregateTrackers } from '@/lib/utils/tracker-aggregation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { Expense, Category, User, FamilyMember } from '@/types/database'

interface ExpenseWithRelations extends Expense {
  category: Category | null
  user: User | null
  family_member: FamilyMember | null
}

interface MonthlyAnalyticsProps {
  householdId: string | undefined
}

export function MonthlyAnalytics({ householdId }: MonthlyAnalyticsProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTitle, setSheetTitle] = useState('')
  const [sheetExpenses, setSheetExpenses] = useState<ExpenseWithRelations[]>([])

  const { data, isLoading } = useMonthlyComparison(householdId, currentMonth)
  const { data: trackers = [] } = useTrackers(householdId)

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

  // ユーザー別 + 家族メンバー別集計
  const userTotals = currentExpenses.reduce(
    (acc, expense) => {
      const key = expense.family_member_id
        ? `fm_${expense.family_member_id}`
        : expense.user_id
      if (!acc[key]) {
        if (expense.family_member_id) {
          acc[key] = {
            userId: `fm_${expense.family_member_id}`,
            userName: expense.family_member?.name || '',
            nickname: expense.family_member?.name,
            amount: 0,
            isFamilyMember: true,
          }
        } else {
          acc[key] = {
            userId: expense.user_id,
            userName: expense.user?.name || '',
            nickname: expense.user?.nickname,
            amount: 0,
            isFamilyMember: false,
          }
        }
      }
      acc[key].amount += expense.amount
      return acc
    },
    {} as Record<string, { userId: string; userName: string; nickname?: string | null; amount: number; isFamilyMember?: boolean }>
  )

  // 週別集計（締め日ベースの期間内の週ごとの支出）
  const periodStart = data?.currentStart ? new Date(data.currentStart) : startOfMonth(currentMonth)
  const periodEnd = data?.currentEnd ? new Date(data.currentEnd) : endOfMonth(currentMonth)

  const weeklyTotals: { week: number; label: string; amount: number; expenses: ExpenseWithRelations[] }[] = []
  let weekNum = 1
  let weekStart = startOfWeek(periodStart, { weekStartsOn: 1 })

  while (weekStart <= periodEnd) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const weekExpenses = currentExpenses.filter((e) => {
      const expenseDate = new Date(e.date)
      return expenseDate >= weekStart && expenseDate <= weekEnd && expenseDate >= periodStart && expenseDate <= periodEnd
    })
    const weekAmount = weekExpenses.reduce((sum, e) => sum + e.amount, 0)

    // 期間内に含まれる週のみ追加
    if (weekStart <= periodEnd && weekEnd >= periodStart) {
      weeklyTotals.push({
        week: weekNum,
        label: `第${weekNum}週`,
        amount: weekAmount,
        expenses: weekExpenses,
      })
      weekNum++
    }
    weekStart = addWeeks(weekStart, 1)
  }

  // カテゴリ別棒グラフ用データ（支出も含める）
  const categoryBarData = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((item) => ({
      name: item.categoryName,
      icon: item.icon,
      amount: item.amount,
      categoryId: item.categoryId,
      expenses: currentExpenses.filter((e) => e.category_id === item.categoryId),
    }))

  // トラッカー集計
  const trackerSummaries = aggregateTrackers(
    trackers.map((t) => ({ id: t.id, category_id: t.category_id, category: t.category })),
    currentExpenses,
    previousExpenses
  )

  // AI分析用: 先月の締め日ベースの開始日（振り返りは完結した期間で行う）
  const periodStartStr = data?.previousStart || ''

  // 週別グラフクリック時のハンドラ
  const handleWeekClick = (_: unknown, index: number) => {
    const weekData = weeklyTotals[index]
    if (weekData) {
      setSheetTitle(`${weekData.label}の支出`)
      setSheetExpenses(weekData.expenses)
      setSheetOpen(true)
    }
  }

  // カテゴリ別グラフクリック時のハンドラ
  const handleCategoryClick = (_: unknown, index: number) => {
    const catData = categoryBarData[index]
    if (catData) {
      setSheetTitle(`${catData.name}の支出`)
      setSheetExpenses(catData.expenses)
      setSheetOpen(true)
    }
  }

  // ユーザー別クリック時のハンドラ
  const handleUserClick = (userId: string, label: string) => {
    const filtered = currentExpenses.filter((e) =>
      userId.startsWith('fm_')
        ? e.family_member_id === userId.replace('fm_', '')
        : e.user_id === userId && !e.family_member_id
    )
    setSheetTitle(`${label}の支出`)
    setSheetExpenses(filtered)
    setSheetOpen(true)
  }

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
            {data?.currentStart && data?.currentEnd && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(data.currentStart), 'M/d', { locale: ja })} 〜{' '}
                {format(new Date(data.currentEnd), 'M/d', { locale: ja })}
              </p>
            )}
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
                    <BarChart data={weeklyTotals} className="cursor-pointer">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [`¥${Number(value).toLocaleString()}`, '支出']}
                      />
                      <Bar
                        dataKey="amount"
                        fill="#F97316"
                        radius={[4, 4, 0, 0]}
                        onClick={(data, index) => handleWeekClick(data, index)}
                      >
                        {weeklyTotals.map((entry, index) => (
                          <Cell key={`cell-${index}`} className="hover:opacity-80 transition-opacity" />
                        ))}
                      </Bar>
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
                    <BarChart data={categoryBarData} layout="vertical" className="cursor-pointer">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={10} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" fontSize={10} width={80} />
                      <Tooltip
                        formatter={(value) => [`¥${Number(value).toLocaleString()}`, '支出']}
                      />
                      <Bar
                        dataKey="amount"
                        fill="#3B82F6"
                        radius={[0, 4, 4, 0]}
                        onClick={(data, index) => handleCategoryClick(data, index)}
                      >
                        {categoryBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} className="hover:opacity-80 transition-opacity" />
                        ))}
                      </Bar>
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

          {/* トラッカー */}
          <ExpenseTrackerCard
            trackers={trackerSummaries}
            expenses={currentExpenses}
            periodLabel="月間"
          />

          {/* カテゴリ別・ユーザー別 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <CategoryPieChart
              data={Object.values(categoryTotals).sort((a, b) => b.amount - a.amount)}
            />
            <UserComparisonChart
              data={Object.values(userTotals)}
              onUserClick={handleUserClick}
            />
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
                    <div
                      key={item.categoryId}
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
                      onClick={() => {
                        const filtered = currentExpenses.filter((e) => e.category_id === item.categoryId)
                        setSheetTitle(`${item.categoryName}の支出`)
                        setSheetExpenses(filtered)
                        setSheetOpen(true)
                      }}
                    >
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

      {/* 支出詳細シート */}
      <ExpenseDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={sheetTitle}
        expenses={sheetExpenses}
      />
    </div>
  )
}
