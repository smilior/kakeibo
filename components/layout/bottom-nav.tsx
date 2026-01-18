'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, PenSquare, BarChart3, CreditCard, Settings } from 'lucide-react'

const navItems = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/expenses/new', label: '入力', icon: PenSquare },
  { href: '/analytics', label: '分析', icon: BarChart3 },
  { href: '/subscriptions', label: 'サブスク', icon: CreditCard },
  { href: '/settings', label: '設定', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white pb-safe">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
