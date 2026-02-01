'use client'

import { useUser } from '@/hooks/use-user'
import { useDashboardSummary } from '@/lib/queries/dashboard'
import { DailyAdviceCard } from '@/components/features/dashboard/daily-advice-card'
import { SummaryCard } from '@/components/features/dashboard/summary-card'
import { RemainingCounts } from '@/components/features/dashboard/remaining-counts'
import { CategoryPieChart } from '@/components/features/dashboard/category-pie-chart'
import { UserComparisonChart } from '@/components/features/dashboard/user-comparison-chart'
import { RecentExpenses } from '@/components/features/dashboard/recent-expenses'

export default function DashboardPage() {
  const { data: user } = useUser()
  const { data: summary, isLoading } = useDashboardSummary(user?.household_id ?? undefined)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DailyAdviceCard householdId={user?.household_id ?? undefined} />

      <SummaryCard
        totalExpense={summary?.totalExpense ?? 0}
        period={summary?.period}
      />

      <RemainingCounts counts={summary?.remainingCounts ?? []} />

      <div className="grid gap-4 sm:grid-cols-2">
        <CategoryPieChart data={summary?.categoryTotals ?? []} />
        <UserComparisonChart data={summary?.userTotals ?? []} />
      </div>

      <RecentExpenses expenses={summary?.expenses ?? []} />
    </div>
  )
}
