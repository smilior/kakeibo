'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUser } from '@/hooks/use-user'
import { WeeklyAnalytics } from '@/components/features/analytics/weekly-analytics'
import { MonthlyAnalytics } from '@/components/features/analytics/monthly-analytics'
import { YearlyAnalytics } from '@/components/features/analytics/yearly-analytics'

export default function AnalyticsPage() {
  const { data: user } = useUser()
  const householdId = user?.household_id ?? undefined

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">分析</h1>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">週別</TabsTrigger>
          <TabsTrigger value="monthly">月別</TabsTrigger>
          <TabsTrigger value="yearly">年別</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <WeeklyAnalytics householdId={householdId} />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyAnalytics householdId={householdId} />
        </TabsContent>

        <TabsContent value="yearly">
          <YearlyAnalytics householdId={householdId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
