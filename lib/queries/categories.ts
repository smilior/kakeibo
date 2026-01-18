import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useCategories(householdId: string | undefined) {
  return useQuery({
    queryKey: ['categories', 'list', householdId],
    queryFn: async () => {
      if (!householdId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!householdId,
  })
}
