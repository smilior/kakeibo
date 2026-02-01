'use client'

import { useState } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/hooks/use-user'
import { useExpenses, useDeleteExpense } from '@/lib/queries/expenses'
import { ExpenseEditDialog } from '@/components/features/expenses/expense-edit-dialog'
import { toast } from 'sonner'
import type { Expense, Category, User, FamilyMember } from '@/types/database'

interface ExpenseWithRelations extends Expense {
  category: Category | null
  user: User | null
  family_member: FamilyMember | null
}

export default function ExpensesPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [editingExpense, setEditingExpense] = useState<ExpenseWithRelations | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { data: user } = useUser()
  const { data, isLoading } = useExpenses(
    user?.household_id ?? undefined,
    currentMonth
  )
  const expenses = data?.expenses ?? []
  const period = data?.period
  const deleteExpense = useDeleteExpense()

  const handleEdit = (expense: ExpenseWithRelations) => {
    setEditingExpense(expense)
    setIsEditDialogOpen(true)
  }

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const handleDelete = async (expense: ExpenseWithRelations) => {
    if (!confirm('この支出を削除しますか？')) return

    try {
      await deleteExpense.mutateAsync(expense.id)
      toast.success('支出を削除しました')
    } catch (error) {
      console.error('Failed to delete:', error)
      toast.error('削除に失敗しました')
    }
  }

  // 日付でグループ化
  const expensesByDate = expenses.reduce(
    (acc, expense) => {
      const date = expense.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(expense as ExpenseWithRelations)
      return acc
    },
    {} as Record<string, ExpenseWithRelations[]>
  )

  const sortedDates = Object.keys(expensesByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">支出履歴</h1>

      {/* 月選択 */}
      <Card className="mb-4">
        <CardContent className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold">
              {format(currentMonth, 'yyyy年M月', { locale: ja })}
            </p>
            {period && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(period.startDate), 'M/d', { locale: ja })} 〜{' '}
                {format(new Date(period.endDate), 'M/d', { locale: ja })}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              合計: ¥{totalAmount.toLocaleString()} ({expenses.length}件)
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            この月の支出はありません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                {format(new Date(date), 'M月d日（E）', { locale: ja })}
              </p>
              <div className="space-y-2">
                {expensesByDate[date].map((expense: ExpenseWithRelations) => (
                  <Card key={expense.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <span className="text-2xl">{expense.category?.icon || '📁'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {expense.category?.name}
                        </p>
                        {expense.memo && (
                          <p className="text-sm text-muted-foreground truncate">
                            {expense.memo}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ¥{expense.amount.toLocaleString()}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          {expense.family_member && (
                            <span className="inline-block rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">
                              {expense.family_member.name}
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {expense.user?.nickname || expense.user?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense)}
                          disabled={deleteExpense.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 編集ダイアログ */}
      <ExpenseEditDialog
        expense={editingExpense}
        householdId={user?.household_id ?? ''}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  )
}
