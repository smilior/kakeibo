import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 認証が必要なパス（'/' は完全一致のみ）
  const protectedPaths = ['/expenses', '/analytics', '/settings']
  const isProtectedPath =
    request.nextUrl.pathname === '/' ||
    protectedPaths.some(
      (path) =>
        request.nextUrl.pathname === path ||
        request.nextUrl.pathname.startsWith(`${path}/`)
    )

  // 未認証ユーザーの保護ルートアクセスをブロック
  if (
    !user &&
    isProtectedPath &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/invite') &&
    !request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    // セッション更新クッキーを引き継ぐ
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options)
    })
    return redirectResponse
  }

  // 認証済みユーザーのログインページアクセスをリダイレクト
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirectResponse = NextResponse.redirect(url)
    // セッション更新クッキーを引き継ぐ
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options)
    })
    return redirectResponse
  }

  return supabaseResponse
}
