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

// 月別比較データ取得（締め日対応）
export function useMonthlyComparison(householdId: string | undefined, month: Date) {
  return useQuery({
    queryKey: ['analytics', 'monthly', householdId, month.toISOString()],
    queryFn: async () => {
      if (!householdId) return { current: [], previous: [] }

      const supabase = createClient()

      // 今月の締め日ベース期間を取得
      const targetDate = new Date(month.getFullYear(), month.getMonth(), 15)
      const { data: currentPeriod, error: currentPeriodError } = await supabase.rpc(
        'get_period_for_date',
        {
          p_household_id: householdId,
          p_target_date: format(targetDate, 'yyyy-MM-dd'),
        }
      )

      if (currentPeriodError) throw currentPeriodError

      const current_period = currentPeriod?.[0]
      if (!current_period) {
        return { current: [], previous: [] }
      }

      // 先月の締め日ベース期間を取得
      const prevTargetDate = subMonths(targetDate, 1)
      const { data: prevPeriod, error: prevPeriodError } = await supabase.rpc(
        'get_period_for_date',
        {
          p_household_id: householdId,
          p_target_date: format(prevTargetDate, 'yyyy-MM-dd'),
        }
      )

      if (prevPeriodError) throw prevPeriodError

      const previous_period = prevPeriod?.[0]

      // 今月の支出
      const { data: current, error: currentError } = await supabase
        .from('expenses')
        .select(`
          *,
          category:categories(id, name, icon),
          user:users(id, name, nickname, avatar_url)
        `)
        .eq('household_id', householdId)
        .gte('date', current_period.start_date)
        .lte('date', current_period.end_date)
        .order('date', { ascending: true })

      if (currentError) throw currentError

      // 先月の支出
      let previous: typeof current = []
      if (previous_period) {
        const { data: prevData, error: prevError } = await supabase
          .from('expenses')
          .select(`
            *,
            category:categories(id, name, icon),
            user:users(id, name, nickname, avatar_url)
          `)
          .eq('household_id', householdId)
          .gte('date', previous_period.start_date)
          .lte('date', previous_period.end_date)
          .order('date', { ascending: true })

        if (prevError) throw prevError
        previous = prevData || []
      }

      return {
        current: current || [],
        previous: previous,
        currentStart: current_period.start_date,
        currentEnd: current_period.end_date,
        previousStart: previous_period?.start_date || '',
        previousEnd: previous_period?.end_date || '',
      }
    },
    enabled: !!householdId,
  })
}

// 年別支出データ取得（締め日対応）
export function useYearlyExpenses(householdId: string | undefined, year: number) {
  return useQuery({
    queryKey: ['analytics', 'yearly', householdId, year],
    queryFn: async () => {
      if (!householdId) return []

      const supabase = createClient()

      // 12ヶ月分の締め日ベース期間を並列で取得
      const periodPromises = Array.from({ length: 12 }, (_, i) => {
        const targetDate = new Date(year, i, 15)
        return supabase.rpc('get_period_for_date', {
          p_household_id: householdId,
          p_target_date: format(targetDate, 'yyyy-MM-dd'),
        }).then(({ data, error }) => {
          if (error) throw error
          const period = data?.[0]
          return period ? { month: i, startDate: period.start_date, endDate: period.end_date } : null
        })
      })

      const periodResults = await Promise.all(periodPromises)
      const periods = periodResults.filter((p): p is { month: number; startDate: string; endDate: string } => p !== null)

      if (periods.length === 0) {
        return Array.from({ length: 12 }, (_, i) => ({
          month: i,
          monthLabel: `${i + 1}月`,
          amount: 0,
        }))
      }

      // 全期間をカバーする日付範囲で支出を取得
      const allStartDates = periods.map((p) => p.startDate)
      const allEndDates = periods.map((p) => p.endDate)
      const minDate = allStartDates.sort()[0]
      const maxDate = allEndDates.sort().reverse()[0]

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          amount,
          date,
          category:categories(id, name, icon),
          user:users(id, name, nickname)
        `)
        .eq('household_id', householdId)
        .gte('date', minDate)
        .lte('date', maxDate)
        .order('date', { ascending: true })

      if (error) throw error

      // 各支出がどの期間に属するか判定して集計
      const monthlyTotals: Record<number, number> = {}
      for (let i = 0; i < 12; i++) {
        monthlyTotals[i] = 0
      }

      data?.forEach((expense) => {
        const expenseDate = expense.date
        const matchingPeriod = periods.find(
          (p) => expenseDate >= p.startDate && expenseDate <= p.endDate
        )
        if (matchingPeriod) {
          monthlyTotals[matchingPeriod.month] += expense.amount
        }
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
// 週別: 先週のデータを分析（月曜以降に生成）
// 月別: 先月のデータを分析（締め日ベース）
export function useAutoGenerateAnalysis(householdId: string | undefined) {
  const hasRunRef = useRef(false)

  useEffect(() => {
    // householdIdがない、または既に実行済みの場合はスキップ
    if (!householdId || hasRunRef.current) return

    hasRunRef.current = true

    const generateAnalyses = async () => {
      const now = new Date()
      const supabase = createClient()

      // 先週の開始日（月曜日）- 週別は暦週のまま
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
      const lastWeekStart = subWeeks(thisWeekStart, 1)
      const lastWeekStartStr = format(lastWeekStart, 'yyyy-MM-dd')

      // 先月の締め日ベース期間を取得
      const lastMonthTarget = subMonths(now, 1)
      const { data: lastPeriodData } = await supabase.rpc(
        'get_period_for_date',
        {
          p_household_id: householdId,
          p_target_date: format(new Date(lastMonthTarget.getFullYear(), lastMonthTarget.getMonth(), 15), 'yyyy-MM-dd'),
        }
      )

      const lastPeriod = lastPeriodData?.[0]
      const lastMonthStartStr = lastPeriod?.start_date || format(startOfMonth(lastMonthTarget), 'yyyy-MM-dd')

      // 週別分析を生成（先週のデータ）
      try {
        await fetch('/api/analytics/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periodType: 'week',
            periodStart: lastWeekStartStr,
          }),
        })
      } catch (error) {
        console.error('Failed to generate weekly analysis:', error)
      }

      // 月別分析を生成（先月のデータ - 締め日ベース）
      try {
        await fetch('/api/analytics/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periodType: 'month',
            periodStart: lastMonthStartStr,
          }),
        })
      } catch (error) {
        console.error('Failed to generate monthly analysis:', error)
      }
    }

    generateAnalyses()
  }, [householdId])
}
