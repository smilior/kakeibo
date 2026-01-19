'use client'

import { Lightbulb, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePeriodAnalysis, useRegenerateAnalysis } from '@/lib/queries/analytics'

interface PeriodAnalysisCardProps {
  householdId: string | undefined
  periodType: 'week' | 'month'
  periodStart: string
}

export function PeriodAnalysisCard({
  householdId,
  periodType,
  periodStart,
}: PeriodAnalysisCardProps) {
  const { data: analysis, isLoading, error } = usePeriodAnalysis(
    householdId,
    periodType,
    periodStart
  )

  const regenerate = useRegenerateAnalysis()

  const handleRegenerate = () => {
    regenerate.mutate({ periodType, periodStart })
  }

  const periodLabel = periodType === 'week' ? '週間振り返り' : '月間振り返り'
  const displayAnalysis = regenerate.data || analysis
  const hasNoData = !displayAnalysis

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            {periodLabel}
          </CardTitle>
          {!hasNoData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerate.isPending || isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${regenerate.isPending ? 'animate-spin' : ''}`}
              />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || regenerate.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            分析を取得できませんでした
          </p>
        ) : hasNoData ? (
          <p className="text-sm text-muted-foreground">
            この期間の支出データがないため、分析を生成できません
          </p>
        ) : (
          <p className="text-sm leading-relaxed">
            {displayAnalysis}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
