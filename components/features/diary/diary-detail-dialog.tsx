'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DiaryDetailDialogProps {
  diary: {
    id: string
    date: string
    content: string
    prompt: string | null
    theme: string | null
    created_at: string
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DiaryDetailDialog({
  diary,
  open,
  onOpenChange,
}: DiaryDetailDialogProps) {
  const [showPrompt, setShowPrompt] = useState(false)

  if (!diary) return null

  const date = new Date(diary.date)
  const formattedDate = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {formattedDate}
            {diary.theme && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {diary.theme}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  )
}
