'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Activity, AlertTriangle, Bookmark, Bot, Brain, Cpu, FlaskConical, Info, Lightbulb, Settings, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

const groups = [
  {
    label: 'OBSERVE',
    items: [
      { href: '/runs', label: 'Runs', icon: Activity },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/failures', label: 'Failures', icon: AlertTriangle },
    ],
  },
  {
    label: 'RUNTIME',
    items: [
      { href: '/agents', label: 'Agents', icon: Bot },
      { href: '/models', label: 'Models', icon: Cpu },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { href: '/evaluations', label: 'Evaluations', icon: FlaskConical },
      { href: '/saved-runs', label: 'Saved Runs', icon: Bookmark },
      { href: '/optimizations', label: 'Optimizations', icon: Lightbulb },
      { href: '/knowledge', label: 'Knowledge Base', icon: Brain },
      { href: '/improvements', label: 'Improvements', icon: Wrench },
    ],
  },
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
      <nav className="flex flex-col gap-7 p-3 flex-1">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p
              className="px-3 pb-1 text-[12px] font-semibold tracking-widest"
              style={{ color: 'var(--text-muted)', opacity: 0.5 }}
            >
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'text-white' : 'hover:text-white'
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
          </div>
        ))}
      </nav>

      {/* About + Settings */}
      <div className="p-3 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border-custom)' }}>
        {[
          { href: '/about', label: 'About', icon: Info },
          { href: '/settings', label: 'Settings', icon: Settings },
        ].map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
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
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
