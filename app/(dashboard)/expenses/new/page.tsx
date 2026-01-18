'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExpenseForm } from '@/components/features/expenses/expense-form'

export default function NewExpensePage() {
  const router = useRouter()

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">支出を入力</h1>
      </div>

      <ExpenseForm />
    </div>
  )
}
