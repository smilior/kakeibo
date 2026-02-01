import type { Category } from '@/types/database'

interface TrackerConfig {
  id: string
  category_id: string
  category: Category | null
}

interface ExpenseRecord {
  category_id: string
  amount: number
}

export interface TrackerSummary {
  trackerId: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  currentTotal: number
  currentCount: number
  previousTotal: number
  previousCount: number
  diff: number
}

export function aggregateTrackers(
  trackers: TrackerConfig[],
  currentExpenses: ExpenseRecord[],
  previousExpenses: ExpenseRecord[]
): TrackerSummary[] {
  return trackers.map((tracker) => {
    const currentItems = currentExpenses.filter(
      (e) => e.category_id === tracker.category_id
    )
    const previousItems = previousExpenses.filter(
      (e) => e.category_id === tracker.category_id
    )
    const currentTotal = currentItems.reduce((sum, e) => sum + e.amount, 0)
    const previousTotal = previousItems.reduce((sum, e) => sum + e.amount, 0)

    return {
      trackerId: tracker.id,
      categoryId: tracker.category_id,
      categoryName: tracker.category?.name || '',
      categoryIcon: tracker.category?.icon || '📁',
      currentTotal,
      currentCount: currentItems.length,
      previousTotal,
      previousCount: previousItems.length,
      diff: currentTotal - previousTotal,
    }
  })
}
