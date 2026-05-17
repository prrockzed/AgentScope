'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Activity, AlertTriangle, Bookmark, Bot, FlaskConical, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/runs', label: 'Runs', icon: Activity },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/saved-runs', label: 'Saved Runs', icon: Bookmark },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/evaluations', label: 'Evaluations', icon: FlaskConical },
  { href: '/failures', label: 'Failures', icon: AlertTriangle },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col"
      style={{ backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-custom)' }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-3 px-5"
        style={{ borderBottom: '1px solid var(--border-custom)' }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md text-white text-sm font-bold"
          style={{ background: 'var(--purple-600)' }}
        >
          A
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          AgentScope
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'text-white'
                  : 'hover:text-white'
              )}
              style={
                active
                  ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-custom)' }}>
        {(() => {
          const active = pathname.startsWith('/settings')
          return (
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active ? 'text-white' : 'hover:text-white',
              )}
              style={
                active
                  ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <Settings size={16} />
              Settings
            </Link>
          )
        })()}
      </div>
    </aside>
  )
}
