'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type { Rule, Category } from '@/types/database'

interface RuleWithCategory extends Rule {
  category: Category | null
}

export default function RulesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  const { data: categories = [] } = useCategories(user?.household_id ?? undefined)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['rules', 'list', user?.household_id],
    queryFn: async () => {
      if (!user?.household_id) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('rules')
        .select('*, category:categories(*)')
        .eq('household_id', user.household_id)
        .eq('is_active', true)

      if (error) throw error
      return data as RuleWithCategory[]
    },
    enabled: !!user?.household_id,
  })

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RuleWithCategory | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [monthlyLimit, setMonthlyLimit] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ルールが設定されていないカテゴリ
  const availableCategories = categories.filter(
    (cat) => !rules.some((rule) => rule.category_id === cat.id) || editingRule?.category_id === cat.id
  )

  const handleOpenDialog = (rule?: RuleWithCategory) => {
    if (rule) {
      setEditingRule(rule)
      setCategoryId(rule.category_id)
      setMonthlyLimit(rule.monthly_limit)
    } else {
      setEditingRule(null)
      setCategoryId('')
      setMonthlyLimit(1)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!categoryId) {
      toast.error('カテゴリを選択してください')
      return
    }
    if (monthlyLimit < 1) {
      toast.error('回数は1以上を入力してください')
      return
    }
    if (!user?.household_id) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      if (editingRule) {
        const { error } = await supabase
          .from('rules')
          .update({ category_id: categoryId, monthly_limit: monthlyLimit })
          .eq('id', editingRule.id)

        if (error) throw error
        toast.success('ルールを更新しました')
      } else {
        const { error } = await supabase.from('rules').insert({
          household_id: user.household_id,
          category_id: categoryId,
          monthly_limit: monthlyLimit,
        })

        if (error) throw error
        toast.success('ルールを追加しました')
      }

      queryClient.invalidateQueries({ queryKey: ['rules'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to save rule:', error)
      toast.error('保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (rule: RuleWithCategory) => {
    if (!confirm(`「${rule.category?.name}」のルールを削除しますか？`)) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('rules')
        .update({ is_active: false })
        .eq('id', rule.id)

      if (error) throw error
      toast.success('ルールを削除しました')
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (error) {
      console.error('Failed to delete rule:', error)
      toast.error('削除に失敗しました')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 text-lg font-semibold">ルール設定</h1>
        <Button
          size="sm"
          onClick={() => handleOpenDialog()}
          disabled={availableCategories.length === 0}
        >
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        カテゴリごとの月間利用回数の上限を設定できます。
        夫婦合算でカウントされます。
      </p>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'ルールを編集' : '新しいルール'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">月間上限回数</Label>
              <Input
                id="limit"
                type="number"
                min={1}
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(parseInt(e.target.value) || 1)}
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            ルールがまだ設定されていません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <span className="text-2xl">{rule.category?.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{rule.category?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    月{rule.monthly_limit}回まで
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(rule)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(rule)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
