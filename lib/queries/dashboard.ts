import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { aggregateTrackers } from '@/lib/utils/tracker-aggregation'
import type { TrackerSummary } from '@/lib/utils/tracker-aggregation'
import type { Expense, Category, User, FamilyMember } from '@/types/database'

// 型定義
export interface ExpenseWithRelations extends Expense {
  category: Category | null
  user: User | null
  family_member: FamilyMember | null
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
  isFamilyMember?: boolean
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
  expenses: ExpenseWithRelations[]
  allExpenses: ExpenseWithRelations[]
  categoryTotals: CategoryTotal[]
  userTotals: UserTotal[]
  remainingCounts: RemainingCount[]
  period: PeriodInfo
  trackerSummaries: TrackerSummary[]
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
          user:users(id, name, nickname),
          family_member:family_members(id, name)
        `)
        .eq('household_id', householdId)
        .gte('date', period.start_date)
        .lte('date', period.end_date)
        .order('date', { ascending: false })

      if (expensesError) throw expensesError

      // 残り回数を取得
      const { data: remainingCounts, error: remainingError } = await supabase.rpc(
        'get_remaining_counts',
        { p_household_id: householdId }
      )

      if (remainingError) throw remainingError

      // トラッカー設定を取得
      const { data: trackers } = await supabase
        .from('expense_trackers')
        .select(`
          *,
          category:categories(id, name, icon)
        `)
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      // 前期間の支出を取得（トラッカー比較用）
      let previousExpenses: { category_id: string; amount: number }[] = []
      if (trackers && trackers.length > 0) {
        // 前期間の日付を計算（現在の期間と同じ長さ分遡る）
        const periodStartDate = new Date(period.start_date)
        const periodEndDate = new Date(period.end_date)
        const periodDays = Math.ceil(
          (periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const prevEnd = new Date(periodStartDate)
        prevEnd.setDate(prevEnd.getDate() - 1)
        const prevStart = new Date(prevEnd)
        prevStart.setDate(prevStart.getDate() - periodDays)

        const trackerCategoryIds = trackers.map((t) => t.category_id)

        const { data: prevData } = await supabase
          .from('expenses')
          .select('category_id, amount')
          .eq('household_id', householdId)
          .gte('date', prevStart.toISOString().split('T')[0])
          .lte('date', prevEnd.toISOString().split('T')[0])
          .in('category_id', trackerCategoryIds)

        previousExpenses = prevData || []
      }

      // トラッカー集計
      const trackerSummaries = trackers
        ? aggregateTrackers(
            trackers as { id: string; category_id: string; category: Category | null }[],
            expenses,
            previousExpenses
          )
        : []

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

      // ユーザー別 + 家族メンバー別集計
      const userTotals = expenses.reduce(
        (acc, expense) => {
          // family_member_idがある場合は家族メンバーとして集計
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
                count: 0,
                isFamilyMember: true,
              }
            } else {
              acc[key] = {
                userId: expense.user_id,
                userName: expense.user?.name || '',
                nickname: expense.user?.nickname,
                amount: 0,
                count: 0,
                isFamilyMember: false,
              }
            }
          }
          acc[key].amount += expense.amount
          acc[key].count += 1
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
            isFamilyMember?: boolean
          }
        >
      )

      const categoryTotalsArray = Object.values(categoryTotals) as CategoryTotal[]
      const userTotalsArray = Object.values(userTotals) as UserTotal[]

      return {
        totalExpense,
        expenses: expenses.slice(0, 5) as ExpenseWithRelations[], // 直近5件
        allExpenses: expenses as ExpenseWithRelations[],
        categoryTotals: categoryTotalsArray.sort((a, b) => b.amount - a.amount),
        userTotals: userTotalsArray,
        remainingCounts: (remainingCounts || []) as RemainingCount[],
        period: {
          startDate: period.start_date,
          endDate: period.end_date,
        },
        trackerSummaries,
      }
    },
    enabled: !!householdId,
  })
}
