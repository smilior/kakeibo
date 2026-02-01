'use client'

import { useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExpenseDetailSheet } from '@/components/features/analytics/expense-detail-sheet'
import type { TrackerSummary } from '@/lib/utils/tracker-aggregation'
import type { Expense, Category, User, FamilyMember } from '@/types/database'

interface ExpenseWithRelations extends Expense {
  category: Category | null
  user: User | null
  family_member: FamilyMember | null
}

interface ExpenseTrackerCardProps {
  trackers: TrackerSummary[]
  expenses: ExpenseWithRelations[]
  periodLabel?: string
}

export function ExpenseTrackerCard({ trackers, expenses, periodLabel }: ExpenseTrackerCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTitle, setSheetTitle] = useState('')
  const [sheetExpenses, setSheetExpenses] = useState<ExpenseWithRelations[]>([])

  if (trackers.length === 0) return null

  const handleClick = (tracker: TrackerSummary) => {
    const filtered = expenses.filter((e) => e.category_id === tracker.categoryId)
    setSheetTitle(`${tracker.categoryIcon} ${tracker.categoryName}の支出`)
    setSheetExpenses(filtered)
    setSheetOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            支出トラッカー
            {periodLabel && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {periodLabel}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trackers.map((tracker) => (
              <div
                key={tracker.trackerId}
                className="flex items-center gap-3 cursor-pointer rounded-md p-2 -m-1 transition-colors hover:bg-muted/50"
                onClick={() => handleClick(tracker)}
              >
                <span className="text-xl">{tracker.categoryIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tracker.categoryName}</p>
                  <p className="text-xs text-muted-foreground">
                    {tracker.currentCount}回
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ¥{tracker.currentTotal.toLocaleString()}
                  </p>
                  {tracker.previousTotal > 0 || tracker.diff !== 0 ? (
                    <p className={`flex items-center justify-end gap-0.5 text-xs ${
                      tracker.diff > 0
                        ? 'text-red-500'
                        : tracker.diff < 0
                          ? 'text-green-500'
                          : 'text-muted-foreground'
                    }`}>
                      {tracker.diff > 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3" />
                          +¥{tracker.diff.toLocaleString()}
                        </>
                      ) : tracker.diff < 0 ? (
                        <>
                          <TrendingDown className="h-3 w-3" />
                          ¥{tracker.diff.toLocaleString()}
                        </>
                      ) : (
                        <span>±¥0</span>
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ExpenseDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={sheetTitle}
        expenses={sheetExpenses}
      />
    </>
  )
}
