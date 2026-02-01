'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
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
import { useFamilyMembers } from '@/lib/queries/family-members'
import {
  usePresets,
  useCreatePreset,
  useUpdatePreset,
  useDeletePreset,
  useCreatePresetItem,
  useUpdatePresetItem,
  useDeletePresetItem,
} from '@/lib/queries/presets'
import type { PresetWithItems, PresetItemWithRelations } from '@/lib/queries/presets'
import { toast } from 'sonner'

export default function PresetsPage() {
  const router = useRouter()
  const { data: user } = useUser()
  const householdId = user?.household_id ?? undefined
  const { data: presets = [], isLoading } = usePresets(householdId)
  const { data: categories = [] } = useCategories(householdId)
  const { data: familyMembers = [] } = useFamilyMembers(householdId)

  const createPreset = useCreatePreset()
  const updatePreset = useUpdatePreset()
  const deletePreset = useDeletePreset()
  const createPresetItem = useCreatePresetItem()
  const updatePresetItem = useUpdatePresetItem()
  const deletePresetItem = useDeletePresetItem()

  // プリセット編集ダイアログ
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [presetName, setPresetName] = useState('')

  // 項目編集ダイアログ
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemPresetId, setItemPresetId] = useState('')
  const [itemCategoryId, setItemCategoryId] = useState('')
  const [itemFamilyMemberId, setItemFamilyMemberId] = useState('')
  const [itemAmount, setItemAmount] = useState(0)
  const [itemMemo, setItemMemo] = useState('')

  // 展開状態
  const [expandedPresets, setExpandedPresets] = useState<Record<string, boolean>>({})

  const toggleExpanded = (id: string) => {
    setExpandedPresets((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // プリセットの追加・編集
  const handleOpenPresetDialog = (preset?: PresetWithItems) => {
    if (preset) {
      setEditingPresetId(preset.id)
      setPresetName(preset.name)
    } else {
      setEditingPresetId(null)
      setPresetName('')
    }
    setIsPresetDialogOpen(true)
  }

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error('プリセット名を入力してください')
      return
    }
    if (!householdId) return

    try {
      if (editingPresetId) {
        await updatePreset.mutateAsync({ id: editingPresetId, name: presetName.trim() })
        toast.success('プリセットを更新しました')
      } else {
        await createPreset.mutateAsync({ household_id: householdId, name: presetName.trim() })
        toast.success('プリセットを作成しました')
      }
      setIsPresetDialogOpen(false)
    } catch {
      toast.error('保存に失敗しました')
    }
  }

  const handleDeletePreset = async (preset: PresetWithItems) => {
    if (!confirm(`「${preset.name}」を削除しますか？`)) return
    try {
      await deletePreset.mutateAsync(preset.id)
      toast.success('プリセットを削除しました')
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  // 項目の追加・編集
  const handleOpenItemDialog = (presetId: string, item?: PresetItemWithRelations) => {
    setItemPresetId(presetId)
    if (item) {
      setEditingItemId(item.id)
      setItemCategoryId(item.category_id)
      setItemFamilyMemberId(item.family_member_id || '')
      setItemAmount(item.amount)
      setItemMemo(item.memo || '')
    } else {
      setEditingItemId(null)
      setItemCategoryId('')
      setItemFamilyMemberId('')
      setItemAmount(0)
      setItemMemo('')
    }
    setIsItemDialogOpen(true)
  }

  const handleSaveItem = async () => {
    if (!itemCategoryId) {
      toast.error('カテゴリを選択してください')
      return
    }
    if (itemAmount <= 0) {
      toast.error('金額を入力してください')
      return
    }

    try {
      const familyMemberId = itemFamilyMemberId && itemFamilyMemberId !== 'none' ? itemFamilyMemberId : null

      if (editingItemId) {
        await updatePresetItem.mutateAsync({
          id: editingItemId,
          category_id: itemCategoryId,
          family_member_id: familyMemberId,
          amount: itemAmount,
          memo: itemMemo || '',
        })
        toast.success('項目を更新しました')
      } else {
        await createPresetItem.mutateAsync({
          preset_id: itemPresetId,
          category_id: itemCategoryId,
          family_member_id: familyMemberId,
          amount: itemAmount,
          memo: itemMemo || '',
        })
        toast.success('項目を追加しました')
      }
      setIsItemDialogOpen(false)
    } catch {
      toast.error('保存に失敗しました')
    }
  }

  const handleDeleteItem = async (item: PresetItemWithRelations) => {
    if (!confirm('この項目を削除しますか？')) return
    try {
      await deletePresetItem.mutateAsync(item.id)
      toast.success('項目を削除しました')
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 text-lg font-semibold">プリセット管理</h1>
        <Button size="sm" onClick={() => handleOpenPresetDialog()}>
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
      </div>

      {/* プリセット編集ダイアログ */}
      <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPresetId ? 'プリセットを編集' : '新しいプリセット'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="presetName">プリセット名</Label>
              <Input
                id="presetName"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="例：毎月の固定費"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPresetDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSavePreset}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 項目編集ダイアログ */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItemId ? '項目を編集' : '項目を追加'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
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
            {familyMembers.length > 0 && (
              <div className="space-y-2">
                <Label>家族メンバー（任意）</Label>
                <Select value={itemFamilyMemberId} onValueChange={setItemFamilyMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="指定なし" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">指定なし</SelectItem>
                    {familyMembers.map((fm) => (
                      <SelectItem key={fm.id} value={fm.id}>
                        {fm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="itemAmount">金額（円）</Label>
              <Input
                id="itemAmount"
                type="number"
                value={itemAmount || ''}
                onChange={(e) => setItemAmount(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemMemo">メモ（任意）</Label>
              <Input
                id="itemMemo"
                value={itemMemo}
                onChange={(e) => setItemMemo(e.target.value)}
                placeholder="メモを入力"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveItem}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* プリセット一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : presets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            プリセットがまだ登録されていません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {presets.map((preset) => {
            const isExpanded = expandedPresets[preset.id]
            const itemTotal = preset.items.reduce((sum, item) => sum + item.amount, 0)
            return (
              <Card key={preset.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleExpanded(preset.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <CardTitle className="flex-1 text-base">{preset.name}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {preset.items.length}件 / ¥{itemTotal.toLocaleString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenPresetDialog(preset)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeletePreset(preset)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <div className="space-y-2">
                      {preset.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-md border p-2"
                        >
                          <span className="text-lg">
                            {item.category?.icon || '📁'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.category?.name || ''}
                              {item.family_member && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({item.family_member.name})
                                </span>
                              )}
                            </p>
                            {item.memo && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.memo}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-semibold">
                            ¥{item.amount.toLocaleString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenItemDialog(preset.id, item)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDeleteItem(item)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleOpenItemDialog(preset.id)}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        項目を追加
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
