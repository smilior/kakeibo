import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import type { FamilyInfo } from '@/types/database'

export const maxDuration = 60

// 曜日に応じたテーマを取得
function getDiaryTheme(dayOfWeek: number): { theme: string; instruction: string } {
  switch (dayOfWeek) {
    case 1: // 月曜
      return {
        theme: '今週の家族イベント',
        instruction: '今週末に家族で楽しめるイベントやお出かけスポットを提案してください。季節に合った無料or低コストのものを中心に。',
      }
    case 2: // 火曜
      return {
        theme: '子供と一緒にできること',
        instruction: '子供の年齢に合わせた、家で一緒にできる遊びや学びの提案をしてください。工作、料理、実験など。',
      }
    case 3: // 水曜
      return {
        theme: '夫婦の会話ネタ',
        instruction: '夫婦で話し合うと良いトピックや、最近の話題のニュースについて会話のきっかけを提供してください。',
      }
    case 4: // 木曜
      return {
        theme: '季節を楽しむ',
        instruction: '今の季節ならではの楽しみ方を提案してください。旬の食材、季節の行事、自然の変化など。',
      }
    case 5: // 金曜
      return {
        theme: '週末のおすすめ',
        instruction: '週末に家族で楽しめる具体的なプランを提案してください。お金をかけずに楽しめる方法を中心に。',
      }
    case 6: // 土曜
      return {
        theme: 'お出かけスポット',
        instruction: '地域の公園、自然スポット、無料施設など、家族でお出かけできる場所を紹介してください。',
      }
    case 0: // 日曜
      return {
        theme: '来週に向けて',
        instruction: '来週の家族の予定や、子供の学校行事などに向けた準備のアドバイスをしてください。',
      }
    default:
      return {
        theme: '家族の時間',
        instruction: '家族で過ごす時間を大切にするためのアイデアを提案してください。',
      }
  }
}

// 季節情報を取得
function getSeasonInfo(month: number): { season: string; events: string[] } {
  if (month >= 3 && month <= 5) {
    return {
      season: '春',
      events: ['お花見', 'ピクニック', '新学期', 'ゴールデンウィーク', '母の日', 'こどもの日'],
    }
  } else if (month >= 6 && month <= 8) {
    return {
      season: '夏',
      events: ['梅雨', '七夕', '夏祭り', '花火大会', 'プール', '夏休み', 'お盆'],
    }
  } else if (month >= 9 && month <= 11) {
    return {
      season: '秋',
      events: ['紅葉', '運動会', 'ハロウィン', '七五三', '読書の秋', '食欲の秋'],
    }
  } else {
    return {
      season: '冬',
      events: ['クリスマス', 'お正月', '節分', 'バレンタイン', '雪遊び', 'スキー'],
    }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

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

    // 家計設定と家族情報を取得
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('ai_model, family_info')
      .eq('id', householdId)
      .single()

    if (householdError) {
      console.error('Failed to fetch household:', householdError)
    }

    const aiModel = household?.ai_model || 'gemini-3-flash-preview'
    const familyInfo = household?.family_info as FamilyInfo | null

    // 日本時間で今日の日付を取得
    const now = new Date()
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const todayStr = `${jstDate.getFullYear()}-${String(jstDate.getMonth() + 1).padStart(2, '0')}-${String(jstDate.getDate()).padStart(2, '0')}`
    const dayOfWeek = jstDate.getDay()
    const dayName = jstDate.toLocaleDateString('ja-JP', { weekday: 'long' })
    const month = jstDate.getMonth() + 1
    const { theme, instruction } = getDiaryTheme(dayOfWeek)
    const { season, events } = getSeasonInfo(jstDate.getMonth())

    // 今日の日記が既に存在するかチェック
    const { data: existingDiary } = await supabase
      .from('ai_diaries')
      .select('id')
      .eq('household_id', householdId)
      .eq('date', todayStr)
      .single()

    if (existingDiary) {
      if (force) {
        await supabase
          .from('ai_diaries')
          .delete()
          .eq('id', existingDiary.id)
      } else {
        return NextResponse.json({ message: 'Already generated today' })
      }
    }

    // 生年月日から年齢を計算する関数
    const calculateAge = (birthDate: string): number => {
      if (!birthDate) return 0
      const birth = new Date(birthDate)
      let age = jstDate.getFullYear() - birth.getFullYear()
      const monthDiff = jstDate.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && jstDate.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    // 家族情報を文字列化
    const childrenInfo = familyInfo?.children?.length
      ? familyInfo.children
          .filter((c) => c.birthDate)
          .map((c) => `${c.name || '子供'}（${calculateAge(c.birthDate)}歳）`)
          .join('、')
      : null

    const regionInfo = familyInfo?.region || null
    const interestsInfo = familyInfo?.interests?.length
      ? familyInfo.interests.join('、')
      : null

    // 日記用プロンプト
    const systemPrompt = `あなたは家族の「親友」のような存在です。
夫婦と子供たちが一緒に楽しめる情報を、親しみやすい口調で伝えてください。

## あなたの役割
- 家族で楽しめるアイデアを提案する
- 季節や地域に合った情報を提供する
- 子供の年齢に合わせた提案をする
- お金をかけずに楽しめる方法を優先する
- 夫婦の会話のきっかけを作る

## 今日のテーマ
${theme}

## 指示
${instruction}

## 出力ルール
1. 300〜500文字程度で書く
2. 「〜だね」「〜だよ」など親しみやすい口調を使う
3. 具体的な提案を2〜3つ含める
4. 絵文字は使わない（！や♪は使ってOK）
5. 前向きで楽しい内容にする
6. 支出分析や節約アドバイスは含めない
7. 家族みんなで楽しめる内容にする

出力は日記本文のみ。前置きや説明は不要。`

    // 家族・地域情報
    const contextPrompt = `
## 家族情報
${childrenInfo ? `- お子さん: ${childrenInfo}` : '- お子さんの情報: 未設定'}
${regionInfo ? `- 住んでいる地域: ${regionInfo}` : '- 地域: 未設定'}
${interestsInfo ? `- 興味・関心: ${interestsInfo}` : ''}

## 今日の情報
- 日付: ${todayStr}（${dayName}）
- 季節: ${season}（${month}月）
- この時期のイベント: ${events.join('、')}

${regionInfo ? `## ${regionInfo}周辺の特徴を考慮してください` : ''}
${childrenInfo ? `## 子供の年齢に合わせた提案をしてください` : ''}
`

    const prompt = `${systemPrompt}\n${contextPrompt}`

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

    const content = response.text?.trim() || '今日も家族で素敵な一日を過ごそう！'

    // DBに保存
    const { error: insertError } = await supabase.from('ai_diaries').insert({
      household_id: householdId,
      date: todayStr,
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
