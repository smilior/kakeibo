import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60 // Vercel Functionsの最大実行時間

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // リクエストボディから強制再生成フラグを取得
    let force = false
    try {
      const body = await request.json()
      force = body.force === true
    } catch {
      // ボディがない場合は無視
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

    // 家計設定（AI設定含む）を取得
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('ai_model, ai_system_prompt')
      .eq('id', householdId)
      .single()

    if (householdError) {
      console.error('Failed to fetch household:', householdError)
    }

    // デバッグログ
    console.log('Household data:', {
      hasData: !!household,
      aiModel: household?.ai_model,
      hasSystemPrompt: !!household?.ai_system_prompt,
      promptLength: household?.ai_system_prompt?.length,
    })

    const aiModel = household?.ai_model || 'gemini-3-flash-preview'
    const aiSystemPrompt = household?.ai_system_prompt || null

    const today = new Date().toISOString().split('T')[0]
    const dayOfWeek = new Date().getDay() // 0=日, 1=月, ..., 5=金, 6=土
    const dayName = new Date().toLocaleDateString('ja-JP', { weekday: 'long' })

    // 今日のアドバイスが既に存在するかチェック
    const { data: existingAdvice } = await supabase
      .from('daily_advice')
      .select('id')
      .eq('household_id', householdId)
      .eq('date', today)
      .single()

    if (existingAdvice) {
      if (force) {
        // 強制再生成の場合は既存のアドバイスを削除
        await supabase
          .from('daily_advice')
          .delete()
          .eq('id', existingAdvice.id)
      } else {
        return NextResponse.json({ message: 'Already generated today' })
      }
    }

    // 締め日に基づく計測期間を取得
    const { data: periodData, error: periodError } = await supabase.rpc(
      'get_current_period',
      { p_household_id: householdId }
    )

    if (periodError) {
      console.error('Failed to fetch period:', periodError)
    }

    const period = periodData?.[0]
    const periodStartDate = period?.start_date || new Date().toISOString().split('T')[0]
    const periodEndDate = period?.end_date || new Date().toISOString().split('T')[0]

    // 今期間の支出データを取得
    const { data: expenses } = await supabase
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
      .gte('date', periodStartDate)
      .lte('date', periodEndDate)
      .order('date', { ascending: false })

    // 回数ルールと現在の利用状況を取得
    const { data: rules } = await supabase
      .from('rules')
      .select(`
        monthly_limit,
        category:categories(name)
      `)
      .eq('household_id', householdId)
      .eq('is_active', true)

    // サブスク情報を取得
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('name, monthly_amount')
      .eq('household_id', householdId)
      .eq('is_active', true)

    // カテゴリ別・ユーザー別の支出集計
    const categoryTotals: Record<string, { amount: number; count: number }> = {}
    const userTotals: Record<string, { amount: number; count: number }> = {}
    let totalExpense = 0

    expenses?.forEach((expense) => {
      const category = expense.category as unknown as { name: string } | null
      const userInfo = expense.user as unknown as { nickname: string } | null
      const categoryName = category?.name || 'その他'
      const familyMemberInfo = expense.family_member as unknown as { name: string } | null
      const userName = familyMemberInfo?.name || userInfo?.nickname || '不明'

      // カテゴリ別集計
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = { amount: 0, count: 0 }
      }
      categoryTotals[categoryName].amount += expense.amount
      categoryTotals[categoryName].count += 1

      // ユーザー別集計
      if (!userTotals[userName]) {
        userTotals[userName] = { amount: 0, count: 0 }
      }
      userTotals[userName].amount += expense.amount
      userTotals[userName].count += 1

      totalExpense += expense.amount
    })

    // ルールの達成状況
    const ruleStatus = rules?.map((rule) => {
      const category = rule.category as unknown as { name: string } | null
      const categoryName = category?.name || ''
      const current = categoryTotals[categoryName]?.count || 0
      return {
        category: categoryName,
        limit: rule.monthly_limit,
        current,
        remaining: rule.monthly_limit - current,
      }
    })

    // サブスク合計
    const subscriptionTotal =
      subscriptions?.reduce((sum, s) => sum + s.monthly_amount, 0) || 0

    // 曜日別のコンテキスト
    const getDayContext = () => {
      switch (dayOfWeek) {
        case 1: // 月曜
          return '今日は月曜日。先週の支出を振り返り、今週の計画を立てる日です。'
        case 5: // 金曜
          return '今日は金曜日。週末の出費に備えて予算を確認しましょう。'
        case 6: // 土曜
        case 0: // 日曜
          return '週末は出費が増えがち。計画的に楽しみましょう。'
        default:
          return '平日は衝動買いを抑えるチャンス。'
      }
    }

    // 家族バランスの分析
    const userEntries = Object.entries(userTotals)
    const balanceAnalysis = userEntries.length >= 2
      ? (() => {
          const sorted = userEntries.sort((a, b) => b[1].amount - a[1].amount)
          const [top, second] = sorted
          const ratio = second[1].amount > 0
            ? Math.round((top[1].amount / second[1].amount) * 100)
            : 100
          return `${top[0]}の支出が${second[0]}の${ratio}%です。`
        })()
      : null

    // デフォルトのシステムプロンプト
    const defaultSystemPrompt = `あなたは家計管理の「コーチ」です。ユーザーの支出を減らす目標達成をサポートします。

## あなたの役割
- コーチとして目標達成に向けた具体的なアドバイスをする
- 外食・カフェ、趣味・娯楽、衝動買いに特に注目する
- 家族メンバーごとの支出バランスにも触れる
- 短く的確に（1-2文、60文字以内）

## 出力ルール
1. コーチとして具体的な行動を1つ提案する
2. 数字を含める（金額や回数）
3. 回数ルールが上限に近い場合は優先的に警告
4. 家族メンバー間でバランスが偏っている場合は触れる
5. 曜日に応じたアドバイス（金曜→週末計画、月曜→振り返り）
6. 「！」を使って前向きに締める

出力は1-2文のみ。前置きや説明は不要。`

    // 支出データ部分（自動生成）
    const dataPrompt = `
## 今月の支出データ
- 総支出: ¥${totalExpense.toLocaleString()}
- サブスク月額: ¥${subscriptionTotal.toLocaleString()}

### カテゴリ別
${Object.entries(categoryTotals)
  .sort((a, b) => b[1].amount - a[1].amount)
  .map(([name, data]) => `- ${name}: ¥${data.amount.toLocaleString()} (${data.count}回)`)
  .join('\n')}

### 家族別支出
${Object.entries(userTotals)
  .map(([name, data]) => `- ${name}: ¥${data.amount.toLocaleString()} (${data.count}回)`)
  .join('\n')}
${balanceAnalysis ? `\n※ ${balanceAnalysis}` : ''}

## 回数ルールの状況
${
  ruleStatus && ruleStatus.length > 0
    ? ruleStatus
        .map((r) => {
          const status = r.remaining <= 0
            ? '⚠️ 上限到達！'
            : r.remaining === 1
              ? '⚠️ あと1回！'
              : `残り${r.remaining}回`
          return `- ${r.category}: ${r.current}/${r.limit}回 (${status})`
        })
        .join('\n')
    : '- ルール設定なし'
}

## 今日のコンテキスト
- 日付: ${today}（${dayName}）
- ${getDayContext()}
- 計測期間: ${periodStartDate} 〜 ${periodEndDate}
- 期間の${Math.ceil((new Date(today).getTime() - new Date(periodStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}日目（残り${Math.ceil((new Date(periodEndDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))}日）
`

    // プロンプトを構築（設定のシステムプロンプト + 支出データ）
    const systemPrompt = aiSystemPrompt || defaultSystemPrompt
    const prompt = `${systemPrompt}\n${dataPrompt}`

    // デバッグログ
    console.log('Using prompt:', {
      isCustom: !!aiSystemPrompt,
      promptStart: systemPrompt.substring(0, 50),
    })

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

    const advice = response.text?.trim() || '今日も計画的に過ごして、目標達成に近づきましょう！'

    // DBに保存（プロンプトも含める）
    const { error: insertError } = await supabase.from('daily_advice').insert({
      household_id: householdId,
      date: today,
      advice,
      prompt,
    })

    if (insertError) {
      console.error('Failed to insert advice:', insertError)
      return NextResponse.json(
        { error: 'Failed to save advice' },
        { status: 500 }
      )
    }

    return NextResponse.json({ advice })
  } catch (error) {
    console.error('Error generating advice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate advice', details: errorMessage },
      { status: 500 }
    )
  }
}
