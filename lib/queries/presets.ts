import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ExpensePreset, ExpensePresetItem, Category, FamilyMember } from '@/types/database'

export interface PresetItemWithRelations extends ExpensePresetItem {
  category: Category | null
  family_member: FamilyMember | null
}

export interface PresetWithItems extends ExpensePreset {
  items: PresetItemWithRelations[]
}

export function usePresets(householdId: string | undefined) {
  return useQuery({
    queryKey: ['presets', 'list', householdId],
    queryFn: async (): Promise<PresetWithItems[]> => {
      if (!householdId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('expense_presets')
        .select(`
          *,
          items:expense_preset_items(
            *,
            category:categories(id, name, icon),
            family_member:family_members(id, name)
          )
        `)
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error

      // 各プリセットの項目をsort_orderでソート
      return (data || []).map((preset) => ({
        ...preset,
        items: (preset.items || []).sort(
          (a: PresetItemWithRelations, b: PresetItemWithRelations) => a.sort_order - b.sort_order
        ),
      })) as PresetWithItems[]
    },
    enabled: !!householdId,
  })
}

interface CreatePresetInput {
  household_id: string
  name: string
}

export function useCreatePreset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePresetInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('expense_presets')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
    },
  })
}

export function useUpdatePreset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('expense_presets')
        .update({ name })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
    },
  })
}

export function useDeletePreset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('expense_presets')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
    },
  })
}

interface CreatePresetItemInput {
  preset_id: string
  category_id: string
  family_member_id?: string | null
  amount: number
  memo?: string
}

export function useCreatePresetItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePresetItemInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('expense_preset_items')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
    },
  })
}

export function useUpdatePresetItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      category_id?: string
      family_member_id?: string | null
      amount?: number
      memo?: string
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('expense_preset_items')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
    },
  })
}

export function useDeletePresetItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('expense_preset_items')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
    },
  })
}

interface BulkCreateFromPresetInput {
  household_id: string
  user_id: string
  date: string
  items: {
    category_id: string
    family_member_id?: string | null
    amount: number
    memo?: string | null
  }[]
  presetName: string
}

export function useBulkCreateFromPreset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BulkCreateFromPresetInput) => {
      const supabase = createClient()

      // 支出を一括挿入
      const expenses = input.items.map((item) => ({
        household_id: input.household_id,
        user_id: input.user_id,
        category_id: item.category_id,
        amount: item.amount,
        date: input.date,
        memo: item.memo || null,
        family_member_id: item.family_member_id || null,
      }))

      const { data, error } = await supabase
        .from('expenses')
        .insert(expenses)
        .select()

      if (error) throw error

      // LINE通知: 登録した最初の支出IDで通知
      if (data && data.length > 0) {
        try {
          await fetch('/api/line/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expenseId: data[0].id }),
          })
        } catch (e) {
          console.error('LINE notify failed:', e)
        }
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
