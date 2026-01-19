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

// 今日の日付を取得（ローカル時間）
function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 今日の日記を取得・自動生成
export function useTodayDiary(householdId: string | undefined) {
  const queryClient = useQueryClient()
  // 最後に生成をトリガーした日付を記録（日付が変わったらリセット）
  const lastTriggeredDateRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  // 日付の状態を管理（日付変更を検知するため）
  const [today, setToday] = useState(getTodayString)

  // コンポーネントのマウント状態を追跡
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 日付変更を定期的にチェック（1分ごと）
  useEffect(() => {
    const checkDateChange = () => {
      const currentDate = getTodayString()
      if (currentDate !== today) {
        console.log('Date changed:', today, '->', currentDate)
        setToday(currentDate)
        // 日付が変わったらトリガーフラグをリセット
        lastTriggeredDateRef.current = null
        // クエリを無効化して再フェッチ
        queryClient.invalidateQueries({
          queryKey: ['ai-diary', householdId],
        })
        queryClient.invalidateQueries({
          queryKey: ['ai-diaries', householdId],
        })
      }
    }

    const interval = setInterval(checkDateChange, 60000) // 1分ごとにチェック
    return () => clearInterval(interval)
  }, [today, householdId, queryClient])

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

    // 今日分が既にトリガー済みならスキップ
    if (lastTriggeredDateRef.current === today) {
      return
    }

    // 今日の生成をトリガー
    lastTriggeredDateRef.current = today
    console.log('Triggering diary generation for:', today)

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
