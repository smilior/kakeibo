import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface DailyAdvice {
  id: string
  household_id: string
  date: string
  advice: string
  prompt: string | null
  created_at: string
}

export function useDailyAdvice(householdId: string | undefined) {
  const queryClient = useQueryClient()
  const hasTriggeredGeneration = useRef(false)
  const isMountedRef = useRef(true)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // コンポーネントのマウント状態を追跡
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const query = useQuery({
    queryKey: ['daily-advice', householdId, today],
    queryFn: async (): Promise<DailyAdvice | null> => {
      if (!householdId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_advice')
        .select('*')
        .eq('household_id', householdId)
        .eq('date', today)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        throw error
      }

      return data as DailyAdvice | null
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5, // 5分間はキャッシュを使用
  })

  // アドバイスがない場合、非同期でGemini APIを呼び出す
  useEffect(() => {
    // ロード中、またはデータがある場合はスキップ
    if (!householdId || query.isLoading || query.isFetching) {
      return
    }

    // 既にデータがある場合はスキップ
    if (query.data) {
      return
    }

    // 既にトリガー済みならスキップ
    if (hasTriggeredGeneration.current) {
      return
    }

    // 1度だけ生成をトリガー
    hasTriggeredGeneration.current = true
    console.log('Triggering advice generation...')

    // 非同期でAPIを呼び出し（awaitしない）
    fetch('/api/advice/generate', {
      method: 'POST',
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Advice API response:', data)
        // マウント中のみキャッシュを更新
        if (isMountedRef.current && (data.advice || data.message)) {
          queryClient.invalidateQueries({
            queryKey: ['daily-advice', householdId, today],
          })
        }
      })
      .catch((err) => {
        console.error('Failed to generate advice:', err)
      })
  }, [householdId, query.isLoading, query.isFetching, query.data, queryClient, today])

  // 強制再生成関数
  const regenerate = useCallback(async () => {
    if (!householdId || isRegenerating) return

    setIsRegenerating(true)
    try {
      const res = await fetch('/api/advice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      const data = await res.json()
      console.log('Advice regenerate response:', data)
      // マウント中のみ状態を更新
      if (isMountedRef.current && data.advice) {
        queryClient.invalidateQueries({
          queryKey: ['daily-advice', householdId, today],
        })
      }
    } catch (err) {
      console.error('Failed to regenerate advice:', err)
    } finally {
      // マウント中のみ状態を更新
      if (isMountedRef.current) {
        setIsRegenerating(false)
      }
    }
  }, [householdId, isRegenerating, queryClient, today])

  return {
    ...query,
    regenerate,
    isRegenerating,
  }
}
