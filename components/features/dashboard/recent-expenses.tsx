'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Expense, Category, User, FamilyMember } from '@/types/database'

interface ExpenseWithRelations extends Expense {
  category: Category | null
  user: User | null
  family_member: FamilyMember | null
}

interface RecentExpensesProps {
  expenses: ExpenseWithRelations[]
}

export function RecentExpenses({ expenses }: RecentExpensesProps) {
  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">直近の支出</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            今月の支出はありません
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">直近の支出</CardTitle>
        <Link
          href="/expenses"
          className="flex items-center text-sm text-primary hover:underline"
        >
          もっと見る
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {expenses.map((expense) => {
          const date = new Date(expense.date)
          const formattedDate = date.toLocaleDateString('ja-JP', {
            month: 'numeric',
            day: 'numeric',
          })
          const displayName = expense.user?.nickname || expense.user?.name || ''

          return (
            <div
              key={expense.id}
              className="flex items-center gap-3 text-sm"
            >
              <span className="w-10 text-muted-foreground">{formattedDate}</span>
              <span className="w-6 text-center">
                {expense.category?.icon || '📁'}
              </span>
              <span className="flex-1 truncate">
                {expense.category?.name}
              </span>
              <span className="font-medium">
                ¥{expense.amount.toLocaleString()}
              </span>
              <span className="w-20 truncate text-muted-foreground text-right">
                {expense.family_member ? `${expense.family_member.name}・` : ''}{displayName}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
