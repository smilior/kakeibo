'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { usePresets, useBulkCreateFromPreset } from '@/lib/queries/presets'
import type { PresetWithItems } from '@/lib/queries/presets'
import { toast } from 'sonner'

interface PresetRegisterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  userId: string
}

type Step = 'select' | 'confirm'

export function PresetRegisterSheet({
  open,
  onOpenChange,
  householdId,
  userId,
}: PresetRegisterSheetProps) {
  const { data: presets = [] } = usePresets(householdId)
  const bulkCreate = useBulkCreateFromPreset()

  const [step, setStep] = useState<Step>('select')
  const [selectedPreset, setSelectedPreset] = useState<PresetWithItems | null>(null)
  const [date, setDate] = useState<Date>(new Date())
  const [amounts, setAmounts] = useState<Record<string, number>>({})

  const handleSelectPreset = (preset: PresetWithItems) => {
    setSelectedPreset(preset)
    // 各項目の金額を初期化
    const initialAmounts: Record<string, number> = {}
    preset.items.forEach((item) => {
      initialAmounts[item.id] = item.amount
    })
    setAmounts(initialAmounts)
    setStep('confirm')
  }

  const handleAmountChange = (itemId: string, value: number) => {
    setAmounts((prev) => ({ ...prev, [itemId]: value }))
  }

  const handleRegister = async () => {
    if (!selectedPreset) return

    const items = selectedPreset.items.map((item) => ({
      category_id: item.category_id,
      family_member_id: item.family_member_id,
      amount: amounts[item.id] || item.amount,
      memo: item.memo,
    }))

    // 金額が0以下の項目を除外
    const validItems = items.filter((item) => item.amount > 0)
    if (validItems.length === 0) {
      toast.error('登録する項目がありません')
      return
    }

    try {
      await bulkCreate.mutateAsync({
        household_id: householdId,
        user_id: userId,
        date: format(date, 'yyyy-MM-dd'),
        items: validItems,
        presetName: selectedPreset.name,
      })
      toast.success(`「${selectedPreset.name}」から${validItems.length}件を登録しました`)
      handleClose()
    } catch {
      toast.error('登録に失敗しました')
    }
  }

  const handleClose = () => {
    setStep('select')
    setSelectedPreset(null)
    setDate(new Date())
    setAmounts({})
    onOpenChange(false)
  }

  const totalAmount = selectedPreset
    ? selectedPreset.items.reduce((sum, item) => sum + (amounts[item.id] || item.amount), 0)
    : 0

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>
            {step === 'select' ? 'プリセットを選択' : `${selectedPreset?.name}`}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {step === 'select' ? (
            // ステップ1: プリセット選択
            <div className="space-y-2">
              {presets.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  プリセットがありません。設定画面から作成してください。
                </p>
              ) : (
                presets.map((preset) => {
                  const total = preset.items.reduce((sum, item) => sum + item.amount, 0)
                  return (
                    <button
                      key={preset.id}
                      className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{preset.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {preset.items.length}件 / ¥{total.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {preset.items.slice(0, 5).map((item) => (
                          <span key={item.id} className="text-xs text-muted-foreground">
                            {item.category?.icon}{item.category?.name}
                          </span>
                        ))}
                        {preset.items.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            ...他{preset.items.length - 5}件
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            // ステップ2: 確認・登録
            <div className="space-y-4">
              {/* 日付選択 */}
              <div className="space-y-2">
                <Label>登録日</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, 'yyyy年M月d日（E）', { locale: ja })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                      locale={ja}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 項目一覧（金額編集可能） */}
              <div className="space-y-2">
                <Label>登録する項目</Label>
                {selectedPreset?.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <span className="text-lg">{item.category?.icon || '📁'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.category?.name || ''}
                        {item.family_member && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({item.family_member.name})
                          </span>
                        )}
                      </p>
                      {item.memo && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.memo}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">¥</span>
                      <Input
                        type="number"
                        className="w-24 text-right"
                        value={amounts[item.id] || ''}
                        onChange={(e) =>
                          handleAmountChange(item.id, parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 合計・ボタン */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>合計</span>
                  <span>¥{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep('select')}
                  >
                    戻る
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleRegister}
                    disabled={bulkCreate.isPending}
                  >
                    {bulkCreate.isPending ? '登録中...' : '一括登録'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
