'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useDailyAdvice } from '@/lib/queries/advice'
import { Sparkles, RefreshCw, FileText } from 'lucide-react'

interface DailyAdviceCardProps {
  householdId: string | undefined
}

export function DailyAdviceCard({ householdId }: DailyAdviceCardProps) {
  const { data: advice, isLoading, regenerate, isRegenerating } = useDailyAdvice(householdId)
  const [isPromptOpen, setIsPromptOpen] = useState(false)

  if (isLoading || isRegenerating) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200">
        <CardContent className="flex items-center gap-3 p-4">
          <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
          <p className="flex-1 text-sm text-muted-foreground">
            {isRegenerating ? 'アドバイスを更新中...' : '読み込み中...'}
          </p>
          {isRegenerating && (
            <RefreshCw className="h-4 w-4 text-purple-500 animate-spin" />
          )}
        </CardContent>
      </Card>
    )
  }

  if (!advice) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200">
        <CardContent className="flex items-center gap-3 p-4">
          <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
          <p className="text-sm text-muted-foreground">
            アドバイスを準備中...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200">
      <CardContent className="flex items-center gap-3 p-4">
        <Sparkles className="h-5 w-5 flex-shrink-0 text-purple-500" />
        <p className="flex-1 text-sm font-medium">{advice.advice}</p>
        <div className="flex flex-shrink-0 gap-1">
          {/* プロンプト確認ボタン */}
          <Dialog open={isPromptOpen} onOpenChange={setIsPromptOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-100"
                title="プロンプトを確認"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>AIに送信したプロンプト</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {advice.prompt ? (
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-xs font-mono">
                    {advice.prompt}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    プロンプト情報がありません（以前のバージョンで生成されたアドバイスです）
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
          {/* 更新ボタン */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-100"
            onClick={regenerate}
            disabled={isRegenerating}
            title="アドバイスを更新"
          >
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
