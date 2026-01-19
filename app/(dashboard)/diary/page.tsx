'use client'

import { TodayDiaryCard } from '@/components/features/diary/today-diary-card'
import { DiaryList } from '@/components/features/diary/diary-list'

export default function DiaryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">AI日記</h1>
      <TodayDiaryCard />
      <DiaryList />
    </div>
  )
}
