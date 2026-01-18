'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function SetupPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [householdName, setHouseholdName] = useState('我が家の家計')
  const [nickname, setNickname] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select')
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleCreateHousehold = async () => {
    if (!nickname.trim()) {
      toast.error('ニックネームを入力してください')
      return
    }

    setIsCreating(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('ログインしてください')
        router.push('/login')
        return
      }

      // 家計作成、ユーザー紐付け、デフォルトカテゴリ作成を一括で実行
      const { error } = await supabase.rpc('create_household_and_setup', {
        p_household_name: householdName,
        p_nickname: nickname,
      })

      if (error) throw error

      // キャッシュを無効化して最新データを取得
      await queryClient.invalidateQueries({ queryKey: ['user'] })

      toast.success('家計を作成しました')
      router.push('/')
      router.refresh()
    } catch (error: unknown) {
      const supabaseError = error as { message?: string; code?: string; details?: string }
      console.error('Failed to create household:', {
        message: supabaseError?.message,
        code: supabaseError?.code,
        details: supabaseError?.details,
        raw: error,
      })
      toast.error(supabaseError?.message || '家計の作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) {
      toast.error('招待コードを入力してください')
      return
    }
    if (!nickname.trim()) {
      toast.error('ニックネームを入力してください')
      return
    }

    setIsJoining(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('ログインしてください')
        router.push('/login')
        return
      }

      // 招待コードを検証
      const { data: invitation, error: invitationError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', inviteCode)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (invitationError || !invitation) {
        toast.error('招待コードが無効または期限切れです')
        return
      }

      // ユーザーを家計に紐づけ
      const { error: userError } = await supabase
        .from('users')
        .update({
          household_id: invitation.household_id,
          nickname: nickname,
        })
        .eq('id', user.id)

      if (userError) throw userError

      // 招待を使用済みにする
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      toast.success('家計に参加しました')
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Failed to join household:', error)
      toast.error('家計への参加に失敗しました')
    } finally {
      setIsJoining(false)
    }
  }

  if (mode === 'select') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-5xl">👨‍👩‍👧‍👦</div>
          <CardTitle>家計を設定</CardTitle>
          <CardDescription>
            新しく家計を作成するか、招待コードで参加してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => setMode('create')}
            className="w-full"
            size="lg"
          >
            新しく家計を作成
          </Button>
          <Button
            onClick={() => setMode('join')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            招待コードで参加
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (mode === 'create') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>新しい家計を作成</CardTitle>
          <CardDescription>
            家計の名前とあなたのニックネームを設定してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="householdName">家計の名前</Label>
            <Input
              id="householdName"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="例：山田家の家計"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">あなたのニックネーム</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例：夫、妻、パパ、ママ"
            />
            <p className="text-xs text-muted-foreground">
              支出記録で表示される名前です
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setMode('select')}
              className="flex-1"
            >
              戻る
            </Button>
            <Button
              onClick={handleCreateHousehold}
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? '作成中...' : '作成する'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>家計に参加</CardTitle>
        <CardDescription>
          パートナーから共有された招待コードを入力してください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inviteCode">招待コード</Label>
          <Input
            id="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="招待コードを入力"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nickname">あなたのニックネーム</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="例：夫、妻、パパ、ママ"
          />
          <p className="text-xs text-muted-foreground">
            支出記録で表示される名前です
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setMode('select')}
            className="flex-1"
          >
            戻る
          </Button>
          <Button
            onClick={handleJoinHousehold}
            disabled={isJoining}
            className="flex-1"
          >
            {isJoining ? '参加中...' : '参加する'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
