'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User, Household } from '@/types/database'

interface UserWithHousehold extends User {
  household: Household | null
}

export function useUser() {
  return useQuery({
    queryKey: ['user', 'current'],
    queryFn: async () => {
      const supabase = createClient()

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        return null
      }

      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          household:households(*)
        `)
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error('Failed to fetch user:', error)
        return null
      }

      return data as UserWithHousehold
    },
  })
}
