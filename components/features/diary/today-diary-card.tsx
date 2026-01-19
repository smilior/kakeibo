'use client'

import { useState } from 'react'
import { RefreshCw, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTodayDiary } from '@/lib/queries/diary'
import { useUser } from '@/hooks/use-user'

export function TodayDiaryCard() {
  const { data: user, isLoading: userLoading } = useUser()
  const { data: diary, isLoading, regenerate, isRegenerating } = useTodayDiary(
    user?.household?.id
  )
  const [showPrompt, setShowPrompt] = useState(false)

  if (userLoading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">今日の日記</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!diary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">今日の日記</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin" />
              <p>日記を生成中...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const today = new Date()
  const formattedDate = today.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">今日の日記</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formattedDate}
            {diary.theme && ` - ${diary.theme}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={regenerate}
          disabled={isRegenerating}
          title="再生成"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`}
          />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {diary.content}
        </div>

        {diary.prompt && (
          <div className="mt-4 border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrompt(!showPrompt)}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            >
              {showPrompt ? (
                <>
                  <EyeOff className="mr-1 h-3 w-3" />
                  プロンプトを隠す
                </>
              ) : (
                <>
                  <Eye className="mr-1 h-3 w-3" />
                  プロンプトを確認
                </>
              )}
            </Button>
            {showPrompt && (
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">
                {diary.prompt}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
