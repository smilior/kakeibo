'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUser } from '@/hooks/use-user'
import { useCategories } from '@/lib/queries/categories'
import { useCreateExpense } from '@/lib/queries/expenses'
import { toast } from 'sonner'
import type { Category } from '@/types/database'

const expenseSchema = z.object({
  date: z.date(),
  amount: z.number().min(1, '金額を入力してください'),
  categoryId: z.string().min(1, 'カテゴリを選択してください'),
  memo: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

interface ExpenseFormProps {
  onSuccess?: () => void
}

export function ExpenseForm({ onSuccess }: ExpenseFormProps) {
  const router = useRouter()
  const { data: user } = useUser()
  const { data: categories = [] } = useCategories(user?.household_id ?? undefined)
  const createExpense = useCreateExpense()

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      categoryId: '',
      memo: '',
    },
  })

  const watchAmount = form.watch('amount')
  const highAmountThreshold = user?.household?.high_amount_threshold || 5000
  const isHighAmount = watchAmount >= highAmountThreshold

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category)
    form.setValue('categoryId', category.id)
  }

  const onSubmit = async (values: ExpenseFormValues) => {
    if (!user?.id || !user?.household_id) {
      toast.error('ユーザー情報が取得できません')
      return
    }

    try {
      await createExpense.mutateAsync({
        household_id: user.household_id,
        user_id: user.id,
        category_id: values.categoryId,
        amount: values.amount,
        date: format(values.date, 'yyyy-MM-dd'),
        memo: values.memo || undefined,
      })

      toast.success('支出を登録しました')
      form.reset()
      setSelectedCategory(null)
      onSuccess?.()
      router.push('/')
    } catch (error) {
      console.error('Failed to create expense:', error)
      toast.error('支出の登録に失敗しました')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* 日付 */}
      <div className="space-y-2">
        <Label>日付</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !form.watch('date') && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.watch('date') ? (
                format(form.watch('date'), 'yyyy年M月d日（E）', { locale: ja })
              ) : (
                <span>日付を選択</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={form.watch('date')}
              onSelect={(date) => date && form.setValue('date', date)}
              initialFocus
              locale={ja}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 金額 */}
      <div className="space-y-2">
        <Label htmlFor="amount">金額</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ¥
          </span>
          <Input
            id="amount"
            type="number"
            inputMode="numeric"
            className="pl-8 text-right text-xl"
            placeholder="0"
            {...form.register('amount', { valueAsNumber: true })}
            onFocus={(e) => e.target.select()}
          />
        </div>
        {form.formState.errors.amount && (
          <p className="text-sm text-destructive">
            {form.formState.errors.amount.message}
          </p>
        )}
        {isHighAmount && (
          <p className="text-sm text-yellow-600">
            ⚠️ 設定した閾値（¥{highAmountThreshold.toLocaleString()}）以上の高額支出です
          </p>
        )}
      </div>

      {/* カテゴリ */}
      <div className="space-y-2">
        <Label>カテゴリ</Label>
        <div className="grid grid-cols-5 gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategorySelect(category)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors',
                selectedCategory?.id === category.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <span className="text-lg">{category.icon}</span>
              <span className="truncate w-full text-center">{category.name}</span>
            </button>
          ))}
        </div>
        {form.formState.errors.categoryId && (
          <p className="text-sm text-destructive">
            {form.formState.errors.categoryId.message}
          </p>
        )}
        {selectedCategory && (
          <p className="text-sm text-muted-foreground">
            選択中: {selectedCategory.icon} {selectedCategory.name}
          </p>
        )}
      </div>

      {/* メモ */}
      <div className="space-y-2">
        <Label htmlFor="memo">メモ（任意）</Label>
        <Input
          id="memo"
          placeholder="メモを入力"
          {...form.register('memo')}
        />
      </div>

      {/* 登録ボタン */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={createExpense.isPending}
      >
        {createExpense.isPending ? '登録中...' : '登録する'}
      </Button>
    </form>
  )
}
