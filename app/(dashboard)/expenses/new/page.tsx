'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExpenseForm } from '@/components/features/expenses/expense-form'
import { PresetRegisterSheet } from '@/components/features/expenses/preset-register-sheet'
import { useUser } from '@/hooks/use-user'

export default function NewExpensePage() {
  const router = useRouter()
  const { data: user } = useUser()
  const [isPresetOpen, setIsPresetOpen] = useState(false)

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
        <h1 className="flex-1 text-lg font-semibold">支出を入力</h1>
        {user?.household_id && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPresetOpen(true)}
          >
            <ClipboardList className="mr-1 h-4 w-4" />
            プリセット
          </Button>
        )}
      </div>

      <ExpenseForm />

      {user?.household_id && user?.id && (
        <PresetRegisterSheet
          open={isPresetOpen}
          onOpenChange={setIsPresetOpen}
          householdId={user.household_id}
          userId={user.id}
        />
      )}
    </div>
  )
}
