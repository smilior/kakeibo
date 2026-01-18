# 夫婦向け浪費管理アプリ 詳細設計書

**バージョン:** 1.0
**作成日:** 2026年1月18日
**技術スタック:** Next.js / Vercel / Supabase / shadcn/ui

---

## 目次

1. [システム概要](#1-システム概要)
2. [アーキテクチャ設計](#2-アーキテクチャ設計)
3. [認証・ユーザー管理設計](#3-認証ユーザー管理設計)
4. [データベース設計](#4-データベース設計)
5. [API設計](#5-api設計)
6. [画面設計](#6-画面設計)
7. [コンポーネント設計](#7-コンポーネント設計)
8. [状態管理設計](#8-状態管理設計)
9. [外部連携設計](#9-外部連携設計)
10. [セキュリティ設計](#10-セキュリティ設計)
11. [開発環境・デプロイ設計](#11-開発環境デプロイ設計)
12. [ディレクトリ構成](#12-ディレクトリ構成)

---

## 1. システム概要

### 1.1 システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         クライアント                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js (App Router) + PWA                  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ shadcn  │ │Recharts │ │ Tanstack│ │  Zustand │       │   │
│  │  │   /ui   │ │         │ │  Query  │ │          │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Vercel                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Edge Runtime                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   API Routes │  │  Middleware  │  │   SSR/RSC   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  PostgreSQL  │  │    Auth     │  │   Storage   │             │
│  │     + RLS    │  │   (OAuth)   │  │  (optional) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │    Realtime  │  │Edge Functions│                              │
│  │  (optional)  │  │ (LINE通知)   │                              │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      外部サービス                                 │
│  ┌─────────────┐                                                │
│  │ LINE Notify  │                                                │
│  │     API      │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 技術スタック詳細

| カテゴリ | 技術 | バージョン | 選定理由 |
|---------|------|-----------|---------|
| **フレームワーク** | Next.js | 16.x | App Router、RSC対応、Vercel最適化 |
| **言語** | TypeScript | 5.x | 型安全性、開発効率向上 |
| **UIライブラリ** | shadcn/ui | latest | カスタマイズ性、アクセシビリティ |
| **スタイリング** | Tailwind CSS | 4.x | ユーティリティファースト、shadcn/ui前提 |
| **状態管理** | Zustand | 5.x | 軽量、シンプル、TypeScript親和性 |
| **データフェッチ** | TanStack Query | 5.x | キャッシュ、楽観的更新、リアルタイム |
| **フォーム** | React Hook Form + Zod | latest | バリデーション、パフォーマンス |
| **グラフ** | Recharts | 3.x | React特化、カスタマイズ性 |
| **日付操作** | date-fns | 4.x | 軽量、Tree-shaking対応 |
| **BaaS** | Supabase | latest | 認証・DB一元管理、無料枠十分 |
| **ホスティング** | Vercel | - | Next.js最適化、自動デプロイ |
| **PWA** | Serwist | latest | ホーム画面追加、オフライン対応 |

### 1.3 カラーパレット（Claudeテーマ・暖色系）

```css
/* プライマリカラー（Claudeオレンジ系） */
--primary-50: #FFF7ED;
--primary-100: #FFEDD5;
--primary-200: #FED7AA;
--primary-300: #FDBA74;
--primary-400: #FB923C;
--primary-500: #F97316;  /* メインカラー */
--primary-600: #EA580C;
--primary-700: #C2410C;

/* セカンダリカラー（暖かいベージュ系） */
--secondary-50: #FAFAF9;
--secondary-100: #F5F5F4;
--secondary-200: #E7E5E4;
--secondary-300: #D6D3D1;

/* アクセントカラー */
--accent-success: #22C55E;  /* 緑：予算内 */
--accent-warning: #EAB308;  /* 黄：注意 */
--accent-danger: #EF4444;   /* 赤：超過 */

/* 背景 */
--background: #FFFBF7;      /* 暖かいオフホワイト */
--foreground: #1C1917;      /* ダークブラウン */
```

---

## 2. アーキテクチャ設計

### 2.1 Next.js App Router構成

```
app/
├── (auth)/                    # 認証グループ（レイアウト共有）
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   └── invite/
│       └── [token]/
│           └── page.tsx
├── (dashboard)/               # 認証後グループ
│   ├── layout.tsx            # サイドバー・ヘッダー共通レイアウト
│   ├── page.tsx              # ダッシュボード（デフォルト）
│   ├── expenses/
│   │   ├── page.tsx          # 支出一覧
│   │   └── new/
│   │       └── page.tsx      # 支出入力
│   ├── analytics/
│   │   └── page.tsx          # グラフ・分析
│   ├── subscriptions/
│   │   └── page.tsx          # サブスク管理
│   └── settings/
│       ├── page.tsx          # 設定トップ
│       ├── categories/
│       │   └── page.tsx      # カテゴリ管理
│       ├── rules/
│       │   └── page.tsx      # ルール設定
│       ├── household/
│       │   └── page.tsx      # 家計設定・招待
│       └── line/
│           └── page.tsx      # LINE連携
├── api/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts      # OAuth callback
│   └── line/
│       └── notify/
│           └── route.ts      # LINE通知送信
├── layout.tsx                 # ルートレイアウト
├── manifest.ts                # PWAマニフェスト
└── globals.css
```

### 2.2 データフロー

```
┌──────────────────────────────────────────────────────────────┐
│                      Client Component                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                     UI Layer                         │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │    │
│  │  │  Form   │  │  List   │  │  Chart  │            │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘            │    │
│  └───────┼────────────┼────────────┼─────────────────┘    │
│          │            │            │                        │
│          ▼            ▼            ▼                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              TanStack Query Layer                    │    │
│  │  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │  useMutation │  │   useQuery  │                  │    │
│  │  │  (create/   │  │   (read)    │                  │    │
│  │  │   update/   │  │             │                  │    │
│  │  │   delete)   │  │             │                  │    │
│  │  └──────┬──────┘  └──────┬──────┘                  │    │
│  └─────────┼────────────────┼────────────────────────┘    │
│            │                │                              │
│            │  Optimistic    │  Cache                       │
│            │  Update        │  Invalidation                │
│            ▼                ▼                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Supabase Client                         │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │            @supabase/ssr                     │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (RLS適用)
                              ▼
                    ┌─────────────────┐
                    │    Supabase     │
                    │   PostgreSQL    │
                    └─────────────────┘
```

---

## 3. 認証・ユーザー管理設計

### 3.1 認証フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                      新規登録フロー                               │
└─────────────────────────────────────────────────────────────────┘

[未認証ユーザー]
       │
       │ 1. アクセス
       ▼
┌──────────────┐
│  ログイン画面  │
└──────┬───────┘
       │ 2. Googleでログイン
       ▼
┌──────────────┐    ┌──────────────┐
│ Supabase Auth │───▶│ Google OAuth │
└──────┬───────┘    └──────────────┘
       │ 3. コールバック
       ▼
┌──────────────┐
│ /api/auth/   │
│   callback   │
└──────┬───────┘
       │ 4. usersテーブル確認
       ▼
  ┌────┴────┐
  │ 既存？   │
  └────┬────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
[既存]   [新規]
   │       │
   │       │ 5. household未所属
   │       ▼
   │  ┌──────────────┐
   │  │ 家計作成 or   │
   │  │ 招待リンク入力 │
   │  └──────┬───────┘
   │         │
   │    ┌────┴────┐
   │    │         │
   │    ▼         ▼
   │  [作成]    [参加]
   │    │         │
   │    │ 6a.     │ 6b.
   │    ▼         ▼
   │  ┌─────┐  ┌─────────┐
   │  │新規 │  │招待トークン│
   │  │家計 │  │  検証     │
   │  │作成 │  └────┬────┘
   │  └──┬──┘       │
   │     │          │
   │     │ 7.       │
   │     ▼          ▼
   │  ┌─────────────────┐
   │  │ household_idを  │
   │  │  usersに設定    │
   │  └────────┬────────┘
   │           │
   └───────────┘
               │ 8. リダイレクト
               ▼
        ┌──────────────┐
        │ ダッシュボード │
        └──────────────┘
```

### 3.2 招待フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                       招待フロー                                  │
└─────────────────────────────────────────────────────────────────┘

[家計作成者]                              [招待される人]
     │                                         │
     │ 1. 招待リンク生成                        │
     ▼                                         │
┌──────────────┐                              │
│設定 > 家計設定│                              │
│ > 招待リンク  │                              │
│   生成ボタン  │                              │
└──────┬───────┘                              │
       │                                        │
       │ 2. invitationsテーブルに               │
       │    レコード作成                        │
       ▼                                        │
┌──────────────┐                              │
│ token生成    │                               │
│ (UUID v4)    │                               │
│ 有効期限:7日 │                               │
└──────┬───────┘                              │
       │                                        │
       │ 3. リンクをコピー                      │
       │    （LINE/メールで送信）               │
       ▼                                        │
┌──────────────┐                              │
│https://app/  │    4. リンク共有              │
│invite/[token]│─────────────────────────────▶│
└──────────────┘                              │
                                               │ 5. リンクをクリック
                                               ▼
                                        ┌──────────────┐
                                        │ /invite/[token]│
                                        │    ページ     │
                                        └──────┬───────┘
                                               │
                                               │ 6. トークン検証
                                               ▼
                                        ┌──────────────┐
                                        │・有効期限確認 │
                                        │・使用済み確認 │
                                        │・家計情報表示 │
                                        └──────┬───────┘
                                               │
                                               │ 7. Googleでログイン
                                               ▼
                                        ┌──────────────┐
                                        │ユーザー作成/更新│
                                        │household_id設定│
                                        │invitation無効化│
                                        └──────┬───────┘
                                               │
                                               │ 8. ダッシュボードへ
                                               ▼
                                        ┌──────────────┐
                                        │ ダッシュボード │
                                        └──────────────┘
```

### 3.3 認証ミドルウェア

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 未認証ユーザーの保護ルートアクセスをブロック
  if (!user && !request.nextUrl.pathname.startsWith('/login')
           && !request.nextUrl.pathname.startsWith('/invite')
           && !request.nextUrl.pathname.startsWith('/api/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 認証済みユーザーのログインページアクセスをリダイレクト
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 4. データベース設計

### 4.1 ER図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ER Diagram                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────────┐
                              │    households     │
                              ├───────────────────┤
                              │ id (PK)           │
                              │ name              │
                              │ line_notify_token │
                              │ high_amount_threshold │
                              │ reset_day         │
                              │ created_at        │
                              │ updated_at        │
                              └─────────┬─────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
            │ 1:N                       │ 1:N                       │ 1:N
            ▼                           ▼                           ▼
┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│      users        │       │    categories     │       │   invitations     │
├───────────────────┤       ├───────────────────┤       ├───────────────────┤
│ id (PK)           │       │ id (PK)           │       │ id (PK)           │
│ email             │       │ household_id (FK) │       │ household_id (FK) │
│ name              │       │ name              │       │ token             │
│ nickname          │       │ icon              │       │ expires_at        │
│ avatar_url        │       │ sort_order        │       │ used_at           │
│ household_id (FK) │       │ is_active         │       │ created_by (FK)   │
│ role              │       │ created_at        │       │ created_at        │
│ created_at        │       │ updated_at        │       └───────────────────┘
│ updated_at        │       └─────────┬─────────┘
└─────────┬─────────┘
          │                           │
          │                           │ 1:N
          │                           ▼
          │                 ┌───────────────────┐
          │                 │      rules        │
          │                 ├───────────────────┤
          │                 │ id (PK)           │
          │                 │ household_id (FK) │
          │                 │ category_id (FK)  │
          │                 │ monthly_limit     │
          │                 │ is_active         │
          │                 │ created_at        │
          │                 │ updated_at        │
          │                 └───────────────────┘
          │
          │ 1:N
          ▼
┌───────────────────┐       ┌───────────────────┐
│     expenses      │       │   subscriptions   │
├───────────────────┤       ├───────────────────┤
│ id (PK)           │       │ id (PK)           │
│ household_id (FK) │       │ household_id (FK) │
│ user_id (FK)      │       │ category_id (FK)  │
│ category_id (FK)  │       │ name              │
│ amount            │       │ monthly_amount    │
│ date              │       │ contract_date     │
│ memo              │       │ renewal_date      │
│ created_at        │       │ memo              │
│ updated_at        │       │ is_active         │
└───────────────────┘       │ created_at        │
                            │ updated_at        │
                            └───────────────────┘
```

### 4.2 テーブル定義

```sql
-- =====================================================
-- households（家計）
-- =====================================================
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL DEFAULT '我が家の家計',
  line_notify_token TEXT,  -- 暗号化して保存
  high_amount_threshold INTEGER NOT NULL DEFAULT 5000,  -- 高額支出の閾値（円）
  reset_day INTEGER NOT NULL DEFAULT 1 CHECK (reset_day >= 1 AND reset_day <= 28),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE households IS '家計（夫婦で共有する単位）';
COMMENT ON COLUMN households.reset_day IS '月次リセット日（1-28日）';
COMMENT ON COLUMN households.high_amount_threshold IS '高額支出とみなす閾値（円）';

-- =====================================================
-- users（ユーザー）
-- =====================================================
CREATE TYPE user_role AS ENUM ('owner', 'member');

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  nickname VARCHAR(50),  -- 表示用ニックネーム（任意）
  avatar_url TEXT,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'member',  -- ロール（owner: 所有者, member: メンバー）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'ユーザー';
COMMENT ON COLUMN users.nickname IS '表示用ニックネーム（例：夫、妻）';
COMMENT ON COLUMN users.role IS 'ユーザーのロール（owner: 所有者, member: メンバー）';

-- =====================================================
-- invitations（招待）
-- =====================================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,  -- 使用済みの場合は使用日時
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invitations IS '招待リンク';
CREATE INDEX idx_invitations_token ON invitations(token);

-- =====================================================
-- categories（カテゴリ）
-- =====================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50) DEFAULT '📁',  -- 絵文字アイコン
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, name)
);

COMMENT ON TABLE categories IS 'カテゴリ';
CREATE INDEX idx_categories_household ON categories(household_id);

-- =====================================================
-- rules（回数ルール）
-- =====================================================
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  monthly_limit INTEGER NOT NULL CHECK (monthly_limit > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, category_id)
);

COMMENT ON TABLE rules IS '回数ルール';
COMMENT ON COLUMN rules.monthly_limit IS '月間上限回数';

-- =====================================================
-- expenses（支出）
-- =====================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE expenses IS '支出';
CREATE INDEX idx_expenses_household_date ON expenses(household_id, date DESC);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- =====================================================
-- subscriptions（サブスク）
-- =====================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  monthly_amount INTEGER NOT NULL CHECK (monthly_amount > 0),
  contract_date DATE NOT NULL,
  renewal_date DATE,
  memo TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscriptions IS 'サブスクリプション';
COMMENT ON COLUMN subscriptions.category_id IS 'カテゴリ（サブスク等を管理）';
CREATE INDEX idx_subscriptions_household ON subscriptions(household_id);

-- =====================================================
-- updated_at自動更新トリガー
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.3 初期データ（シード）

```sql
-- カテゴリ初期データ（新規家計作成時に挿入）
INSERT INTO categories (household_id, name, icon, sort_order) VALUES
  (:household_id, '食費', '🍚', 1),
  (:household_id, '外食', '🍽️', 2),
  (:household_id, '日用品', '🧴', 3),
  (:household_id, '交通費', '🚃', 4),
  (:household_id, '娯楽', '🎮', 5),
  (:household_id, 'サブスク', '💳', 6),
  (:household_id, '衣服', '👕', 7),
  (:household_id, '医療', '🏥', 8),
  (:household_id, '遠出', '🚗', 9),
  (:household_id, 'その他', '📦', 10);
```

### 4.4 Row Level Security (RLS)

```sql
-- =====================================================
-- RLSポリシー
-- =====================================================

-- RLS有効化
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- households
-- -----------------------------------------------------
CREATE POLICY "Users can view own household"
  ON households FOR SELECT
  USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own household"
  ON households FOR UPDATE
  USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated users can create household"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------
-- users
-- -----------------------------------------------------
CREATE POLICY "Users can view household members"
  ON users FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------
-- invitations
-- -----------------------------------------------------
CREATE POLICY "Users can view own household invitations"
  ON invitations FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    OR used_at IS NULL  -- 未使用の招待は誰でも見れる（トークン検証用）
  );

CREATE POLICY "Users can create invitation for own household"
  ON invitations FOR INSERT
  WITH CHECK (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update invitations"
  ON invitations FOR UPDATE
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    OR used_at IS NULL  -- 招待受諾時の更新用
  );

-- -----------------------------------------------------
-- categories
-- -----------------------------------------------------
CREATE POLICY "Users can view own household categories"
  ON categories FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage own household categories"
  ON categories FOR ALL
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- -----------------------------------------------------
-- rules
-- -----------------------------------------------------
CREATE POLICY "Users can view own household rules"
  ON rules FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage own household rules"
  ON rules FOR ALL
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- -----------------------------------------------------
-- expenses
-- -----------------------------------------------------
CREATE POLICY "Users can view own household expenses"
  ON expenses FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create expenses for own household"
  ON expenses FOR INSERT
  WITH CHECK (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (user_id = auth.uid());

-- -----------------------------------------------------
-- subscriptions
-- -----------------------------------------------------
CREATE POLICY "Users can view own household subscriptions"
  ON subscriptions FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage own household subscriptions"
  ON subscriptions FOR ALL
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  );
```

### 4.5 ビュー・関数

```sql
-- =====================================================
-- 月間集計ビュー
-- =====================================================
CREATE OR REPLACE VIEW monthly_expense_summary AS
SELECT
  e.household_id,
  e.category_id,
  c.name AS category_name,
  DATE_TRUNC('month', e.date) AS month,
  COUNT(*) AS count,
  SUM(e.amount) AS total_amount
FROM expenses e
JOIN categories c ON e.category_id = c.id
GROUP BY e.household_id, e.category_id, c.name, DATE_TRUNC('month', e.date);

-- =====================================================
-- ユーザー別月間集計ビュー
-- =====================================================
CREATE OR REPLACE VIEW monthly_user_expense_summary AS
SELECT
  e.household_id,
  e.user_id,
  u.name AS user_name,
  u.nickname AS user_nickname,
  DATE_TRUNC('month', e.date) AS month,
  COUNT(*) AS count,
  SUM(e.amount) AS total_amount
FROM expenses e
JOIN users u ON e.user_id = u.id
GROUP BY e.household_id, e.user_id, u.name, u.nickname, DATE_TRUNC('month', e.date);

-- =====================================================
-- 月間期間計算関数
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_period(household_id UUID)
RETURNS TABLE (start_date DATE, end_date DATE) AS $$
DECLARE
  reset_day INTEGER;
  today DATE := CURRENT_DATE;
  period_start DATE;
  period_end DATE;
BEGIN
  -- 家計のリセット日を取得
  SELECT h.reset_day INTO reset_day
  FROM households h
  WHERE h.id = household_id;

  IF reset_day IS NULL THEN
    reset_day := 1;
  END IF;

  -- 期間計算
  IF EXTRACT(DAY FROM today) >= reset_day THEN
    period_start := DATE_TRUNC('month', today) + (reset_day - 1) * INTERVAL '1 day';
    period_end := (DATE_TRUNC('month', today) + INTERVAL '1 month' + (reset_day - 2) * INTERVAL '1 day')::DATE;
  ELSE
    period_start := (DATE_TRUNC('month', today) - INTERVAL '1 month' + (reset_day - 1) * INTERVAL '1 day')::DATE;
    period_end := (DATE_TRUNC('month', today) + (reset_day - 2) * INTERVAL '1 day')::DATE;
  END IF;

  RETURN QUERY SELECT period_start, period_end;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 残り回数計算関数
-- =====================================================
CREATE OR REPLACE FUNCTION get_remaining_counts(p_household_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_name VARCHAR,
  monthly_limit INTEGER,
  current_count BIGINT,
  remaining_count BIGINT
) AS $$
DECLARE
  period_start DATE;
  period_end DATE;
BEGIN
  -- 現在の期間を取得
  SELECT gcp.start_date, gcp.end_date
  INTO period_start, period_end
  FROM get_current_period(p_household_id) gcp;

  RETURN QUERY
  SELECT
    r.category_id,
    c.name AS category_name,
    r.monthly_limit,
    COALESCE(COUNT(e.id), 0) AS current_count,
    GREATEST(r.monthly_limit - COALESCE(COUNT(e.id), 0), 0) AS remaining_count
  FROM rules r
  JOIN categories c ON r.category_id = c.id
  LEFT JOIN expenses e ON e.category_id = r.category_id
    AND e.household_id = p_household_id
    AND e.date BETWEEN period_start AND period_end
  WHERE r.household_id = p_household_id
    AND r.is_active = TRUE
  GROUP BY r.category_id, c.name, r.monthly_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. API設計

### 5.1 API Routes一覧

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/auth/callback` | OAuth2コールバック |
| POST | `/api/line/notify` | LINE通知送信 |

### 5.2 Supabase クライアント操作

TanStack Queryを使用してSupabaseクライアントを直接操作します。

```typescript
// lib/queries/expenses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// 支出一覧取得
export function useExpenses(householdId: string, month: Date) {
  return useQuery({
    queryKey: ['expenses', householdId, month.toISOString()],
    queryFn: async () => {
      const supabase = createClient()
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          category:categories(id, name, icon),
          user:users(id, name, nickname, avatar_url)
        `)
        .eq('household_id', householdId)
        .gte('date', startOfMonth.toISOString())
        .lte('date', endOfMonth.toISOString())
        .order('date', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

// 支出作成
export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expense: CreateExpenseInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single()

      if (error) throw error

      // LINE通知送信
      await fetch('/api/line/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseId: data.id }),
      })

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

### 5.3 LINE通知API

```typescript
// app/api/line/notify/route.ts
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
        category:categories(name),
        user:users(name, nickname),
        household:households(line_notify_token, high_amount_threshold)
      `)
      .eq('id', expenseId)
      .single()

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const token = expense.household?.line_notify_token
    if (!token) {
      return NextResponse.json({ message: 'LINE not configured' }, { status: 200 })
    }

    // 残り回数を取得
    const { data: remaining } = await supabase
      .rpc('get_remaining_counts', { p_household_id: expense.household_id })

    const categoryRemaining = remaining?.find(
      (r: any) => r.category_id === expense.category_id
    )

    // 通知メッセージ作成
    const userName = expense.user?.nickname || expense.user?.name
    const threshold = expense.household?.high_amount_threshold || 5000
    const isHighAmount = expense.amount >= threshold

    let message = `【支出登録】\n`
    message += `👤 ${userName}\n`
    message += `📁 ${expense.category?.name}\n`
    message += `💰 ¥${expense.amount.toLocaleString()}\n`
    if (expense.memo) {
      message += `📝 ${expense.memo}\n`
    }
    if (categoryRemaining) {
      const remaining = categoryRemaining.remaining_count
      if (remaining <= 1) {
        message += `⚠️ ${expense.category?.name} 残り${remaining}回\n`
      } else {
        message += `📊 ${expense.category?.name} 残り${remaining}回\n`
      }
    }
    if (isHighAmount) {
      message += `🔔 高額支出です！`
    }

    // LINE Notify送信
    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ message }),
    })

    if (!response.ok) {
      throw new Error('LINE Notify failed')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('LINE notify error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## 6. 画面設計

### 6.1 画面一覧

| # | 画面 | パス | 説明 |
|---|------|------|------|
| S01 | ログイン | `/login` | Googleログインボタン |
| S02 | 招待受諾 | `/invite/[token]` | 招待リンクからの参加 |
| S03 | 家計作成 | `/setup` | 新規家計作成 |
| S04 | ダッシュボード | `/` | メイン画面 |
| S05 | 支出入力 | `/expenses/new` | 支出登録フォーム |
| S06 | 支出履歴 | `/expenses` | 月別支出一覧 |
| S07 | 分析 | `/analytics` | グラフ・統計 |
| S08 | サブスク管理 | `/subscriptions` | サブスク一覧・登録 |
| S09 | 設定 | `/settings` | 設定メニュー |
| S10 | カテゴリ管理 | `/settings/categories` | カテゴリCRUD |
| S11 | ルール設定 | `/settings/rules` | 回数ルール設定 |
| S12 | 家計設定 | `/settings/household` | 家計情報・招待・高額閾値設定 |
| S13 | LINE連携 | `/settings/line` | LINE Notify設定 |

### 6.2 画面遷移図

```
                                    ┌─────────────┐
                                    │   Login     │
                                    │   (S01)     │
                                    └──────┬──────┘
                                           │
                           ┌───────────────┼───────────────┐
                           │               │               │
                           ▼               ▼               ▼
                    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                    │   Setup     │ │   Invite    │ │  Dashboard  │
                    │   (S03)     │ │   (S02)     │ │   (S04)     │
                    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
                           │               │               │
                           └───────────────┴───────┬───────┘
                                                   │
     ┌───────────────┬───────────────┬─────────────┼─────────────┐
     │               │               │             │             │
     ▼               ▼               ▼             ▼             ▼
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│Expenses │   │Expenses │   │Analytics│   │ Subscr  │   │Settings │
│   New   │   │  List   │   │  (S07)  │   │ (S08)   │   │  (S09)  │
│  (S05)  │   │  (S06)  │   └─────────┘   └─────────┘   └────┬────┘
└─────────┘   └─────────┘                                    │
                                           ┌─────────────────┼─────────────────┐
                                           │                 │                 │
                                           ▼                 ▼                 ▼
                                    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
                                    │ Categories  │   │   Rules     │   │  Household  │
                                    │   (S10)     │   │   (S11)     │   │   (S12)     │
                                    └─────────────┘   └─────────────┘   └──────┬──────┘
                                                                               │
                                                                               ▼
                                                                        ┌─────────────┐
                                                                        │    LINE     │
                                                                        │   (S13)     │
                                                                        └─────────────┘
```

### 6.3 主要画面ワイヤーフレーム

#### S04: ダッシュボード

```
┌────────────────────────────────────────────────────────────────┐
│ ≡  我が家の家計                                    👤 山田太郎  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  2026年1月                              < 今月 >          │ │
│  │                                                          │ │
│  │  総支出  ¥125,000                                        │ │
│  │  ──────────────────                                      │ │
│  │  サブスク ¥25,000  |  変動費 ¥100,000                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  回数制限カテゴリ                                         │ │
│  │  ────────────────                                        │ │
│  │                                                          │ │
│  │  🍽️ 外食        ████████░░░░  3/4回      残り1回         │ │
│  │                                          ⚠️ もうすぐ上限  │ │
│  │                                                          │ │
│  │  🎮 娯楽        ████░░░░░░░░  1/3回      残り2回         │ │
│  │                                                          │ │
│  │  🚗 遠出        ░░░░░░░░░░░░  0/2回      残り2回         │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────┐ ┌─────────────────────────────┐  │
│  │  カテゴリ別内訳          │ │  夫婦別支出                  │  │
│  │  ──────────              │ │  ──────────                  │  │
│  │                         │ │                             │  │
│  │      ┌───┐              │ │   山田太郎    山田花子       │  │
│  │    ╱     ╲             │ │   ┌─────┐    ┌─────┐       │  │
│  │   │  円   │            │ │   │     │    │     │       │  │
│  │   │ グラフ │            │ │   │ 60% │    │ 40% │       │  │
│  │    ╲     ╱             │ │   │     │    │     │       │  │
│  │      └───┘              │ │   └─────┘    └─────┘       │  │
│  │                         │ │   ¥75,000    ¥50,000       │  │
│  │  🍚 食費     35%        │ │                             │  │
│  │  🍽️ 外食     25%        │ │                             │  │
│  │  🎮 娯楽     20%        │ │                             │  │
│  │  📦 その他   20%        │ │                             │  │
│  │                         │ │                             │  │
│  └─────────────────────────┘ └─────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  直近の支出                                    もっと見る > │ │
│  │  ──────────                                              │ │
│  │                                                          │ │
│  │  1/18  🍽️ 外食      ¥3,500   山田太郎   ランチ           │ │
│  │  1/17  🍚 食費      ¥2,800   山田花子   スーパー         │ │
│  │  1/16  🎮 娯楽      ¥1,500   山田太郎   ゲーム           │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  🏠        📝        📊        💳        ⚙️                  │
│ ホーム    入力      分析     サブスク    設定                  │
└────────────────────────────────────────────────────────────────┘
```

#### S05: 支出入力

```
┌────────────────────────────────────────────────────────────────┐
│ ←  支出を入力                                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  日付                                                    │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │  2026年1月18日（土）                            📅  │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  金額                                                    │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │  ¥                                            3,500 │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │                                                          │ │
│  │  ⚠️ 設定した閾値以上の高額支出です                        │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  カテゴリ                                                │ │
│  │                                                          │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │ │
│  │  │ 🍚  │ │ 🍽️  │ │ 🧴  │ │ 🚃  │ │ 🎮  │              │ │
│  │  │食費 │ │外食 │ │日用品│ │交通費│ │娯楽 │              │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │ │
│  │  │ 💳  │ │ 👕  │ │ 🏥  │ │ 🚗  │ │ 📦  │              │ │
│  │  │サブスク│ │衣服 │ │医療 │ │遠出 │ │その他│              │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │ │
│  │                                                          │ │
│  │  選択中: 🍽️ 外食                                         │ │
│  │  ⚠️ 外食は今月残り1回です                                │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  メモ（任意）                                            │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │  ランチ                                             │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │                      登録する                            │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### S06: 支出履歴

```
┌────────────────────────────────────────────────────────────────┐
│ ≡  支出履歴                                        🔍 フィルタ │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │       ◀︎     2026年1月     ▶︎                             │ │
│  │                                                          │ │
│  │  合計: ¥125,000  (32件)                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  フィルタ                                           × 閉じる │ │
│  │  ────────                                                │ │
│  │                                                          │ │
│  │  カテゴリ        入力者                                  │ │
│  │  ┌──────────┐   ┌──────────┐                           │ │
│  │  │ すべて ▼ │   │ すべて ▼ │                           │ │
│  │  └──────────┘   └──────────┘                           │ │
│  │                                                          │ │
│  │  並び順                                                  │ │
│  │  ○ 日付（新しい順）  ○ 日付（古い順）  ○ 金額（高い順）   │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ── 1月18日（土）──────────────────────────────────           │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  🍽️ 外食                           ¥3,500    山田太郎     │ │
│  │  ランチ                                                   │ │
│  │                                                  ︙ 編集   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  🍚 食費                           ¥2,100    山田花子     │ │
│  │  スーパー                                                 │ │
│  │                                                  ︙ 編集   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ── 1月17日（金）──────────────────────────────────           │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  🚃 交通費                          ¥800    山田太郎      │ │
│  │  電車                                                     │ │
│  │                                                  ︙ 編集   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│                         ...                                    │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  🏠        📝        📊        💳        ⚙️                  │
│ ホーム    入力      分析     サブスク    設定                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. コンポーネント設計

### 7.1 コンポーネント構成図

```
components/
├── ui/                          # shadcn/ui ベースコンポーネント
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── toast.tsx
│   └── ...
│
├── layout/                      # レイアウトコンポーネント
│   ├── header.tsx              # ヘッダー
│   ├── sidebar.tsx             # サイドバー（PC）
│   ├── bottom-nav.tsx          # ボトムナビ（モバイル）
│   └── page-container.tsx      # ページコンテナ
│
├── features/                    # 機能別コンポーネント
│   ├── auth/
│   │   ├── login-button.tsx
│   │   └── user-menu.tsx
│   │
│   ├── expenses/
│   │   ├── expense-form.tsx
│   │   ├── expense-list.tsx
│   │   ├── expense-item.tsx
│   │   └── expense-edit-dialog.tsx
│   │
│   ├── dashboard/
│   │   ├── summary-card.tsx
│   │   ├── remaining-counts.tsx
│   │   ├── category-pie-chart.tsx
│   │   ├── user-comparison-chart.tsx
│   │   └── recent-expenses.tsx
│   │
│   ├── categories/
│   │   ├── category-list.tsx
│   │   ├── category-form.tsx
│   │   └── category-picker.tsx
│   │
│   ├── rules/
│   │   ├── rule-list.tsx
│   │   └── rule-form.tsx
│   │
│   ├── subscriptions/
│   │   ├── subscription-list.tsx
│   │   ├── subscription-form.tsx
│   │   └── subscription-summary.tsx
│   │
│   └── settings/
│       ├── household-settings.tsx
│       ├── invite-link.tsx
│       └── line-settings.tsx
│
└── shared/                      # 共通コンポーネント
    ├── loading-spinner.tsx
    ├── empty-state.tsx
    ├── error-boundary.tsx
    ├── confirm-dialog.tsx
    ├── date-picker.tsx
    ├── amount-input.tsx
    └── month-picker.tsx
```

### 7.2 主要コンポーネント仕様

#### ExpenseForm

```typescript
// components/features/expenses/expense-form.tsx
interface ExpenseFormProps {
  defaultValues?: Partial<ExpenseFormValues>
  onSuccess?: () => void
}

interface ExpenseFormValues {
  date: Date
  amount: number
  categoryId: string
  memo?: string
}

// バリデーションスキーマ
const expenseSchema = z.object({
  date: z.date(),
  amount: z.number().min(1, '金額を入力してください'),
  categoryId: z.string().min(1, 'カテゴリを選択してください'),
  memo: z.string().optional(),
})
```

#### CategoryPieChart

```typescript
// components/features/dashboard/category-pie-chart.tsx
interface CategoryPieChartProps {
  data: {
    categoryId: string
    categoryName: string
    icon: string
    amount: number
    percentage: number
  }[]
}

// Rechartsを使用
// カラーパレット: プライマリカラーのグラデーション
```

#### UserComparisonChart

```typescript
// components/features/dashboard/user-comparison-chart.tsx
interface UserComparisonChartProps {
  data: {
    userId: string
    userName: string
    nickname?: string
    amount: number
    percentage: number
  }[]
}

// 横棒グラフまたはドーナツチャート
```

---

## 8. 状態管理設計

### 8.1 状態管理方針

| 状態の種類 | 管理方法 | 例 |
|-----------|---------|-----|
| サーバー状態 | TanStack Query | 支出一覧、カテゴリ、ルール |
| グローバルUI状態 | Zustand | サイドバー開閉、モーダル |
| ローカルUI状態 | useState | フォーム入力、フィルター |
| URL状態 | Next.js Router | 月選択、ページネーション |

### 8.2 TanStack Query キー設計

```typescript
// lib/queries/query-keys.ts
export const queryKeys = {
  // 支出
  expenses: {
    all: ['expenses'] as const,
    list: (householdId: string, month: string) =>
      ['expenses', 'list', householdId, month] as const,
    detail: (id: string) => ['expenses', 'detail', id] as const,
  },

  // カテゴリ
  categories: {
    all: ['categories'] as const,
    list: (householdId: string) =>
      ['categories', 'list', householdId] as const,
  },

  // ルール
  rules: {
    all: ['rules'] as const,
    list: (householdId: string) =>
      ['rules', 'list', householdId] as const,
    remaining: (householdId: string) =>
      ['rules', 'remaining', householdId] as const,
  },

  // サブスク
  subscriptions: {
    all: ['subscriptions'] as const,
    list: (householdId: string) =>
      ['subscriptions', 'list', householdId] as const,
  },

  // ダッシュボード
  dashboard: {
    summary: (householdId: string, month: string) =>
      ['dashboard', 'summary', householdId, month] as const,
  },

  // ユーザー
  users: {
    current: ['users', 'current'] as const,
    household: (householdId: string) =>
      ['users', 'household', householdId] as const,
  },
}
```

### 8.3 Zustand ストア

```typescript
// lib/stores/ui-store.ts
import { create } from 'zustand'

interface UIStore {
  // サイドバー
  sidebarOpen: boolean
  toggleSidebar: () => void

  // 支出入力モーダル
  expenseModalOpen: boolean
  openExpenseModal: () => void
  closeExpenseModal: () => void

  // 編集中の支出
  editingExpenseId: string | null
  setEditingExpenseId: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  expenseModalOpen: false,
  openExpenseModal: () => set({ expenseModalOpen: true }),
  closeExpenseModal: () => set({ expenseModalOpen: false, editingExpenseId: null }),

  editingExpenseId: null,
  setEditingExpenseId: (id) => set({ editingExpenseId: id, expenseModalOpen: !!id }),
}))
```

---

## 9. 外部連携設計

### 9.1 LINE Notify連携

```
┌─────────────────────────────────────────────────────────────────┐
│                    LINE Notify 連携フロー                        │
└─────────────────────────────────────────────────────────────────┘

[ユーザー]                    [アプリ]                    [LINE Notify]
    │                           │                              │
    │ 1. LINE連携設定画面       │                              │
    │    を開く                 │                              │
    ▼                           │                              │
┌───────────┐                   │                              │
│設定 > LINE│                   │                              │
│  連携     │                   │                              │
└─────┬─────┘                   │                              │
      │                         │                              │
      │ 2. LINE Notifyで        │                              │
      │    トークン発行         │                              │
      │    （外部サイト）       │                              │
      ▼                         │                              │
┌─────────────────┐             │                              │
│ LINE Notify     │             │                              │
│ マイページで     │             │                              │
│ トークン発行     │             │                              │
└────────┬────────┘             │                              │
         │                      │                              │
         │ 3. トークンをコピー  │                              │
         │    してアプリに貼付  │                              │
         ▼                      │                              │
┌─────────────────┐             │                              │
│ トークン入力    │────────────▶│                              │
│ フォーム        │  4. 保存    │                              │
└─────────────────┘             │                              │
                                │                              │
                                │ 5. トークン検証              │
                                │    （テスト通知送信）        │
                                │─────────────────────────────▶│
                                │                              │
                                │◀─────────────────────────────│
                                │ 6. 成功/失敗                 │
                                │                              │
                                │ 7. households.line_notify_   │
                                │    tokenに保存               │
                                ▼                              │
                         ┌──────────────┐                      │
                         │   DB保存完了  │                      │
                         └──────────────┘                      │
```

### 9.2 LINE Notify トークン発行手順（ユーザー向け）

```
1. https://notify-bot.line.me/ja/ にアクセス
2. LINEアカウントでログイン
3. マイページ > アクセストークンの発行
4. トークン名: 「家計簿アプリ」など任意の名前
5. 通知を送信するトークルームを選択:
   - 「1:1でLINE Notifyから通知を受け取る」（個人）
   - または夫婦のLINEグループを選択
6. 発行ボタンをクリック
7. 表示されたトークンをコピー
8. アプリの設定画面に貼り付けて保存
```

---

## 10. セキュリティ設計

### 10.1 認証・認可

| 項目 | 実装方法 |
|------|---------|
| 認証 | Supabase Auth (Google OAuth 2.0) |
| セッション管理 | Supabase セッション（JWT） |
| 認可 | Supabase RLS（Row Level Security） |
| CSRF対策 | Next.js組み込み |
| XSS対策 | React標準エスケープ |

### 10.2 データ保護

```typescript
// LINE Notifyトークンの暗号化保存（オプション）
// Supabase Edge FunctionsまたはAPI Routeで暗号化/復号化

// 簡易的にはSupabase Vaultを使用可能
// https://supabase.com/docs/guides/database/vault
```

### 10.3 環境変数管理

```bash
# .env.local（ローカル開発用）
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_KEY=eyJ...（ローカル用）

# Vercel環境変数（本番用）
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=eyJ...（本番用）
```

---

## 11. 開発環境・デプロイ設計

### 11.1 開発環境構成

```
┌─────────────────────────────────────────────────────────────────┐
│                       ローカル開発環境                           │
└─────────────────────────────────────────────────────────────────┘

                    Mac (開発マシン)
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Next.js Dev Server                     │ │
│  │                    http://localhost:3000                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Supabase Local                          │ │
│  │                                                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │ │
│  │  │  PostgreSQL  │  │    Auth     │  │   Studio    │      │ │
│  │  │ :54322      │  │   :54321    │  │   :54323    │      │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │ │
│  │                                                           │ │
│  │  supabase start で起動                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Supabase Local セットアップ

```bash
# Supabase CLIインストール
brew install supabase/tap/supabase

# プロジェクト初期化
supabase init

# ローカル起動
supabase start

# 出力されるURLとキーを.env.localに設定
# API URL: http://localhost:54321
# anon key: eyJ...
# Studio URL: http://localhost:54323

# マイグレーション作成
supabase migration new create_tables

# マイグレーション適用
supabase db reset

# 停止
supabase stop
```

### 11.3 デプロイフロー

```
┌─────────────────────────────────────────────────────────────────┐
│                        デプロイフロー                            │
└─────────────────────────────────────────────────────────────────┘

[開発者]
    │
    │ 1. コード変更
    ▼
┌──────────────┐
│  ローカル開発 │
│  (Supabase   │
│   Local)     │
└──────┬───────┘
       │
       │ 2. git push
       ▼
┌──────────────┐      ┌──────────────┐
│    GitHub    │─────▶│    Vercel    │
│              │      │  (自動デプロイ)│
└──────────────┘      └──────┬───────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Preview    │      │  Production  │      │   Supabase   │
│  (PR時自動)   │      │  (main merge) │      │   (本番DB)   │
└──────────────┘      └──────────────┘      └──────────────┘
```

### 11.4 Supabase マイグレーション戦略

```bash
# 本番環境へのマイグレーション

# 1. ローカルでマイグレーション作成・テスト
supabase migration new add_feature
supabase db reset  # ローカルで適用テスト

# 2. Supabase本番にリンク
supabase link --project-ref <project-id>

# 3. 本番にプッシュ
supabase db push

# または GitHub Actions で自動化
```

### 11.5 PWA設定

```typescript
// next.config.ts
import type { NextConfig } from 'next'
import withPWA from 'next-pwa'

const nextConfig: NextConfig = {
  // Next.js設定
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)
```

```typescript
// app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '家計簿アプリ',
    short_name: '家計簿',
    description: '夫婦向け浪費管理アプリ',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFBF7',
    theme_color: '#F97316',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
```

---

## 12. ディレクトリ構成

```
household-expense-app/
├── .env.local                    # 環境変数（ローカル）
├── .env.example                  # 環境変数テンプレート
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── components.json               # shadcn/ui設定
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── invite/
│   │   │   └── [token]/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # ダッシュボード
│   │   ├── expenses/
│   │   │   ├── page.tsx          # 支出一覧
│   │   │   └── new/
│   │   │       └── page.tsx      # 支出入力
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── subscriptions/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── categories/
│   │       │   └── page.tsx
│   │       ├── rules/
│   │       │   └── page.tsx
│   │       ├── household/
│   │       │   └── page.tsx
│   │       └── line/
│   │           └── page.tsx
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   └── line/
│   │       └── notify/
│   │           └── route.ts
│   │
│   ├── layout.tsx
│   ├── manifest.ts               # PWAマニフェスト
│   ├── globals.css
│   └── providers.tsx             # QueryClient, Zustandなど
│
├── components/
│   ├── ui/                       # shadcn/ui
│   ├── layout/
│   ├── features/
│   │   ├── auth/
│   │   ├── expenses/
│   │   ├── dashboard/
│   │   ├── categories/
│   │   ├── rules/
│   │   ├── subscriptions/
│   │   └── settings/
│   └── shared/
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # ブラウザ用クライアント
│   │   ├── server.ts             # サーバー用クライアント
│   │   └── middleware.ts         # ミドルウェア用
│   ├── queries/
│   │   ├── query-keys.ts
│   │   ├── expenses.ts
│   │   ├── categories.ts
│   │   ├── rules.ts
│   │   ├── subscriptions.ts
│   │   └── dashboard.ts
│   ├── stores/
│   │   └── ui-store.ts
│   ├── validations/
│   │   ├── expense.ts
│   │   ├── category.ts
│   │   └── subscription.ts
│   └── utils/
│       ├── date.ts
│       ├── format.ts
│       └── cn.ts                 # clsx + tailwind-merge
│
├── types/
│   ├── database.ts               # Supabase生成型
│   └── index.ts
│
├── hooks/
│   ├── use-user.ts
│   ├── use-household.ts
│   └── use-current-period.ts
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       ├── 20260118000000_create_tables.sql
│       └── 20260118000001_create_rls_policies.sql
│
└── public/
    ├── favicon.ico
    └── icons/
        ├── icon-192x192.png
        └── icon-512x512.png
```

---

## 付録

### A. 型定義（Supabase生成）

```typescript
// types/database.ts
export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          line_notify_token: string | null
          high_amount_threshold: number
          reset_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          line_notify_token?: string | null
          high_amount_threshold?: number
          reset_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          line_notify_token?: string | null
          high_amount_threshold?: number
          reset_day?: number
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          nickname: string | null
          avatar_url: string | null
          household_id: string | null
          role: 'owner' | 'member'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          nickname?: string | null
          avatar_url?: string | null
          household_id?: string | null
          role?: 'owner' | 'member'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          nickname?: string | null
          avatar_url?: string | null
          household_id?: string | null
          role?: 'owner' | 'member'
          created_at?: string
          updated_at?: string
        }
      }
      // ... 他のテーブルも同様
    }
  }
}
```

### B. 環境変数一覧

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_KEY=

# 本番のみ（Vercel環境変数で設定）
# SUPABASE_SERVICE_ROLE_KEY=
```

### C. 開発コマンド一覧

```bash
# 開発サーバー起動
npm run dev

# Supabaseローカル起動
supabase start

# Supabaseローカル停止
supabase stop

# 型生成
supabase gen types typescript --local > types/database.ts

# マイグレーション作成
supabase migration new <name>

# マイグレーション適用（ローカル）
supabase db reset

# 本番にプッシュ
supabase db push

# ビルド
npm run build

# リント
npm run lint
```

---

**設計書 終わり**
