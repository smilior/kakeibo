import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

interface RequestBody {
  periodType: 'week' | 'month'
  periodStart: string  // 分析対象期間の開始日（先週/先月の開始日）
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

    // 分析対象期間の計算（先週/先月）
    const targetStart = new Date(periodStart)
    let targetEndStr: string

    if (periodType === 'week') {
      const targetEnd = new Date(targetStart)
      targetEnd.setDate(targetEnd.getDate() + 6)
      targetEndStr = targetEnd.toISOString().split('T')[0]
    } else {
      // 月別の場合は締め日ベースの期間終了日を取得
      const { data: periodData } = await supabase.rpc(
        'get_period_for_date',
        {
          p_household_id: householdId,
          p_target_date: periodStart,
        }
      )
      const period = periodData?.[0]
      targetEndStr = period?.end_date || new Date(targetStart.getFullYear(), targetStart.getMonth() + 1, 0).toISOString().split('T')[0]
    }

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

    // 分析対象期間（先週/先月）の支出データを取得
    const { data: targetExpenses } = await supabase
      .from('expenses')
      .select(`
        amount,
        date,
        family_member_id,
        category:categories(name),
        user:users(nickname),
        family_member:family_members(name)
      `)
      .eq('household_id', householdId)
      .gte('date', periodStart)
      .lte('date', targetEndStr)

    // データが空の場合は生成しない
    if (!targetExpenses || targetExpenses.length === 0) {
      return NextResponse.json({
        analysis: null,
        message: 'No data available for this period',
      })
    }

    // 比較期間（先々週/先々月）の計算
    let compareStart: string
    let compareEnd: string

    if (periodType === 'week') {
      const prev = new Date(targetStart)
      prev.setDate(prev.getDate() - 7)
      compareStart = prev.toISOString().split('T')[0]
      const prevEndDate = new Date(prev)
      prevEndDate.setDate(prevEndDate.getDate() + 6)
      compareEnd = prevEndDate.toISOString().split('T')[0]
    } else {
      // 月別の場合は先々月の締め日ベース期間を取得
      const prevTargetDate = new Date(targetStart)
      prevTargetDate.setMonth(prevTargetDate.getMonth() - 1)
      const { data: prevPeriodData } = await supabase.rpc(
        'get_period_for_date',
        {
          p_household_id: householdId,
          p_target_date: prevTargetDate.toISOString().split('T')[0],
        }
      )
      const prevPeriod = prevPeriodData?.[0]
      if (prevPeriod) {
        compareStart = prevPeriod.start_date
        compareEnd = prevPeriod.end_date
      } else {
        const prev = new Date(targetStart.getFullYear(), targetStart.getMonth() - 1, 1)
        compareStart = prev.toISOString().split('T')[0]
        const prevEndDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 0)
        compareEnd = prevEndDate.toISOString().split('T')[0]
      }
    }

    // 比較期間の支出データを取得
    const { data: compareExpenses } = await supabase
      .from('expenses')
      .select(`
        amount,
        date,
        family_member_id,
        category:categories(name),
        user:users(nickname),
        family_member:family_members(name)
      `)
      .eq('household_id', householdId)
      .gte('date', compareStart)
      .lte('date', compareEnd)

    // カテゴリ別集計関数
    const aggregateByCategory = (
      expenses: typeof targetExpenses
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
      expenses: typeof targetExpenses
    ): Record<string, { amount: number; count: number }> => {
      const result: Record<string, { amount: number; count: number }> = {}
      expenses?.forEach((expense) => {
        const userInfo = expense.user as unknown as { nickname: string } | null
        const familyMemberInfo = expense.family_member as unknown as { name: string } | null
        const userName = familyMemberInfo?.name || userInfo?.nickname || '不明'
        if (!result[userName]) {
          result[userName] = { amount: 0, count: 0 }
        }
        result[userName].amount += expense.amount
        result[userName].count += 1
      })
      return result
    }

    const targetTotal = targetExpenses.reduce((sum, e) => sum + e.amount, 0)
    const compareTotal = compareExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0
    const targetCategoryTotals = aggregateByCategory(targetExpenses)
    const compareCategoryTotals = aggregateByCategory(compareExpenses || [])
    const targetUserTotals = aggregateByUser(targetExpenses)

    // 増減計算
    const diff = targetTotal - compareTotal
    const diffPercent = compareTotal > 0 ? Math.round((diff / compareTotal) * 100) : 0
    const diffSign = diff >= 0 ? '+' : ''

    // カテゴリ別増減
    const categoryChanges = Object.keys(targetCategoryTotals).map((name) => {
      const target = targetCategoryTotals[name]?.amount || 0
      const compare = compareCategoryTotals[name]?.amount || 0
      const change = target - compare
      const changePercent = compare > 0 ? Math.round((change / compare) * 100) : 0
      return { name, target, compare, change, changePercent }
    })

    // 期間表示ラベル
    const targetPeriodLabel = periodType === 'week' ? 'この週' : 'この月'
    const comparePeriodLabel = periodType === 'week' ? '前週' : '前月'

    // プロンプト構築
    const prompt = `## 役割
家計コーチとして、${targetPeriodLabel}の支出を振り返り分析してください。

## 出力ルール
- 100〜200文字で簡潔に
- 良かった点と改善点を1つずつ含める
- 具体的な数字（金額、増減率）を含める
- 今週/今月に向けた前向きなアドバイスで締める

## ${targetPeriodLabel}の支出データ
- 合計: ¥${targetTotal.toLocaleString()}
- ${comparePeriodLabel}比: ${diffSign}¥${Math.abs(diff).toLocaleString()} (${diffSign}${diffPercent}%)

### カテゴリ別
${Object.entries(targetCategoryTotals)
  .sort((a, b) => b[1].amount - a[1].amount)
  .map(([name, data]) => `- ${name}: ¥${data.amount.toLocaleString()} (${data.count}回)`)
  .join('\n')}

### カテゴリ別増減（${comparePeriodLabel}比）
${categoryChanges
  .filter((c) => c.change !== 0)
  .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  .slice(0, 5)
  .map((c) => {
    const sign = c.change >= 0 ? '+' : ''
    return `- ${c.name}: ${sign}¥${Math.abs(c.change).toLocaleString()} (${sign}${c.changePercent}%)`
  })
  .join('\n') || '- 変動なし'}

### ${comparePeriodLabel}の支出
- 合計: ¥${compareTotal.toLocaleString()}
${Object.entries(compareCategoryTotals)
  .sort((a, b) => b[1].amount - a[1].amount)
  .map(([name, data]) => `- ${name}: ¥${data.amount.toLocaleString()}`)
  .join('\n') || '- データなし'}

### ユーザー別（${targetPeriodLabel}）
${Object.entries(targetUserTotals)
  .map(([name, data]) => `- ${name}: ¥${data.amount.toLocaleString()} (${data.count}回)`)
  .join('\n')}

上記データを踏まえ、${targetPeriodLabel}の振り返りとして100〜200文字で分析結果を出力してください。`

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

    const analysis = response.text?.trim() || `${targetPeriodLabel}の支出は¥${targetTotal.toLocaleString()}でした。`

    // DBに保存
    const { error: insertError } = await supabase.from('period_analyses').insert({
      household_id: householdId,
      period_type: periodType,
      period_start: periodStart,
      period_end: targetEndStr,
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
