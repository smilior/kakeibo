'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUpdateExpense } from '@/lib/queries/expenses'
import { useCategories } from '@/lib/queries/categories'
import { toast } from 'sonner'
import type { Expense, Category, User } from '@/types/database'

interface ExpenseWithRelations extends Expense {
  category: Category | null
  user: User | null
}

interface ExpenseEditDialogProps {
  expense: ExpenseWithRelations | null
  householdId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpenseEditDialog({
  expense,
  householdId,
  open,
  onOpenChange,
}: ExpenseEditDialogProps) {
  const { data: categories = [] } = useCategories(householdId)
  const updateExpense = useUpdateExpense()

  const [date, setDate] = useState<Date>(new Date())
  const [amount, setAmount] = useState(0)
  const [categoryId, setCategoryId] = useState('')
  const [memo, setMemo] = useState('')
  const [isFamily, setIsFamily] = useState(false)

  // ダイアログが開かれた時に値を初期化
  useEffect(() => {
    if (expense && open) {
      setDate(new Date(expense.date))
      setAmount(expense.amount)
      setCategoryId(expense.category_id)
      setMemo(expense.memo || '')
      setIsFamily(expense.is_family)
    }
  }, [expense, open])

  const handleSave = async () => {
    if (!expense) return

    if (amount < 1) {
      toast.error('金額を入力してください')
      return
    }
    if (!categoryId) {
      toast.error('カテゴリを選択してください')
      return
    }

    try {
      await updateExpense.mutateAsync({
        id: expense.id,
        date: format(date, 'yyyy-MM-dd'),
        amount,
        category_id: categoryId,
        memo: memo || undefined,
        is_family: isFamily,
      })
      toast.success('支出を更新しました')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update:', error)
      toast.error('更新に失敗しました')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>支出を編集</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 日付 */}
          <div className="space-y-2">
            <Label>日付</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'yyyy年M月d日（E）', { locale: ja })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  locale={ja}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 金額 */}
          <div className="space-y-2">
            <Label htmlFor="edit-amount">金額</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ¥
              </span>
              <Input
                id="edit-amount"
                type="number"
                inputMode="numeric"
                className="pl-8 text-right text-xl"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          {/* カテゴリ */}
          <div className="space-y-2">
            <Label>カテゴリ</Label>
            <div className="grid grid-cols-5 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors',
                    categoryId === category.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="text-lg">{category.icon}</span>
                  <span className="truncate w-full text-center">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 家族フラグ */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="edit-isFamily"
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
              checked={isFamily}
              onChange={(e) => setIsFamily(e.target.checked)}
            />
            <Label htmlFor="edit-isFamily" className="cursor-pointer">
              家族の支出として記録
            </Label>
          </div>

          {/* メモ */}
          <div className="space-y-2">
            <Label htmlFor="edit-memo">メモ（任意）</Label>
            <Input
              id="edit-memo"
              placeholder="メモを入力"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateExpense.isPending}
              className="flex-1"
            >
              {updateExpense.isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
