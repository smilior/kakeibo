import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { expenseId } = await request.json()
    const supabase = await createClient()

    // 支出情報を取得
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select(`
        *,
        category:categories(name, icon),
        user:users(name, nickname),
        household:households(line_notify_token, high_amount_threshold)
      `)
      .eq('id', expenseId)
      .single()

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // @ts-ignore - 型の問題を一時的に回避
    const token = expense.household?.line_notify_token
    if (!token) {
      return NextResponse.json({ message: 'LINE not configured' }, { status: 200 })
    }

    // 残り回数を取得
    const { data: remaining } = await supabase.rpc('get_remaining_counts', {
      p_household_id: expense.household_id,
    })

    const categoryRemaining = remaining?.find(
      (r: { category_id: string }) => r.category_id === expense.category_id
    )

    // 通知メッセージ作成
    // @ts-ignore
    const userName = expense.user?.nickname || expense.user?.name
    // @ts-ignore
    const threshold = expense.household?.high_amount_threshold || 5000
    const isHighAmount = expense.amount >= threshold

    let message = `\n【支出登録】\n`
    message += `👤 ${userName}\n`
    // @ts-ignore
    message += `📁 ${expense.category?.name}\n`
    message += `💰 ¥${expense.amount.toLocaleString()}\n`
    if (expense.memo) {
      message += `📝 ${expense.memo}\n`
    }
    if (categoryRemaining) {
      const remainingCount = categoryRemaining.remaining_count
      if (remainingCount <= 1) {
        // @ts-ignore
        message += `⚠️ ${expense.category?.name} 残り${remainingCount}回\n`
      } else {
        // @ts-ignore
        message += `📊 ${expense.category?.name} 残り${remainingCount}回\n`
      }
    }
    if (isHighAmount) {
      message += `🔔 高額支出です！`
    }

    // LINE Notify送信
    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ message }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('LINE Notify failed:', error)
      return NextResponse.json(
        { error: 'LINE Notify failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('LINE notify error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
