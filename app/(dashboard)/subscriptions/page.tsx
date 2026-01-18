'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, XCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUser } from '@/hooks/use-user'
import { useCategories } from '@/lib/queries/categories'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Subscription, Category } from '@/types/database'

interface SubscriptionWithCategory extends Subscription {
  category: Category | null
}

export default function SubscriptionsPage() {
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  const { data: categories = [] } = useCategories(user?.household_id ?? undefined)

  // 契約中のサブスク
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions', 'active', user?.household_id],
    queryFn: async () => {
      if (!user?.household_id) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, category:categories(*)')
        .eq('household_id', user.household_id)
        .eq('is_active', true)
        .order('monthly_amount', { ascending: false })

      if (error) throw error
      return data as SubscriptionWithCategory[]
    },
    enabled: !!user?.household_id,
  })

  // 解約済みのサブスク
  const { data: cancelledSubscriptions = [] } = useQuery({
    queryKey: ['subscriptions', 'cancelled', user?.household_id],
    queryFn: async () => {
      if (!user?.household_id) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, category:categories(*)')
        .eq('household_id', user.household_id)
        .eq('is_active', false)
        .order('cancelled_at', { ascending: false })

      if (error) throw error
      return data as SubscriptionWithCategory[]
    },
    enabled: !!user?.household_id,
  })

  // 編集ダイアログの状態
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SubscriptionWithCategory | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState(0)
  const [categoryId, setCategoryId] = useState('')
  const [memo, setMemo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 解約ダイアログの状態
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<SubscriptionWithCategory | null>(null)
  const [cancelDate, setCancelDate] = useState('')

  const totalAmount = subscriptions.reduce((sum, s) => sum + s.monthly_amount, 0)

  const handleOpenDialog = (subscription?: SubscriptionWithCategory) => {
    if (subscription) {
      setEditing(subscription)
      setName(subscription.name)
      setAmount(subscription.monthly_amount)
      setCategoryId(subscription.category_id)
      setMemo(subscription.memo || '')
    } else {
      setEditing(null)
      setName('')
      setAmount(0)
      setCategoryId('')
      setMemo('')
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('サービス名を入力してください')
      return
    }
    if (amount <= 0) {
      toast.error('金額を入力してください')
      return
    }
    if (!categoryId) {
      toast.error('カテゴリを選択してください')
      return
    }
    if (!user?.household_id) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      if (editing) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            name: name.trim(),
            monthly_amount: amount,
            category_id: categoryId,
            memo: memo || null,
          })
          .eq('id', editing.id)

        if (error) throw error
        toast.success('サブスクを更新しました')
      } else {
        const { error } = await supabase.from('subscriptions').insert({
          household_id: user.household_id,
          name: name.trim(),
          monthly_amount: amount,
          category_id: categoryId,
          contract_date: new Date().toISOString().split('T')[0],
          memo: memo || null,
        })

        if (error) throw error
        toast.success('サブスクを追加しました')
      }

      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 解約ダイアログを開く
  const handleOpenCancelDialog = (subscription: SubscriptionWithCategory) => {
    setCancelTarget(subscription)
    setCancelDate(new Date().toISOString().split('T')[0])
    setIsCancelDialogOpen(true)
  }

  // 解約を実行
  const handleCancel = async () => {
    if (!cancelTarget || !cancelDate) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('subscriptions')
        .update({
          is_active: false,
          cancelled_at: cancelDate,
        })
        .eq('id', cancelTarget.id)

      if (error) throw error
      toast.success('サブスクを解約しました')
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsCancelDialogOpen(false)
    } catch (error) {
      console.error('Failed to cancel:', error)
      toast.error('解約に失敗しました')
    }
  }

  // 解約を取り消し（再契約）
  const handleReactivate = async (subscription: SubscriptionWithCategory) => {
    if (!confirm(`「${subscription.name}」を再契約しますか？`)) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('subscriptions')
        .update({
          is_active: true,
          cancelled_at: null,
        })
        .eq('id', subscription.id)

      if (error) throw error
      toast.success('サブスクを再契約しました')
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (error) {
      console.error('Failed to reactivate:', error)
      toast.error('再契約に失敗しました')
    }
  }

  // 完全削除
  const handlePermanentDelete = async (subscription: SubscriptionWithCategory) => {
    if (!confirm(`「${subscription.name}」を完全に削除しますか？\nこの操作は取り消せません。`)) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscription.id)

      if (error) throw error
      toast.success('サブスクを完全に削除しました')
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (error) {
      console.error('Failed to delete:', error)
      toast.error('削除に失敗しました')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">サブスク管理</h1>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
      </div>

      {/* 月額合計 */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">月額合計</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            ¥{totalAmount.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            {subscriptions.length}件のサブスク
          </p>
        </CardContent>
      </Card>

      {/* 編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'サブスクを編集' : '新しいサブスク'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">サービス名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：Netflix"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">月額（円）</Label>
              <Input
                id="amount"
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memo">メモ（任意）</Label>
              <Input
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="メモを入力"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 解約ダイアログ */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>サブスクを解約</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              「{cancelTarget?.name}」を解約します。解約日を指定してください。
            </p>
            <div className="space-y-2">
              <Label htmlFor="cancelDate">解約日</Label>
              <Input
                id="cancelDate"
                type="date"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              解約する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 契約中のサブスク一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            サブスクがまだ登録されていません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="text-2xl">{subscription.category?.icon || '💳'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{subscription.name}</p>
                  {subscription.memo && (
                    <p className="text-sm text-muted-foreground truncate">
                      {subscription.memo}
                    </p>
                  )}
                </div>
                <p className="font-semibold">
                  ¥{subscription.monthly_amount.toLocaleString()}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(subscription)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenCancelDialog(subscription)}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 解約済みサブスク一覧 */}
      {cancelledSubscriptions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-base font-semibold text-muted-foreground">
            解約済み
          </h2>
          <div className="space-y-2">
            {cancelledSubscriptions.map((subscription) => (
              <Card key={subscription.id} className="opacity-60">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="text-2xl">{subscription.category?.icon || '💳'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{subscription.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {subscription.cancelled_at} 解約
                    </p>
                  </div>
                  <p className="font-semibold text-muted-foreground">
                    ¥{subscription.monthly_amount.toLocaleString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleReactivate(subscription)}
                    title="再契約"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePermanentDelete(subscription)}
                    title="完全に削除"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
