import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useFamilyMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: ['family-members', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('family_members')
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

export function useCreateFamilyMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (member: { household_id: string; name: string; sort_order?: number }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('family_members')
        .insert(member)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] })
    },
  })
}

export function useUpdateFamilyMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; sort_order?: number; is_active?: boolean }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('family_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] })
    },
  })
}

export function useDeleteFamilyMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('family_members')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] })
    },
  })
}
