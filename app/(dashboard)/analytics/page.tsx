'use client'

import { useState } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/hooks/use-user'
import { useExpenses } from '@/lib/queries/expenses'
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

export default function AnalyticsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { data: user } = useUser()
  const { data: expenses = [], isLoading } = useExpenses(
    user?.household_id ?? undefined,
    currentMonth
  )

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  // カテゴリ別集計
  const categoryTotals = (expenses as ExpenseWithRelations[]).reduce(
    (acc, expense) => {
      const categoryId = expense.category_id
      if (!acc[categoryId]) {
        acc[categoryId] = {
          categoryId,
          categoryName: expense.category?.name || '',
          icon: expense.category?.icon || '📁',
          amount: 0,
        }
      }
      acc[categoryId].amount += expense.amount
      return acc
    },
    {} as Record<string, { categoryId: string; categoryName: string; icon: string; amount: number }>
  )

  // ユーザー別集計
  const userTotals = (expenses as ExpenseWithRelations[]).reduce(
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

  // 日別集計（棒グラフ用）
  const dailyTotals = (expenses as ExpenseWithRelations[]).reduce(
    (acc, expense) => {
      const date = expense.date
      if (!acc[date]) {
        acc[date] = { date, amount: 0 }
      }
      acc[date].amount += expense.amount
      return acc
    },
    {} as Record<string, { date: string; amount: number }>
  )

  const dailyData = Object.values(dailyTotals)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      ...item,
      name: format(new Date(item.date), 'd日'),
    }))

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">分析</h1>

      {/* 月選択 */}
      <Card className="mb-4">
        <CardContent className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold">
              {format(currentMonth, 'yyyy年M月', { locale: ja })}
            </p>
            <p className="text-sm text-muted-foreground">
              合計: ¥{totalAmount.toLocaleString()}
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
        <div className="space-y-4">
          {/* 日別推移 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">日別支出</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} />
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
        </div>
      )}
    </div>
  )
}
