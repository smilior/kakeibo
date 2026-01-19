import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef } from 'react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns'

// 週別支出データ取得
export function useWeeklyExpenses(householdId: string | undefined, weekStart: Date) {
  return useQuery({
    queryKey: ['analytics', 'weekly', householdId, weekStart.toISOString()],
    queryFn: async () => {
      if (!householdId) return { current: [], previous: [] }

      const supabase = createClient()

      // 今週の期間
      const currentStart = startOfWeek(weekStart, { weekStartsOn: 1 })
      const currentEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

      // 先週の期間
      const prevWeekStart = subWeeks(currentStart, 1)
      const prevEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 })

      // 今週の支出
      const { data: current, error: currentError } = await supabase
        .from('expenses')
        .select(`
          *,
          category:categories(id, name, icon),
          user:users(id, name, nickname, avatar_url)
        `)
        .eq('household_id', householdId)
        .gte('date', format(currentStart, 'yyyy-MM-dd'))
        .lte('date', format(currentEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true })

      if (currentError) throw currentError

      // 先週の支出
      const { data: previous, error: prevError } = await supabase
        .from('expenses')
        .select(`
          *,
          category:categories(id, name, icon),
          user:users(id, name, nickname, avatar_url)
        `)
        .eq('household_id', householdId)
        .gte('date', format(prevWeekStart, 'yyyy-MM-dd'))
        .lte('date', format(prevEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true })

      if (prevError) throw prevError

      return {
        current: current || [],
        previous: previous || [],
        currentStart: format(currentStart, 'yyyy-MM-dd'),
        currentEnd: format(currentEnd, 'yyyy-MM-dd'),
        previousStart: format(prevWeekStart, 'yyyy-MM-dd'),
        previousEnd: format(prevEnd, 'yyyy-MM-dd'),
      }
    },
    enabled: !!householdId,
  })
}

// 月別比較データ取得
export function useMonthlyComparison(householdId: string | undefined, month: Date) {
  return useQuery({
    queryKey: ['analytics', 'monthly', householdId, month.toISOString()],
    queryFn: async () => {
      if (!householdId) return { current: [], previous: [] }

      const supabase = createClient()

      // 今月の期間
      const currentStart = startOfMonth(month)
      const currentEnd = endOfMonth(month)

      // 先月の期間
      const prevMonth = subMonths(month, 1)
      const prevStart = startOfMonth(prevMonth)
      const prevEnd = endOfMonth(prevMonth)

      // 今月の支出
      const { data: current, error: currentError } = await supabase
        .from('expenses')
        .select(`
          *,
          category:categories(id, name, icon),
          user:users(id, name, nickname, avatar_url)
        `)
        .eq('household_id', householdId)
        .gte('date', format(currentStart, 'yyyy-MM-dd'))
        .lte('date', format(currentEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true })

      if (currentError) throw currentError

      // 先月の支出
      const { data: previous, error: prevError } = await supabase
        .from('expenses')
        .select(`
          *,
          category:categories(id, name, icon),
          user:users(id, name, nickname, avatar_url)
        `)
        .eq('household_id', householdId)
        .gte('date', format(prevStart, 'yyyy-MM-dd'))
        .lte('date', format(prevEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true })

      if (prevError) throw prevError

      return {
        current: current || [],
        previous: previous || [],
        currentStart: format(currentStart, 'yyyy-MM-dd'),
        currentEnd: format(currentEnd, 'yyyy-MM-dd'),
        previousStart: format(prevStart, 'yyyy-MM-dd'),
        previousEnd: format(prevEnd, 'yyyy-MM-dd'),
      }
    },
    enabled: !!householdId,
  })
}

// 年別支出データ取得
export function useYearlyExpenses(householdId: string | undefined, year: number) {
  return useQuery({
    queryKey: ['analytics', 'yearly', householdId, year],
    queryFn: async () => {
      if (!householdId) return []

      const supabase = createClient()

      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year, 11, 31)

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          amount,
          date,
          category:categories(id, name, icon),
          user:users(id, name, nickname)
        `)
        .eq('household_id', householdId)
        .gte('date', format(yearStart, 'yyyy-MM-dd'))
        .lte('date', format(yearEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true })

      if (error) throw error

      // 月別に集計
      const monthlyTotals: Record<number, number> = {}
      for (let i = 0; i < 12; i++) {
        monthlyTotals[i] = 0
      }

      data?.forEach((expense) => {
        const expenseMonth = new Date(expense.date).getMonth()
        monthlyTotals[expenseMonth] += expense.amount
      })

      return Object.entries(monthlyTotals).map(([month, amount]) => ({
        month: parseInt(month),
        monthLabel: `${parseInt(month) + 1}月`,
        amount,
      }))
    },
    enabled: !!householdId,
  })
}

// 期間分析取得（キャッシュまたは自動生成）
export function usePeriodAnalysis(
  householdId: string | undefined,
  periodType: 'week' | 'month',
  periodStart: string
) {
  return useQuery({
    queryKey: ['analytics', 'analysis', householdId, periodType, periodStart],
    queryFn: async () => {
      if (!householdId) return null

      // API経由で取得（存在しなければ自動生成）
      const response = await fetch('/api/analytics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodType, periodStart }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch analysis')
      }

      const data = await response.json()
      return data.analysis as string
    },
    enabled: !!householdId && !!periodStart,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  })
}

// 分析再生成
export function useRegenerateAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      periodType,
      periodStart,
    }: {
      periodType: 'week' | 'month'
      periodStart: string
    }) => {
      const response = await fetch('/api/analytics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodType, periodStart, force: true }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to regenerate analysis')
      }

      const data = await response.json()
      return data.analysis as string
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['analytics', 'analysis'],
      })
    },
  })
}

// ログイン時に週別・月別分析を自動生成するフック
export function useAutoGenerateAnalysis(householdId: string | undefined) {
  const hasRunRef = useRef(false)

  useEffect(() => {
    // householdIdがない、または既に実行済みの場合はスキップ
    if (!householdId || hasRunRef.current) return

    hasRunRef.current = true

    const generateAnalyses = async () => {
      const now = new Date()

      // 今週の開始日（月曜日）
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')

      // 今月の開始日（1日）
      const monthStart = startOfMonth(now)
      const monthStartStr = format(monthStart, 'yyyy-MM-dd')

      // 週別分析を生成（存在しなければ）
      try {
        await fetch('/api/analytics/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periodType: 'week',
            periodStart: weekStartStr,
          }),
        })
      } catch (error) {
        console.error('Failed to generate weekly analysis:', error)
      }

      // 月別分析を生成（存在しなければ）
      try {
        await fetch('/api/analytics/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periodType: 'month',
            periodStart: monthStartStr,
          }),
        })
      } catch (error) {
        console.error('Failed to generate monthly analysis:', error)
      }
    }

    generateAnalyses()
  }, [householdId])
}
