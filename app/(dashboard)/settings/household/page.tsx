'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Copy, RefreshCw, Users, Trash2, Crown, User, Plus, Pencil, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useFamilyMembers,
  useCreateFamilyMember,
  useUpdateFamilyMember,
  useDeleteFamilyMember,
} from '@/lib/queries/family-members'

export default function HouseholdPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: user } = useUser()

  const [householdName, setHouseholdName] = useState(user?.household?.name || '')
  const [highAmountThreshold, setHighAmountThreshold] = useState(
    user?.household?.high_amount_threshold || 5000
  )
  const [resetDay, setResetDay] = useState(user?.household?.reset_day || 1)
  const [skipHolidays, setSkipHolidays] = useState(user?.household?.skip_holidays || false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [familyMemberName, setFamilyMemberName] = useState('')
  const [editingFamilyMember, setEditingFamilyMember] = useState<{
    id: string
    name: string
  } | null>(null)
  const [familyMemberToDelete, setFamilyMemberToDelete] = useState<{
    id: string
    name: string
  } | null>(null)

  // 招待リンクを取得
  const { data: invitation, refetch: refetchInvitation } = useQuery({
    queryKey: ['invitation', user?.household_id],
    queryFn: async () => {
      if (!user?.household_id) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('household_id', user.household_id)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!user?.household_id,
  })

  // メンバー一覧を取得
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ['members', user?.household_id],
    queryFn: async () => {
      if (!user?.household_id) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, nickname, avatar_url, role, created_at')
        .eq('household_id', user.household_id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!user?.household_id,
  })

  // 家族メンバー
  const { data: familyMembers = [] } = useFamilyMembers(user?.household_id ?? undefined)
  const createFamilyMember = useCreateFamilyMember()
  const updateFamilyMember = useUpdateFamilyMember()
  const deleteFamilyMember = useDeleteFamilyMember()

  // 現在のユーザーがオーナーかどうか
  const isOwner = user?.role === 'owner'

  const handleSave = async () => {
    if (!user?.household_id) return

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('households')
        .update({
          name: householdName,
          high_amount_threshold: highAmountThreshold,
          reset_day: resetDay,
          skip_holidays: skipHolidays,
        })
        .eq('id', user.household_id)

      if (error) throw error
      toast.success('設定を保存しました')
      queryClient.invalidateQueries({ queryKey: ['user'] })
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateInviteLink = async () => {
    if (!user?.household_id || !user?.id) return

    setIsGenerating(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          household_id: user.household_id,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      await refetchInvitation()
      toast.success('招待リンクを生成しました')
    } catch (error) {
      console.error('Failed to generate invite:', error)
      toast.error('招待リンクの生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyInviteCode = () => {
    if (invitation?.token) {
      navigator.clipboard.writeText(invitation.token)
      toast.success('招待コードをコピーしました')
    }
  }

  const handleAddFamilyMember = async () => {
    if (!user?.household_id || !familyMemberName.trim()) return

    try {
      await createFamilyMember.mutateAsync({
        household_id: user.household_id,
        name: familyMemberName.trim(),
        sort_order: familyMembers.length,
      })
      setFamilyMemberName('')
      toast.success('家族メンバーを追加しました')
    } catch (error) {
      console.error('Failed to add family member:', error)
      toast.error('追加に失敗しました')
    }
  }

  const handleUpdateFamilyMember = async () => {
    if (!editingFamilyMember || !editingFamilyMember.name.trim()) return

    try {
      await updateFamilyMember.mutateAsync({
        id: editingFamilyMember.id,
        name: editingFamilyMember.name.trim(),
      })
      setEditingFamilyMember(null)
      toast.success('家族メンバーを更新しました')
    } catch (error) {
      console.error('Failed to update family member:', error)
      toast.error('更新に失敗しました')
    }
  }

  const handleDeleteFamilyMember = async () => {
    if (!familyMemberToDelete) return

    try {
      await deleteFamilyMember.mutateAsync(familyMemberToDelete.id)
      setFamilyMemberToDelete(null)
      toast.success('家族メンバーを削除しました')
    } catch (error) {
      console.error('Failed to delete family member:', error)
      toast.error('削除に失敗しました')
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    setIsRemoving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('remove_household_member', {
        p_member_id: memberToRemove.id,
      })

      if (error) throw error
      toast.success(`${memberToRemove.name}さんを家計から削除しました`)
      await refetchMembers()
    } catch (error: unknown) {
      const supabaseError = error as { message?: string }
      console.error('Failed to remove member:', error)
      toast.error(supabaseError?.message || 'メンバーの削除に失敗しました')
    } finally {
      setIsRemoving(false)
      setMemberToRemove(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">家計設定</h1>
      </div>

      <div className="space-y-4">
        {/* 基本設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">家計の名前</Label>
              <Input
                id="name"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">高額支出の閾値（円）</Label>
              <Input
                id="threshold"
                type="number"
                value={highAmountThreshold}
                onChange={(e) =>
                  setHighAmountThreshold(parseInt(e.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">
                この金額以上の支出は「高額支出」として通知されます
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resetDay">締め日</Label>
              <Select
                value={String(resetDay)}
                onValueChange={(value) => setResetDay(parseInt(value))}
              >
                <SelectTrigger id="resetDay">
                  <SelectValue placeholder="締め日を選択" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(28)].map((_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}日
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                毎月この日から翌月の前日までが1ヶ月の計測期間になります
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="skipHolidays">土日祝日を避ける</Label>
                <p className="text-xs text-muted-foreground">
                  締め日が土日祝日の場合、直前の平日に前倒しします
                </p>
              </div>
              <Switch
                id="skipHolidays"
                checked={skipHolidays}
                onCheckedChange={setSkipHolidays}
              />
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </CardContent>
        </Card>

        {/* メンバー */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              メンバー
            </CardTitle>
            <CardDescription>
              {isOwner
                ? 'メンバーの管理ができます'
                : '家計に参加しているメンバー一覧です'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {(member.nickname || member.name).slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.nickname || member.name}
                      </p>
                      {member.role === 'owner' ? (
                        <Badge variant="default" className="text-xs">
                          <Crown className="mr-1 h-3 w-3" />
                          オーナー
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <User className="mr-1 h-3 w-3" />
                          メンバー
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  {isOwner && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setMemberToRemove({
                          id: member.id,
                          name: member.nickname || member.name,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 家族メンバー */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              家族メンバー
            </CardTitle>
            <CardDescription>
              支出を「誰のため」に分類するためのメンバーです（例：子供の名前）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {familyMembers.map((fm) => (
              <div
                key={fm.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                {editingFamilyMember?.id === fm.id ? (
                  <>
                    <Input
                      value={editingFamilyMember?.name ?? ''}
                      onChange={(e) =>
                        editingFamilyMember && setEditingFamilyMember({ id: editingFamilyMember.id, name: e.target.value })
                      }
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateFamilyMember()
                        if (e.key === 'Escape') setEditingFamilyMember(null)
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleUpdateFamilyMember}
                      disabled={updateFamilyMember.isPending}
                    >
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingFamilyMember(null)}
                    >
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                      {fm.name.slice(0, 2)}
                    </div>
                    <span className="flex-1 font-medium">{fm.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingFamilyMember({ id: fm.id, name: fm.name })}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setFamilyMemberToDelete({ id: fm.id, name: fm.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <Input
                placeholder="名前を入力（例：栞里）"
                value={familyMemberName}
                onChange={(e) => setFamilyMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddFamilyMember()
                }}
              />
              <Button
                onClick={handleAddFamilyMember}
                disabled={!familyMemberName.trim() || createFamilyMember.isPending}
              >
                <Plus className="mr-1 h-4 w-4" />
                追加
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 招待 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">パートナーを招待</CardTitle>
            <CardDescription>
              招待コードを共有して、パートナーを家計に招待できます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitation ? (
              <div className="space-y-2">
                <Label>招待コード</Label>
                <div className="flex gap-2">
                  <Input value={invitation.token} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={handleCopyInviteCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  有効期限:{' '}
                  {new Date(invitation.expires_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                招待コードがありません。新しく生成してください。
              </p>
            )}
            <Button
              variant="outline"
              onClick={handleGenerateInviteLink}
              disabled={isGenerating}
              className="w-full"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {invitation ? '新しいコードを生成' : '招待コードを生成'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 家族メンバー削除確認ダイアログ */}
      <AlertDialog
        open={!!familyMemberToDelete}
        onOpenChange={(open) => !open && setFamilyMemberToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>家族メンバーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {familyMemberToDelete?.name}を削除します。
              過去の支出データには影響しません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFamilyMember}
              disabled={deleteFamilyMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFamilyMember.isPending ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* メンバー削除確認ダイアログ */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>メンバーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.name}さんを家計から削除します。
              削除されたメンバーは支出の記録や閲覧ができなくなります。
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
