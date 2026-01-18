import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Expense, Category, User } from '@/types/database'

// 型定義
export interface ExpenseWithRelations extends Expense {
  category: Category | null
  user: User | null
}
export interface CategoryTotal {
  categoryId: string
  categoryName: string
  icon: string
  amount: number
  count: number
}

export interface UserTotal {
  userId: string
  userName: string
  nickname?: string | null
  amount: number
  count: number
}

export interface RemainingCount {
  category_id: string
  category_name: string
  category_icon: string
  monthly_limit: number
  current_count: number
  remaining_count: number
}

export interface PeriodInfo {
  startDate: string
  endDate: string
}

export interface DashboardSummary {
  totalExpense: number
  subscriptionTotal: number
  variableExpense: number
  expenses: ExpenseWithRelations[]
  categoryTotals: CategoryTotal[]
  userTotals: UserTotal[]
  remainingCounts: RemainingCount[]
  period: PeriodInfo
}

export function useDashboardSummary(householdId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'summary', householdId],
    queryFn: async (): Promise<DashboardSummary | null> => {
      if (!householdId) return null

      const supabase = createClient()

      // 締め日に基づく計測期間を取得
      const { data: periodData, error: periodError } = await supabase.rpc(
        'get_current_period',
        { p_household_id: householdId }
      )

      if (periodError) throw periodError

      const period = periodData?.[0] || {
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      }

      // 計測期間内の支出を取得
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          category:categories(id, name, icon),
          user:users(id, name, nickname)
        `)
        .eq('household_id', householdId)
        .gte('date', period.start_date)
        .lte('date', period.end_date)
        .order('date', { ascending: false })

      if (expensesError) throw expensesError

      // サブスク合計を取得
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('monthly_amount')
        .eq('household_id', householdId)
        .eq('is_active', true)

      if (subsError) throw subsError

      const subscriptionTotal = subscriptions.reduce(
        (sum, sub) => sum + sub.monthly_amount,
        0
      )

      // 残り回数を取得
      const { data: remainingCounts, error: remainingError } = await supabase.rpc(
        'get_remaining_counts',
        { p_household_id: householdId }
      )

      if (remainingError) throw remainingError

      // 集計
      const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0)

      // カテゴリ別集計
      const categoryTotals = expenses.reduce(
        (acc, expense) => {
          const categoryId = expense.category_id
          if (!acc[categoryId]) {
            acc[categoryId] = {
              categoryId,
              categoryName: expense.category?.name || '',
              icon: expense.category?.icon || '📁',
              amount: 0,
              count: 0,
            }
          }
          acc[categoryId].amount += expense.amount
          acc[categoryId].count += 1
          return acc
        },
        {} as Record<
          string,
          {
            categoryId: string
            categoryName: string
            icon: string
            amount: number
            count: number
          }
        >
      )

      // ユーザー別集計
      const userTotals = expenses.reduce(
        (acc, expense) => {
          const userId = expense.user_id
          if (!acc[userId]) {
            acc[userId] = {
              userId,
              userName: expense.user?.name || '',
              nickname: expense.user?.nickname,
              amount: 0,
              count: 0,
            }
          }
          acc[userId].amount += expense.amount
          acc[userId].count += 1
          return acc
        },
        {} as Record<
          string,
          {
            userId: string
            userName: string
            nickname?: string | null
            amount: number
            count: number
          }
        >
      )

      const categoryTotalsArray = Object.values(categoryTotals) as CategoryTotal[]
      const userTotalsArray = Object.values(userTotals) as UserTotal[]

      return {
        totalExpense,
        subscriptionTotal,
        variableExpense: totalExpense,
        expenses: expenses.slice(0, 5) as ExpenseWithRelations[], // 直近5件
        categoryTotals: categoryTotalsArray.sort((a, b) => b.amount - a.amount),
        userTotals: userTotalsArray,
        remainingCounts: (remainingCounts || []) as RemainingCount[],
        period: {
          startDate: period.start_date,
          endDate: period.end_date,
        },
      }
    },
    enabled: !!householdId,
  })
}
