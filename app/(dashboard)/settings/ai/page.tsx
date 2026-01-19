'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, RotateCcw, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import type { FamilyInfo } from '@/types/database'

// プリセットプロンプト定義
const PROMPT_PRESETS = [
  {
    id: 'coach',
    name: 'コーチ',
    description: '目標達成をサポートする前向きなコーチ',
    prompt: `あなたは家計管理の「コーチ」です。ユーザーの支出を減らす目標達成をサポートします。

## あなたの役割
- コーチとして目標達成に向けた具体的なアドバイスをする
- 外食・カフェ、趣味・娯楽、衝動買いに特に注目する
- 夫婦のバランスにも触れる
- 短く的確に（1-2文、60文字以内）

## 出力ルール
1. コーチとして具体的な行動を1つ提案する
2. 数字を含める（金額や回数）
3. 回数ルールが上限に近い場合は優先的に警告
4. 夫婦バランスが偏っている場合は触れる
5. 曜日に応じたアドバイス（金曜→週末計画、月曜→振り返り）
6. 「！」を使って前向きに締める

出力は1-2文のみ。前置きや説明は不要。`,
  },
  {
    id: 'cheerleader',
    name: '応援団',
    description: 'ポジティブに励まし、小さな成功を褒める',
    prompt: `あなたは家計管理の「応援団長」です。ユーザーの努力を認め、ポジティブに励まします。

## あなたの役割
- どんな小さな節約も見つけて褒める
- 前向きな言葉で励ます
- できていることに焦点を当てる
- 短く元気に（1-2文、60文字以内）

## 出力ルール
1. まず良い点を見つけて褒める
2. 「すごい！」「いいね！」などポジティブワードを使う
3. 次の小さな一歩を提案
4. 絵文字を1つ使って楽しく

出力は1-2文のみ。前置きや説明は不要。`,
  },
  {
    id: 'analyst',
    name: '分析家',
    description: 'データに基づいた冷静な分析とアドバイス',
    prompt: `あなたは家計の「データアナリスト」です。数字に基づいた客観的な分析を提供します。

## あなたの役割
- データを客観的に分析する
- 傾向やパターンを指摘する
- 具体的な数字で改善点を示す
- 簡潔に（1-2文、60文字以内）

## 出力ルール
1. 具体的な数字を必ず含める
2. 前月比や目標との差を示す
3. 感情的な表現は避け、事実ベースで
4. 改善インパクトが大きい項目を優先

出力は1-2文のみ。前置きや説明は不要。`,
  },
  {
    id: 'strict',
    name: '厳格',
    description: '厳しめだが愛のあるアドバイス',
    prompt: `あなたは家計管理の「厳格な師匠」です。甘えを許さず、本質を突きます。

## あなたの役割
- 無駄遣いを厳しく指摘する
- 言い訳を許さない
- でも最後は応援する
- 端的に（1-2文、60文字以内）

## 出力ルール
1. 問題点をストレートに指摘
2. 「本当に必要？」と問いかける
3. 具体的な削減額を示す
4. 最後は「できる」と信じる一言

出力は1-2文のみ。前置きや説明は不要。`,
  },
  {
    id: 'simple',
    name: 'シンプル',
    description: '最小限の情報で端的にアドバイス',
    prompt: `あなたは家計アドバイザーです。最も重要な1点だけを伝えます。

## ルール
- 最重要の1点のみ指摘
- 20文字以内
- 数字を1つ含める

出力は1文のみ。`,
  },
]

const DEFAULT_SYSTEM_PROMPT = PROMPT_PRESETS[0].prompt

const AVAILABLE_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (推奨)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash Preview' },
]

export default function AISettingsPage() {
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  const [model, setModel] = useState('gemini-3-flash-preview')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo>({
    children: [],
    region: '',
    interests: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 現在の設定を取得
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.household_id) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('households')
        .select('ai_model, ai_system_prompt, family_info')
        .eq('id', user.household_id)
        .single()

      if (!error && data) {
        setModel(data.ai_model || 'gemini-3-flash-preview')
        setSystemPrompt(data.ai_system_prompt || DEFAULT_SYSTEM_PROMPT)
        if (data.family_info) {
          setFamilyInfo(data.family_info as FamilyInfo)
        }
      }
      setIsLoading(false)
    }

    fetchSettings()
  }, [user?.household_id])

  const handleSave = async () => {
    if (!user?.household_id) return

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('households')
        .update({
          ai_model: model,
          ai_system_prompt: systemPrompt,
          family_info: familyInfo,
        })
        .eq('id', user.household_id)

      if (error) throw error

      toast.success('AI設定を保存しました')
      queryClient.invalidateQueries({ queryKey: ['household'] })
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 子供を追加
  const handleAddChild = () => {
    setFamilyInfo((prev) => ({
      ...prev,
      children: [...(prev.children || []), { name: '', birthDate: '' }],
    }))
  }

  // 子供を削除
  const handleRemoveChild = (index: number) => {
    setFamilyInfo((prev) => ({
      ...prev,
      children: prev.children?.filter((_, i) => i !== index) || [],
    }))
  }

  // 子供の情報を更新
  const handleUpdateChild = (index: number, field: 'name' | 'birthDate', value: string) => {
    setFamilyInfo((prev) => ({
      ...prev,
      children: prev.children?.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      ) || [],
    }))
  }

  // 生年月日から年齢を計算
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
    toast.info('デフォルトのプロンプトに戻しました')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">AI設定</h1>
      </div>

      <div className="space-y-4">
        {/* 家族情報 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">家族情報（AI日記用）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 地域 */}
            <div className="space-y-2">
              <Label>住んでいる地域</Label>
              <Input
                placeholder="例: 岐阜県高山市"
                value={familyInfo.region || ''}
                onChange={(e) =>
                  setFamilyInfo((prev) => ({ ...prev, region: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                近場のお出かけスポットや季節のイベントを提案します
              </p>
            </div>

            {/* 子供 */}
            <div className="space-y-2">
              <Label>お子さん</Label>
              {familyInfo.children?.map((child, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="名前（任意）"
                    value={child.name || ''}
                    onChange={(e) => handleUpdateChild(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={child.birthDate || ''}
                    onChange={(e) => handleUpdateChild(index, 'birthDate', e.target.value)}
                    className="w-36"
                  />
                  {child.birthDate && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ({calculateAge(child.birthDate)}歳)
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveChild(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddChild}>
                <Plus className="mr-1 h-4 w-4" />
                子供を追加
              </Button>
              <p className="text-xs text-muted-foreground">
                生年月日を入力すると年齢が自動計算されます
              </p>
            </div>

            {/* 興味・関心 */}
            <div className="space-y-2">
              <Label>家族の興味・関心（カンマ区切り）</Label>
              <Input
                placeholder="例: アウトドア, 料理, 映画"
                value={familyInfo.interests?.join(', ') || ''}
                onChange={(e) =>
                  setFamilyInfo((prev) => ({
                    ...prev,
                    interests: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* モデル選択 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">モデル</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-sm text-muted-foreground">
              アドバイス生成に使用するGeminiモデルを選択
            </p>
          </CardContent>
        </Card>

        {/* プリセット選択 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">プリセット</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROMPT_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant={systemPrompt === preset.prompt ? 'default' : 'outline'}
                  className="h-auto min-h-[70px] w-full flex-col items-start justify-start gap-1 overflow-hidden p-3 text-left"
                  onClick={() => {
                    setSystemPrompt(preset.prompt)
                    toast.info(`「${preset.name}」プリセットを適用しました`)
                  }}
                >
                  <span className="w-full truncate font-medium">{preset.name}</span>
                  <span className="w-full text-xs opacity-70 line-clamp-2 break-words">
                    {preset.description}
                  </span>
                </Button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              プリセットを選択するとプロンプトが置き換わります。カスタマイズも可能です。
            </p>
          </CardContent>
        </Card>

        {/* システムプロンプト */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">システムプロンプト</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-1 h-4 w-4" />
                リセット
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              AIの役割や出力ルールを定義。支出データは自動で追加されます。
            </p>
          </CardContent>
        </Card>

        {/* 自動で渡されるデータの説明 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">自動で渡されるデータ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              以下のデータがシステムプロンプトの後に自動で追加されます。
              プロンプト作成時の参考にしてください。
            </p>
            <div className="space-y-2 rounded-md bg-muted p-3 font-mono text-xs">
              <p className="font-semibold text-foreground">## 今月の支出データ</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>総支出: ¥XX,XXX</li>
                <li>サブスク月額: ¥X,XXX</li>
              </ul>

              <p className="mt-2 font-semibold text-foreground">### カテゴリ別</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>カテゴリ名: ¥金額 (N回)</li>
                <li>※金額順でソート</li>
              </ul>

              <p className="mt-2 font-semibold text-foreground">### 夫婦別支出</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>ニックネーム: ¥金額 (N回)</li>
                <li>家族: ¥金額 (N回)</li>
                <li>※ 夫婦の支出比率も表示</li>
              </ul>

              <p className="mt-2 font-semibold text-foreground">## 回数ルールの状況</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>カテゴリ: 現在/上限回数 (残りN回)</li>
                <li>⚠️ 上限到達・あと1回の警告付き</li>
              </ul>

              <p className="mt-2 font-semibold text-foreground">## 今日のコンテキスト</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>日付と曜日</li>
                <li>曜日別メッセージ（月曜→振り返り、金曜→週末計画）</li>
                <li>月の何日目か（残り日数）</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}
