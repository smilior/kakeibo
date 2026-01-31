import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Insertable } from '@/types/database'

interface ExpensesResult {
  expenses: Awaited<ReturnType<typeof fetchExpenses>>
  period: { startDate: string; endDate: string } | null
}

async function fetchExpenses(supabase: ReturnType<typeof createClient>, householdId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      category:categories(id, name, icon),
      user:users(id, name, nickname, avatar_url),
      family_member:family_members(id, name)
    `)
    .eq('household_id', householdId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export function useExpenses(householdId: string | undefined, month: Date) {
  return useQuery({
    queryKey: ['expenses', 'list', householdId, month.toISOString()],
    queryFn: async (): Promise<ExpensesResult> => {
      if (!householdId) return { expenses: [], period: null }

      const supabase = createClient()

      // 締め日に基づく期間を取得
      const targetDate = new Date(month.getFullYear(), month.getMonth(), 15) // 月の中日を指定
      const { data: periodData, error: periodError } = await supabase.rpc(
        'get_period_for_date',
        {
          p_household_id: householdId,
          p_target_date: targetDate.toISOString().split('T')[0],
        }
      )

      if (periodError) throw periodError

      const period = periodData?.[0]
      if (!period) {
        return { expenses: [], period: null }
      }

      const expenses = await fetchExpenses(supabase, householdId, period.start_date, period.end_date)

      return {
        expenses,
        period: { startDate: period.start_date, endDate: period.end_date },
      }
    },
    enabled: !!householdId,
  })
}

interface CreateExpenseInput {
  household_id: string
  user_id: string
  category_id: string
  amount: number
  date: string
  memo?: string
  family_member_id?: string
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expense: CreateExpenseInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single()

      if (error) throw error

      // LINE通知送信
      try {
        await fetch('/api/line/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expenseId: data.id }),
        })
      } catch (e) {
        console.error('LINE notify failed:', e)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

interface UpdateExpenseInput {
  id: string
  category_id?: string
  amount?: number
  date?: string
  memo?: string
  family_member_id?: string | null
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateExpenseInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
