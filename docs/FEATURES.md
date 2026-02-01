# Family Finance - 機能仕様書

## 概要

家族で共有する家計管理アプリケーション。支出記録・分析・AI活用を中心に、LINE通知連携やプリセット登録など実用的な機能を備える。

**技術スタック:** Next.js 16 / React 19 / Supabase (PostgreSQL) / TanStack React Query / Tailwind CSS 4 / Recharts / Google Gemini API

**ホスティング:** Vercel + Supabase Cloud

---

## 目次

1. [認証・初期設定](#1-認証初期設定)
2. [ダッシュボード](#2-ダッシュボード)
3. [支出管理](#3-支出管理)
4. [プリセット機能](#4-プリセット機能)
5. [分析機能](#5-分析機能)
6. [AI機能](#6-ai機能)
7. [LINE通知](#7-line通知)
8. [設定](#8-設定)
9. [データベース構造](#9-データベース構造)
10. [APIルート](#10-apiルート)
11. [セキュリティ](#11-セキュリティ)

---

## 1. 認証・初期設定

### ログイン (`/login`)
- Google OAuth によるシングルサインオン
- Supabase Auth でセッション管理（Cookie ベース）

### 初期設定 (`/setup`)
- **新規家計作成**: ニックネーム・家計名を入力 → `create_household_and_setup` RPC でデフォルトカテゴリ10種を自動生成
- **既存家計に参加**: 招待コード入力 → 家計に紐づけ

### ルート保護
- Middleware で認証チェック（`/`, `/expenses`, `/analytics`, `/settings` 等）
- 未認証 → `/login` へリダイレクト
- 認証済みで家計未所属 → `/setup` へリダイレクト

---

## 2. ダッシュボード (`/`)

家計管理のホーム画面。以下のコンポーネントを上から順に表示。

| コンポーネント | 内容 |
|---------------|------|
| **日次アドバイス** | AI生成の今日のアドバイス（60文字以内） |
| **月間サマリー** | 締め日ベースの期間と総支出額 |
| **回数制限** | ルール設定済みカテゴリの残回数（プログレスバー付き） |
| **支出トラッカー** | 追跡中カテゴリの累計金額＋前期間比（↑赤/↓緑） |
| **カテゴリ別円グラフ** | ドーナツ型グラフ（¥/% 切替可能） |
| **家族別比較** | ユーザー・家族メンバー別支出（円グラフ、クリックで詳細） |
| **直近の支出** | 最新5件の支出一覧（「もっと見る」→ `/expenses`） |

**データ取得:** `useDashboardSummary` フックで一括取得。`get_current_period` RPC で締め日ベースの期間を算出。

---

## 3. 支出管理

### 支出入力 (`/expenses/new`)
- **日付**: カレンダーで選択
- **金額**: 数値入力（高額支出は閾値に応じて警告表示）
- **カテゴリ**: 5列グリッドのアイコンボタンで選択
- **家族メンバー**: 「誰のため？」をボタン選択（任意）
- **メモ**: テキスト入力（任意）
- **プリセットボタン**: プリセットから一括登録（後述）
- 登録成功後 → ダッシュボードへ遷移、LINE通知送信

### 支出履歴 (`/expenses`)
- 月単位で表示（前月/翌月ナビゲーション）
- 締め日ベースの期間表示（例: 1/15〜2/14）
- 日付ごとにグループ化
- 各支出に**編集・削除**ボタン（世帯メンバー全員が操作可能）
- 月合計金額・件数を表示

### 支出編集ダイアログ
- カテゴリ・金額・日付・メモ・家族メンバーを変更可能

---

## 4. プリセット機能

### プリセット管理 (`/settings/presets`)
- **プリセット**: 名前付きテンプレート（例: 「毎月の固定費」）
- **項目**: プリセット内に複数の支出項目を登録
  - カテゴリ・金額・メモ・家族メンバー（任意）
- 展開/折りたたみ UI で項目を管理
- プリセット・項目それぞれの追加・編集・削除が可能

### 一括登録（入力画面から）
1. `/expenses/new` で「プリセット」ボタンをタップ
2. ボトムシートでプリセットを選択（項目0件は選択不可）
3. 確認画面: 日付選択＋各項目の金額を編集可能
4. 「一括登録」で全項目を `expenses` テーブルに一括INSERT
5. LINE通知（最初の1件分）を送信
6. ダッシュボードへ遷移

**DB構造:**
```
expense_presets (親)
  └─ expense_preset_items (子) × N件
       ├─ category_id → categories
       ├─ family_member_id → family_members (任意)
       ├─ amount
       └─ memo
```

---

## 5. 分析機能 (`/analytics`)

タブ切り替えで3つの時間軸を提供。

### 週別分析
| 要素 | 内容 |
|------|------|
| ナビゲーション | 前週/次週ボタン、合計金額 |
| AI振り返り | 先週の支出をAIが分析（100〜200文字） |
| 先週比較 | 今週 vs 先週の増減（金額・%） |
| 日別棒グラフ | 月〜日の支出額（**クリックでその日の支出詳細シート**） |
| 支出トラッカー | 追跡カテゴリの週間集計 |
| カテゴリ別・家族別 | 円グラフ（クリックで詳細） |

### 月別分析
| 要素 | 内容 |
|------|------|
| ナビゲーション | 前月/次月ボタン、締め日ベース期間表示 |
| AI振り返り | 先月の支出をAIが分析 |
| 先月比較 | 今月 vs 先月の増減 |
| 週別棒グラフ | 月内の週別推移（**クリックでその週の詳細シート**） |
| カテゴリ別横棒グラフ | 上位6カテゴリ（**クリックで詳細シート**） |
| カテゴリ詳細リスト | 全カテゴリの金額一覧（**クリックで詳細シート**） |
| 支出トラッカー | 追跡カテゴリの月間集計 |

### 年別分析
| 要素 | 内容 |
|------|------|
| ナビゲーション | 前年/次年ボタン |
| 年間サマリー | 年間合計・月平均 |
| 月別折れ線グラフ | 12ヶ月の推移 |
| 月別内訳表 | 各月の金額一覧 |

### 支出詳細シート（共通）
- ボトムシート形式（70vh）
- ヘッダーに件数・合計金額
- カード形式で各支出を一覧表示

---

## 6. AI機能

Google Gemini API を使用した3つのAI機能。

### 日次アドバイス
- **表示場所**: ダッシュボード上部
- **生成タイミング**: ページアクセス時に自動生成（1日1回）
- **内容**: 60文字以内の家計アドバイス
- **入力データ**: カテゴリ別支出、家族別支出、回数ルール状況、曜日コンテキスト
- **カスタマイズ**: 5種類のプリセットプロンプト or 自由記述

### AI日記 (`/diary`)
- **今日の日記**: 300〜500文字、曜日別テーマ（月〜日で異なる）
- **過去の日記**: 最新30件を一覧表示、クリックで全文表示
- **入力データ**: 家族情報（子供の名前・年齢、地域、興味）、季節情報
- **特徴**: 支出分析ではなく「家族の暮らし」に焦点を当てた内容

### 期間分析（週別・月別）
- **表示場所**: 週別/月別分析画面の上部
- **内容**: 100〜200文字の支出振り返り
- **入力データ**: カテゴリ別・ユーザー別集計、前期間比の増減率

### AI設定 (`/settings/ai`)
- **家族情報**: 地域、子供（名前・生年月日→年齢自動計算）、興味・関心
- **モデル選択**: gemini-3-flash-preview（推奨）/ gemini-2.0-flash / gemini-2.5-flash-preview
- **プリセットプロンプト**: コーチ / 応援団 / 分析家 / 厳格 / シンプル
- **カスタムプロンプト**: テキストエリアで自由編集、リセット機能

---

## 7. LINE通知

### 概要
支出登録時にLINEグループへリアルタイム通知。

### 通知フォーマット
```
【支出登録】
👤 ユーザー名（家族メンバー名のため）
📁 カテゴリ名
💰 ¥金額
📝 メモ
📊 カテゴリ 残りN回（⚠️ 残り1回以下）
🔔 高額支出です！（閾値以上の場合）
```

### 設定 (`/settings/line`)
- LINE Notify アクセストークンの入力・保存
- テスト通知送信機能
- 設定手順ガイドを表示

---

## 8. 設定

### 設定メニュー (`/settings`)

| 設定項目 | パス | 内容 |
|---------|------|------|
| カテゴリ管理 | `/settings/categories` | カテゴリの追加・編集・削除、絵文字アイコン選択 |
| ルール設定 | `/settings/rules` | カテゴリ別の月間利用回数上限 |
| プリセット管理 | `/settings/presets` | 定型支出テンプレートの管理 |
| 支出トラッカー | `/settings/trackers` | カテゴリ別追跡のON/OFF（スイッチ） |
| 家計設定 | `/settings/household` | 基本設定・メンバー管理・招待機能 |
| LINE連携 | `/settings/line` | LINE Notifyトークン設定 |
| AI設定 | `/settings/ai` | 家族情報・モデル・プロンプト設定 |

### 家計設定の詳細 (`/settings/household`)
- **基本設定**: 家計名、高額支出閾値（デフォルト¥5,000）、締め日（1〜28日）、休日スキップ
- **メンバー管理**: ユーザー一覧（ロール表示）、オーナーのみメンバー削除可
- **家族メンバー**: 支出の対象者（子供等）の追加・編集・削除
- **招待機能**: 招待コード生成・コピー（有効期限7日）

---

## 9. データベース構造

### テーブル一覧

| テーブル | 用途 | 主要フィールド |
|---------|------|---------------|
| `households` | 家計単位 | name, reset_day, high_amount_threshold, line_notify_token, ai_model, ai_system_prompt, family_info |
| `users` | ユーザー | email, name, nickname, household_id, role (owner/member) |
| `family_members` | 支出対象者 | household_id, name, sort_order, is_active |
| `invitations` | 招待 | household_id, token, expires_at, used_at, created_by |
| `categories` | カテゴリ | household_id, name, icon, sort_order, is_active |
| `rules` | 回数制限 | household_id, category_id, monthly_limit, is_active |
| `expenses` | 支出記録 | household_id, user_id, category_id, family_member_id, amount, date, memo |
| `expense_presets` | プリセット | household_id, name, sort_order, is_active |
| `expense_preset_items` | プリセット項目 | preset_id, category_id, family_member_id, amount, memo |
| `expense_trackers` | 追跡設定 | household_id, category_id (UNIQUE) |
| `daily_advice` | 日次アドバイス | household_id, date, advice, prompt |
| `ai_diaries` | AI日記 | household_id, date, content, theme, prompt |
| `period_analyses` | 期間分析 | household_id, period_type (week/month), period_start, period_end, analysis, prompt |

### ビュー

| ビュー | 用途 |
|--------|------|
| `monthly_expense_summary` | カテゴリ別の月間支出集計 |
| `monthly_user_expense_summary` | ユーザー別の月間支出集計 |

### ストアドファンクション

| 関数 | 用途 |
|------|------|
| `get_current_period(household_id)` | 締め日ベースの現在期間を取得 |
| `get_period_for_date(household_id, date)` | 指定日が属する期間を取得 |
| `get_remaining_counts(household_id)` | カテゴリ別の残り回数を計算 |
| `create_household_and_setup(name, nickname)` | 家計作成＋デフォルトカテゴリ生成 |
| `create_default_categories(household_id)` | 10カテゴリを一括作成 |
| `remove_household_member(member_id)` | オーナーがメンバーを削除 |

### デフォルトカテゴリ
食費🍚, 外食🍽️, 日用品🧴, 交通費🚃, 娯楽🎮, サブスク💳, 衣服👕, 医療🏥, 遠出🚗, その他📦

---

## 10. APIルート

| エンドポイント | メソッド | 用途 |
|---------------|---------|------|
| `/api/auth/callback` | GET | OAuth認証コールバック（プロフィール自動作成、リダイレクト制御） |
| `/api/line/notify` | POST | LINE通知送信（支出ID → 詳細メッセージ構築 → LINE Notify API） |
| `/api/advice/generate` | POST | 日次アドバイス生成（支出データ＋ルール状況 → Gemini → DB保存） |
| `/api/diary/generate` | POST | AI日記生成（家族情報＋曜日テーマ → Gemini → DB保存） |
| `/api/analytics/generate` | POST | 期間分析生成（週/月の集計＋前期間比 → Gemini → DB保存） |

---

## 11. セキュリティ

### Row Level Security (RLS)
- 全テーブルで有効
- `household_id` ベースのアクセス制御（同じ家計のデータのみアクセス可能）
- expenses の UPDATE/DELETE は世帯メンバー全員に開放

### ロールベースアクセス
- `owner`: 家計所有者（メンバー管理権限）
- `member`: 一般メンバー（支出登録・閲覧）

### SECURITY DEFINER関数
- `create_household_and_setup`: 家計作成時のトランザクション保証
- `remove_household_member`: オーナー権限チェック付きメンバー削除

### Middleware
- Cookie ベースのセッション管理
- 保護ルートへの未認証アクセスをリダイレクト
- 静的アセットは除外

---

## アーキテクチャ図

```
┌─────────────────────────────────────┐
│         ブラウザ（iPhone Safari）     │
│    React / TanStack Query / Recharts │
└──────────────┬──────────────────────┘
               │ HTTPS
┌──────────────┴──────────────────────┐
│          Vercel (Next.js 16)         │
│  ┌─────────────┐  ┌───────────────┐ │
│  │ Client      │  │ API Routes    │ │
│  │ Components  │  │ /api/*        │ │
│  └──────┬──────┘  └───────┬───────┘ │
│         │     Middleware   │         │
└─────────┼─────────────────┼─────────┘
          │                 │
    ┌─────┴─────┐    ┌─────┴─────┐
    │ Supabase  │    │  外部API   │
    │ PostgreSQL│    ├───────────┤
    │ Auth      │    │ Gemini AI │
    │ RLS       │    │ LINE      │
    └───────────┘    └───────────┘
```
