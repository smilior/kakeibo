import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

interface RequestBody {
  periodType: 'week' | 'month'
  periodStart: string
  force?: boolean
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // リクエストボディを取得
    const body: RequestBody = await request.json()
    const { periodType, periodStart, force = false } = body

    if (!periodType || !periodStart) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーのhousehold_idを取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.household_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const householdId = userData.household_id

    // 家計設定を取得
    const { data: household } = await supabase
      .from('households')
      .select('ai_model, ai_system_prompt')
      .eq('id', householdId)
      .single()

    const aiModel = household?.ai_model || 'gemini-3-flash-preview'

    // 期間計算
    const startDate = new Date(periodStart)
    let endDate: Date

    if (periodType === 'week') {
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
    } else {
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
    }

    const periodEnd = endDate.toISOString().split('T')[0]

    // 既存の分析をチェック
    const { data: existingAnalysis } = await supabase
      .from('period_analyses')
      .select('id, analysis')
      .eq('household_id', householdId)
      .eq('period_type', periodType)
      .eq('period_start', periodStart)
      .single()

    if (existingAnalysis && !force) {
      return NextResponse.json({ analysis: existingAnalysis.analysis })
    }

    if (existingAnalysis && force) {
      await supabase
        .from('period_analyses')
        .delete()
        .eq('id', existingAnalysis.id)
    }

    // 今期間の支出データを取得
    const { data: currentExpenses } = await supabase
      .from('expenses')
      .select(`
        amount,
        date,
        is_family,
        category:categories(name),
        user:users(nickname)
      `)
      .eq('household_id', householdId)
      .gte('date', periodStart)
      .lte('date', periodEnd)

    // 前期間の計算
    let prevStart: string
    let prevEnd: string

    if (periodType === 'week') {
      const prev = new Date(startDate)
      prev.setDate(prev.getDate() - 7)
      prevStart = prev.toISOString().split('T')[0]
      const prevEndDate = new Date(prev)
      prevEndDate.setDate(prevEndDate.getDate() + 6)
      prevEnd = prevEndDate.toISOString().split('T')[0]
    } else {
      const prev = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1)
      prevStart = prev.toISOString().split('T')[0]
      const prevEndDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 0)
      prevEnd = prevEndDate.toISOString().split('T')[0]
    }

    // 前期間の支出データを取得
    const { data: prevExpenses } = await supabase
      .from('expenses')
      .select(`
        amount,
        date,
        is_family,
        category:categories(name),
        user:users(nickname)
      `)
      .eq('household_id', householdId)
      .gte('date', prevStart)
      .lte('date', prevEnd)

    // カテゴリ別集計関数
    const aggregateByCategory = (
      expenses: typeof currentExpenses
    ): Record<string, { amount: number; count: number }> => {
      const result: Record<string, { amount: number; count: number }> = {}
      expenses?.forEach((expense) => {
        const category = expense.category as unknown as { name: string } | null
        const categoryName = category?.name || 'その他'
        if (!result[categoryName]) {
          result[categoryName] = { amount: 0, count: 0 }
        }
        result[categoryName].amount += expense.amount
        result[categoryName].count += 1
      })
      return result
    }

    // ユーザー別集計関数
    const aggregateByUser = (
      expenses: typeof currentExpenses
    ): Record<string, { amount: number; count: number }> => {
      const result: Record<string, { amount: number; count: number }> = {}
      expenses?.forEach((expense) => {
        const userInfo = expense.user as unknown as { nickname: string } | null
        const userName = expense.is_family ? '家族' : (userInfo?.nickname || '不明')
        if (!result[userName]) {
          result[userName] = { amount: 0, count: 0 }
        }
        result[userName].amount += expense.amount
        result[userName].count += 1
      })
      return result
    }

    const currentTotal = currentExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0
    const prevTotal = prevExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0
    const currentCategoryTotals = aggregateByCategory(currentExpenses)
    const prevCategoryTotals = aggregateByCategory(prevExpenses)
    const currentUserTotals = aggregateByUser(currentExpenses)

    // 増減計算
    const diff = currentTotal - prevTotal
    const diffPercent = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0
    const diffSign = diff >= 0 ? '+' : ''

    // カテゴリ別増減
    const categoryChanges = Object.keys(currentCategoryTotals).map((name) => {
      const current = currentCategoryTotals[name]?.amount || 0
      const prev = prevCategoryTotals[name]?.amount || 0
      const change = current - prev
      const changePercent = prev > 0 ? Math.round((change / prev) * 100) : 0
      return { name, current, prev, change, changePercent }
    })

    // 期間表示
    const periodLabel = periodType === 'week' ? '週' : '月'
    const prevPeriodLabel = periodType === 'week' ? '先週' : '先月'
    const currentPeriodLabel = periodType === 'week' ? '今週' : '今月'

    // プロンプト構築
    const prompt = `## 役割
家計コーチとして、${currentPeriodLabel}と${prevPeriodLabel}の支出を比較分析してください。

## 出力ルール
- 100〜200文字で簡潔に
- 良かった点と改善点を1つずつ含める
- 具体的な数字（金額、増減率）を含める
- 前向きな締めくくり

## ${currentPeriodLabel}の支出データ
- 合計: ¥${currentTotal.toLocaleString()}
- ${prevPeriodLabel}比: ${diffSign}¥${Math.abs(diff).toLocaleString()} (${diffSign}${diffPercent}%)

### カテゴリ別
${Object.entries(currentCategoryTotals)
  .sort((a, b) => b[1].amount - a[1].amount)
  .map(([name, data]) => `- ${name}: ¥${data.amount.toLocaleString()} (${data.count}回)`)
  .join('\n')}

### カテゴリ別増減
${categoryChanges
  .filter((c) => c.change !== 0)
  .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  .slice(0, 5)
  .map((c) => {
    const sign = c.change >= 0 ? '+' : ''
    return `- ${c.name}: ${sign}¥${Math.abs(c.change).toLocaleString()} (${sign}${c.changePercent}%)`
  })
  .join('\n')}

### ${prevPeriodLabel}の支出
- 合計: ¥${prevTotal.toLocaleString()}
${Object.entries(prevCategoryTotals)
  .sort((a, b) => b[1].amount - a[1].amount)
  .map(([name, data]) => `- ${name}: ¥${data.amount.toLocaleString()}`)
  .join('\n')}

### ユーザー別（${currentPeriodLabel}）
${Object.entries(currentUserTotals)
  .map(([name, data]) => `- ${name}: ¥${data.amount.toLocaleString()} (${data.count}回)`)
  .join('\n')}

上記データを踏まえ、100〜200文字で分析結果を出力してください。`

    // Gemini APIを呼び出し
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    })

    const response = await ai.models.generateContent({
      model: aiModel,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    })

    const analysis = response.text?.trim() || `${currentPeriodLabel}の支出は¥${currentTotal.toLocaleString()}でした。`

    // DBに保存
    const { error: insertError } = await supabase.from('period_analyses').insert({
      household_id: householdId,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      analysis,
      prompt,
    })

    if (insertError) {
      console.error('Failed to insert analysis:', insertError)
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      )
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Error generating analysis:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate analysis', details: errorMessage },
      { status: 500 }
    )
  }
}
