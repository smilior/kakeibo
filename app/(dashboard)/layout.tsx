'use client'

import { useUser } from '@/hooks/use-user'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAutoGenerateAnalysis } from '@/lib/queries/analytics'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: user, isLoading } = useUser()
  const router = useRouter()

  // ログイン時に週別・月別分析を自動生成
  useAutoGenerateAnalysis(user?.household_id ?? undefined)

  useEffect(() => {
    if (!isLoading && user && !user.household_id) {
      router.push('/setup')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header user={user ?? null} householdName={user?.household?.name} />
      <main className="mx-auto max-w-lg px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
