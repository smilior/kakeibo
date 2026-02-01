'use client'

import { useState } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
} from 'date-fns'

// 先週の開始日を取得（振り返り用）
const getLastWeekStart = () => {
  const now = new Date()
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  return subWeeks(thisWeekStart, 1)
}
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWeeklyExpenses } from '@/lib/queries/analytics'
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

interface WeeklyAnalyticsProps {
  householdId: string | undefined
}

export function WeeklyAnalytics({ householdId }: WeeklyAnalyticsProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTitle, setSheetTitle] = useState('')
  const [sheetExpenses, setSheetExpenses] = useState<ExpenseWithRelations[]>([])

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

  const { data, isLoading } = useWeeklyExpenses(householdId, currentWeek)
  const { data: trackers = [] } = useTrackers(householdId)

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))

  // 今週の集計
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

  // 曜日別集計（月〜日の7日分を常に表示）
  const weekDays = ['月', '火', '水', '木', '金', '土', '日']
  const dailyTotals: Record<string, number> = {}

  // 週の各日の金額を初期化
  for (let i = 0; i < 7; i++) {
    const date = format(addDays(weekStart, i), 'yyyy-MM-dd')
    dailyTotals[date] = 0
  }

  // 支出を日付別に集計
  currentExpenses.forEach((expense) => {
    if (dailyTotals[expense.date] !== undefined) {
      dailyTotals[expense.date] += expense.amount
    }
  })

  // 曜日順でデータを作成
  const dailyData = Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount], index) => ({
      date,
      amount,
      name: weekDays[index],
    }))

  // トラッカー集計
  const trackerSummaries = aggregateTrackers(
    trackers.map((t) => ({ id: t.id, category_id: t.category_id, category: t.category })),
    currentExpenses,
    previousExpenses
  )

  // AI分析用: 常に先週の開始日（振り返りは完結した期間で行う）
  const lastWeekStart = getLastWeekStart()
  const periodStartStr = format(lastWeekStart, 'yyyy-MM-dd')

  // 日別グラフクリック時のハンドラ
  const handleDayClick = (_: unknown, index: number) => {
    const dayData = dailyData[index]
    if (dayData) {
      const filtered = currentExpenses.filter((e) => e.date === dayData.date)
      const dateLabel = format(new Date(dayData.date), 'M月d日（E）', { locale: ja })
      setSheetTitle(`${dateLabel}の支出`)
      setSheetExpenses(filtered)
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
      {/* 週選択 */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold">
              {format(weekStart, 'M/d(E)', { locale: ja })}〜{format(weekEnd, 'M/d(E)', { locale: ja })}
            </p>
            <p className="text-sm text-muted-foreground">
              合計: ¥{currentTotal.toLocaleString()}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextWeek}>
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
            periodType="week"
            periodStart={periodStartStr}
          />

          {/* 先週比 */}
          <ComparisonSummary
            currentTotal={currentTotal}
            previousTotal={previousTotal}
            currentLabel="今週"
            previousLabel="先週"
          />

          {/* 日別推移 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">日別支出</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} className="cursor-pointer">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [`¥${Number(value).toLocaleString()}`, '支出']}
                      />
                      <Bar
                        dataKey="amount"
                        fill="#F97316"
                        radius={[4, 4, 0, 0]}
                        onClick={(data, index) => handleDayClick(data, index)}
                      >
                        {dailyData.map((entry, index) => (
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
            periodLabel="週間"
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
