'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import type { Expense, Category, User } from '@/types/database'

interface ExpenseWithRelations extends Expense {
  category: Category | null
  user: User | null
}

interface ExpenseDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  expenses: ExpenseWithRelations[]
}

export function ExpenseDetailSheet({
  open,
  onOpenChange,
  title,
  expenses,
}: ExpenseDetailSheetProps) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{title}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {expenses.length}件 / 合計 ¥{total.toLocaleString()}
          </p>
        </SheetHeader>

        {expenses.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            支出がありません
          </p>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <span className="text-2xl">{expense.category?.icon || '📁'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {expense.category?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(expense.date), 'M/d(E)', { locale: ja })}
                      {expense.memo && ` - ${expense.memo}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ¥{expense.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {expense.is_family ? '家族' : (expense.user?.nickname || expense.user?.name)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
