'use client'

import Link from 'next/link'
import { ChevronRight, Folder, Gauge, Home, MessageSquare, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const settingsItems = [
  {
    href: '/settings/categories',
    icon: Folder,
    label: 'カテゴリ管理',
    description: 'カテゴリの追加・編集・削除',
  },
  {
    href: '/settings/rules',
    icon: Gauge,
    label: 'ルール設定',
    description: '回数制限の設定',
  },
  {
    href: '/settings/household',
    icon: Home,
    label: '家計設定',
    description: '家計名・招待・高額閾値',
  },
  {
    href: '/settings/line',
    icon: MessageSquare,
    label: 'LINE連携',
    description: 'LINE Notify設定',
  },
  {
    href: '/settings/ai',
    icon: Sparkles,
    label: 'AI設定',
    description: 'モデル・プロンプト設定',
  },
]

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">設定</h1>
      <div className="space-y-2">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
