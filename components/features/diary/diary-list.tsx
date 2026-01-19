'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDiaryList } from '@/lib/queries/diary'
import { useUser } from '@/hooks/use-user'
import { DiaryDetailDialog } from './diary-detail-dialog'

interface Diary {
  id: string
  date: string
  content: string
  prompt: string | null
  theme: string | null
  created_at: string
}

export function DiaryList() {
  const { data: user, isLoading: userLoading } = useUser()
  const { data: diaries, isLoading } = useDiaryList(user?.household?.id)
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // 今日の日付を除外（TodayDiaryCardで表示するため）
  // ローカル時間で今日の日付を取得
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const pastDiaries = diaries?.filter((diary) => diary.date !== today) || []

  if (userLoading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">過去の日記</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-3">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (pastDiaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">過去の日記</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            まだ過去の日記はありません
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleDiaryClick = (diary: Diary) => {
    setSelectedDiary(diary)
    setDialogOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">過去の日記</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pastDiaries.map((diary) => {
              const date = new Date(diary.date)
              const formattedDate = date.toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              })
              // 冒頭の50文字を表示
              const preview =
                diary.content.length > 50
                  ? diary.content.slice(0, 50) + '...'
                  : diary.content

              return (
                <button
                  key={diary.id}
                  onClick={() => handleDiaryClick(diary)}
                  className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">{formattedDate}</span>
                    {diary.theme && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {diary.theme}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{preview}</p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <DiaryDetailDialog
        diary={selectedDiary}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
