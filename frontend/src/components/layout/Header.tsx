'use client'

import { usePathname } from 'next/navigation'
import { NewRunDialog } from '@/components/runs/NewRunDialog'

function getTitle(pathname: string): string {
  if (pathname.startsWith('/models')) return 'Models'
  if (pathname.startsWith('/agents')) return 'Agents'
  if (pathname.startsWith('/analytics')) return 'Analytics'
  if (pathname.startsWith('/evaluations')) return 'Evaluations'
  if (pathname.startsWith('/failures')) return 'Failures'
  if (pathname.startsWith('/settings')) return 'Settings'
  if (pathname.startsWith('/optimizations')) return 'Optimizations'
  if (pathname.match(/^\/runs\/[^/]+/)) return 'Trace Viewer'
  if (pathname.startsWith('/runs')) return 'Runs'
  return 'AgentScope'
}

export function Header() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header
      className="fixed left-60 right-0 top-0 z-10 flex h-14 items-center justify-between px-6"
      style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border-custom)' }}
    >
      <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>
      <NewRunDialog />
    </header>
  )
}
