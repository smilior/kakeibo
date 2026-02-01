'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useUser } from '@/hooks/use-user'
import { useCategories } from '@/lib/queries/categories'
import { useTrackers, useCreateTracker, useDeleteTracker } from '@/lib/queries/trackers'
import { toast } from 'sonner'

export default function TrackersPage() {
  const router = useRouter()
  const { data: user } = useUser()
  const householdId = user?.household_id ?? undefined
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(householdId)
  const { data: trackers = [], isLoading: trackersLoading } = useTrackers(householdId)
  const createTracker = useCreateTracker()
  const deleteTracker = useDeleteTracker()

  const isLoading = categoriesLoading || trackersLoading

  // トラッカーに追加されているカテゴリIDのセット
  const trackedCategoryIds = new Set(trackers.map((t) => t.category_id))

  const handleToggle = async (categoryId: string, checked: boolean) => {
    if (!householdId) return

    try {
      if (checked) {
        await createTracker.mutateAsync({
          household_id: householdId,
          category_id: categoryId,
        })
        toast.success('追跡を開始しました')
      } else {
        const tracker = trackers.find((t) => t.category_id === categoryId)
        if (tracker) {
          await deleteTracker.mutateAsync(tracker.id)
          toast.success('追跡を解除しました')
        }
      }
    } catch {
      toast.error('変更に失敗しました')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">支出トラッカー設定</h1>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        追跡するカテゴリをONにすると、ダッシュボードと分析画面で累計金額と前期間比を確認できます。
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">カテゴリ一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3"
                >
                  <span className="text-xl">{category.icon}</span>
                  <span className="flex-1 text-sm font-medium">{category.name}</span>
                  <Switch
                    checked={trackedCategoryIds.has(category.id)}
                    onCheckedChange={(checked) => handleToggle(category.id, checked)}
                    disabled={createTracker.isPending || deleteTracker.isPending}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
