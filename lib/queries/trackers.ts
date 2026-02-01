import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ExpenseTracker, Category } from '@/types/database'

export interface TrackerWithCategory extends ExpenseTracker {
  category: Category | null
}

export function useTrackers(householdId: string | undefined) {
  return useQuery({
    queryKey: ['trackers', 'list', householdId],
    queryFn: async (): Promise<TrackerWithCategory[]> => {
      if (!householdId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('expense_trackers')
        .select(`
          *,
          category:categories(id, name, icon)
        `)
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data || []) as TrackerWithCategory[]
    },
    enabled: !!householdId,
  })
}

export function useCreateTracker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { household_id: string; category_id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('expense_trackers')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteTracker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('expense_trackers')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
