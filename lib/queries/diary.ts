import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface AiDiary {
  id: string
  household_id: string
  date: string
  content: string
  prompt: string | null
  theme: string | null
  created_at: string
}

// 今日の日記を取得・自動生成
export function useTodayDiary(householdId: string | undefined) {
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
    queryKey: ['ai-diary', householdId, today],
    queryFn: async (): Promise<AiDiary | null> => {
      if (!householdId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('ai_diaries')
        .select('*')
        .eq('household_id', householdId)
        .eq('date', today)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        throw error
      }

      return data as AiDiary | null
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5, // 5分間はキャッシュを使用
  })

  // 日記がない場合、非同期でGemini APIを呼び出す
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
    console.log('Triggering diary generation...')

    // 非同期でAPIを呼び出し
    fetch('/api/diary/generate', {
      method: 'POST',
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Diary API response:', data)
        // マウント中のみキャッシュを更新
        if (isMountedRef.current && (data.content || data.message)) {
          queryClient.invalidateQueries({
            queryKey: ['ai-diary', householdId, today],
          })
        }
      })
      .catch((err) => {
        console.error('Failed to generate diary:', err)
      })
  }, [householdId, query.isLoading, query.isFetching, query.data, queryClient, today])

  // 強制再生成関数
  const regenerate = useCallback(async () => {
    if (!householdId || isRegenerating) return

    setIsRegenerating(true)
    try {
      const res = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      const data = await res.json()
      console.log('Diary regenerate response:', data)
      // マウント中のみ状態を更新
      if (isMountedRef.current && data.content) {
        queryClient.invalidateQueries({
          queryKey: ['ai-diary', householdId, today],
        })
      }
    } catch (err) {
      console.error('Failed to regenerate diary:', err)
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

// 過去の日記一覧を取得
export function useDiaryList(householdId: string | undefined) {
  return useQuery({
    queryKey: ['ai-diaries', householdId],
    queryFn: async (): Promise<AiDiary[]> => {
      if (!householdId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('ai_diaries')
        .select('*')
        .eq('household_id', householdId)
        .order('date', { ascending: false })
        .limit(30) // 最新30日分

      if (error) {
        throw error
      }

      return data as AiDiary[]
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5, // 5分間はキャッシュを使用
  })
}
