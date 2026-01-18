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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/hooks/use-user'
import { useCategories } from '@/lib/queries/categories'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import type { Category } from '@/types/database'

const EMOJI_OPTIONS = ['🍚', '🍽️', '🧴', '🚃', '🎮', '💳', '👕', '🏥', '🚗', '📦', '🏠', '🎁', '📱', '💡', '🍺']

export default function CategoriesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  const { data: categories = [], isLoading } = useCategories(user?.household_id ?? undefined)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setName(category.name)
      setIcon(category.icon)
    } else {
      setEditingCategory(null)
      setName('')
      setIcon('📁')
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('カテゴリ名を入力してください')
      return
    }
    if (!user?.household_id) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name: name.trim(), icon })
          .eq('id', editingCategory.id)

        if (error) throw error
        toast.success('カテゴリを更新しました')
      } else {
        const { error } = await supabase.from('categories').insert({
          household_id: user.household_id,
          name: name.trim(),
          icon,
          sort_order: categories.length + 1,
        })

        if (error) throw error
        toast.success('カテゴリを追加しました')
      }

      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to save category:', error)
      toast.error('保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (category: Category) => {
    if (!confirm(`「${category.name}」を削除しますか？`)) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('categories')
        .update({ is_active: false })
        .eq('id', category.id)

      if (error) throw error
      toast.success('カテゴリを削除しました')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error('削除に失敗しました')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 text-lg font-semibold">カテゴリ管理</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="mr-1 h-4 w-4" />
              追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'カテゴリを編集' : '新しいカテゴリ'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>アイコン</Label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`rounded-lg border p-2 text-xl transition-colors ${
                        icon === emoji
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">カテゴリ名</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="カテゴリ名を入力"
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
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <span className="text-2xl">{category.icon}</span>
                <span className="flex-1 font-medium">{category.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(category)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(category)}
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
