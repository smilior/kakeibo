import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // ユーザープロフィールが存在するか確認
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, household_id')
        .eq('id', data.user.id)
        .single()

      if (!existingUser) {
        // 新規ユーザー：プロフィールを作成
        const { error: insertError } = await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata.full_name || data.user.email!.split('@')[0],
          avatar_url: data.user.user_metadata.avatar_url,
        })

        if (insertError) {
          console.error('Failed to create user profile:', insertError)
        }

        // 家計未所属の場合はセットアップページへ
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}/setup`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}/setup`)
        } else {
          return NextResponse.redirect(`${origin}/setup`)
        }
      }

      // 既存ユーザーで家計未所属の場合はセットアップページへ
      if (!existingUser.household_id) {
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}/setup`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}/setup`)
        } else {
          return NextResponse.redirect(`${origin}/setup`)
        }
      }

      // 通常のリダイレクト
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // エラーの場合はログインページへリダイレクト
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
