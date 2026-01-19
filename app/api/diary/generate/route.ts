import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60 // Vercel Functionsの最大実行時間

// 曜日に応じたテーマを取得
function getDiaryTheme(dayOfWeek: number): { theme: string; instruction: string } {
  switch (dayOfWeek) {
    case 1: // 月曜
      return {
        theme: '今週の目標設定',
        instruction: '新しい週の始まりです。今週の節約目標を一緒に立てましょう。具体的な数字を含めた目標を提案してください。',
      }
    case 2: // 火曜
      return {
        theme: '節約Tips',
        instruction: '日常生活で使える実践的な節約テクニックを紹介してください。',
      }
    case 3: // 水曜
      return {
        theme: 'お金の知識',
        instruction: 'お金に関する豆知識やベストプラクティスを楽しく教えてください。',
      }
    case 4: // 木曜
      return {
        theme: '夫婦のお金の話',
        instruction: '夫婦でお金の話をすることの大切さや、コミュニケーションのコツを伝えてください。',
      }
    case 5: // 金曜
      return {
        theme: '週末の計画',
        instruction: '週末の出費に備えて、賢くお金を使う計画を立てましょう。',
      }
    case 6: // 土曜
      return {
        theme: '振り返りと成果確認',
        instruction: '今週の支出を振り返り、良かった点を褒め、改善点を優しく提案してください。',
      }
    case 0: // 日曜
      return {
        theme: '未来への投資',
        instruction: '将来の夢や目標に向けて、今日からできることを考えましょう。',
      }
    default:
      return {
        theme: 'お金の知識',
        instruction: 'お金に関する豆知識を楽しく教えてください。',
      }
  }
}

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
      .select('ai_model')
      .eq('id', householdId)
      .single()

    if (householdError) {
      console.error('Failed to fetch household:', householdError)
    }

    const aiModel = household?.ai_model || 'gemini-3-flash-preview'

    const today = new Date().toISOString().split('T')[0]
    const dayOfWeek = new Date().getDay() // 0=日, 1=月, ..., 5=金, 6=土
    const dayName = new Date().toLocaleDateString('ja-JP', { weekday: 'long' })
    const { theme, instruction } = getDiaryTheme(dayOfWeek)

    // 今日の日記が既に存在するかチェック
    const { data: existingDiary } = await supabase
      .from('ai_diaries')
      .select('id')
      .eq('household_id', householdId)
      .eq('date', today)
      .single()

    if (existingDiary) {
      if (force) {
        // 強制再生成の場合は既存の日記を削除
        await supabase
          .from('ai_diaries')
          .delete()
          .eq('id', existingDiary.id)
      } else {
        return NextResponse.json({ message: 'Already generated today' })
      }
    }

    // 今月の支出データを取得
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    const startDate = startOfMonth.toISOString().split('T')[0]

    const { data: expenses } = await supabase
      .from('expenses')
      .select(`
        amount,
        date,
        is_family,
        category:categories(name),
        user:users(nickname)
      `)
      .eq('household_id', householdId)
      .gte('date', startDate)
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
      const userName = expense.is_family ? '家族' : (userInfo?.nickname || '不明')

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

    // 夫婦バランスの分析
    const userEntries = Object.entries(userTotals).filter(([name]) => name !== '家族')
    const balanceAnalysis = userEntries.length >= 2
      ? (() => {
          const sorted = userEntries.sort((a, b) => b[1].amount - a[1].amount)
          const [top, second] = sorted
          const diff = top[1].amount - second[1].amount
          return `${top[0]}が${second[0]}より¥${diff.toLocaleString()}多く支出しています。`
        })()
      : null

    // 日記用プロンプト
    const systemPrompt = `あなたは家計管理をサポートする「親友」のような存在です。
友達に話しかけるような親しみやすい口調で、毎日の日記を書いてください。

## あなたの役割
- 夫婦の共通目標を意識させる
- お金の知識を楽しく教える
- モチベーションを維持する
- 成果を一緒に喜ぶ
- 小さな努力も見逃さず褒める

## 今日のテーマ
${theme}

## 指示
${instruction}

## 出力ルール
1. 300〜500文字程度で書く
2. 「〜だね」「〜だよ」など親しみやすい口調を使う
3. 具体的な数字や金額を含める
4. 絵文字は使わない（！や♪は使ってOK）
5. 前向きで励みになる内容にする
6. 夫婦で一緒に頑張っている感を出す
7. 今日のテーマに沿った内容にする

出力は日記本文のみ。前置きや説明は不要。`

    // 支出データ部分
    const dataPrompt = `
## 今月の支出データ
- 総支出: ¥${totalExpense.toLocaleString()}
- サブスク月額合計: ¥${subscriptionTotal.toLocaleString()}

### カテゴリ別
${Object.entries(categoryTotals)
  .sort((a, b) => b[1].amount - a[1].amount)
  .slice(0, 5) // 上位5カテゴリ
  .map(([name, data]) => `- ${name}: ¥${data.amount.toLocaleString()} (${data.count}回)`)
  .join('\n')}

### 夫婦別支出
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
            ? '上限到達'
            : r.remaining === 1
              ? 'あと1回'
              : `残り${r.remaining}回`
          return `- ${r.category}: ${r.current}/${r.limit}回 (${status})`
        })
        .join('\n')
    : '- ルール設定なし'
}

## 今日の情報
- 日付: ${today}（${dayName}）
- 月の${new Date().getDate()}日目（残り${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()}日）
`

    const prompt = `${systemPrompt}\n${dataPrompt}`

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

    const content = response.text?.trim() || '今日も一緒に頑張ろうね！'

    // DBに保存
    const { error: insertError } = await supabase.from('ai_diaries').insert({
      household_id: householdId,
      date: today,
      content,
      prompt,
      theme,
    })

    if (insertError) {
      console.error('Failed to insert diary:', insertError)
      return NextResponse.json(
        { error: 'Failed to save diary' },
        { status: 500 }
      )
    }

    return NextResponse.json({ content, theme })
  } catch (error) {
    console.error('Error generating diary:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate diary', details: errorMessage },
      { status: 500 }
    )
  }
}
