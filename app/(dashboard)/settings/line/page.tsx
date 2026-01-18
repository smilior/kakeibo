'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ExternalLink, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export default function LinePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: user } = useUser()

  const [token, setToken] = useState(user?.household?.line_notify_token || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const isConfigured = !!user?.household?.line_notify_token

  const handleSave = async () => {
    if (!user?.household_id) return

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('households')
        .update({ line_notify_token: token || null })
        .eq('id', user.household_id)

      if (error) throw error
      toast.success('LINE連携設定を保存しました')
      queryClient.invalidateQueries({ queryKey: ['user'] })
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!token) {
      toast.error('トークンを入力してください')
      return
    }

    setIsTesting(true)
    try {
      const response = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          message: '\n【テスト通知】\n家計簿アプリとLINE Notifyが正常に連携されています！',
        }),
      })

      if (response.ok) {
        toast.success('テスト通知を送信しました')
      } else {
        const error = await response.json()
        toast.error(`通知に失敗しました: ${error.message}`)
      }
    } catch (error) {
      console.error('Test failed:', error)
      toast.error('テスト通知に失敗しました')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">LINE連携</h1>
      </div>

      <div className="space-y-4">
        {/* 設定状態 */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                isConfigured ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <MessageSquare
                className={`h-5 w-5 ${
                  isConfigured ? 'text-green-600' : 'text-gray-400'
                }`}
              />
            </div>
            <div>
              <p className="font-medium">
                {isConfigured ? '連携済み' : '未連携'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isConfigured
                  ? '支出登録時にLINEに通知されます'
                  : 'LINE Notifyと連携してください'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 設定手順 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">LINE Notify設定手順</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                1
              </span>
              <p>
                <a
                  href="https://notify-bot.line.me/ja/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  LINE Notify公式サイト
                  <ExternalLink className="h-3 w-3" />
                </a>
                にアクセス
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                2
              </span>
              <p>LINEアカウントでログイン</p>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                3
              </span>
              <p>マイページ → アクセストークンの発行</p>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                4
              </span>
              <p>
                トークン名を入力（例：家計簿アプリ）<br />
                通知を受け取るトークルームを選択
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                5
              </span>
              <p>発行されたトークンを下に貼り付け</p>
            </div>
          </CardContent>
        </Card>

        {/* トークン設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">アクセストークン</CardTitle>
            <CardDescription>
              LINE Notifyで発行したトークンを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">アクセストークン</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="トークンを入力"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !token}
                className="flex-1"
              >
                {isTesting ? '送信中...' : 'テスト送信'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
