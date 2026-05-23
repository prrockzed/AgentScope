'use client'

import { useState } from 'react'
import { useAgentPatches } from '@/hooks/useAgentPatches'
import { PatchCard } from '@/components/improvements/PatchCard'
import type { AgentPatch } from '@/types'

type Tab = 'all' | 'pending' | 'active' | 'history'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
]

function filterPatches(patches: AgentPatch[], tab: Tab): AgentPatch[] {
  if (tab === 'all') return patches
  if (tab === 'pending') return patches.filter((p) => p.status === 'PENDING' || p.status === 'GENERATING' || p.status === 'FAILED')
  if (tab === 'active') return patches.filter((p) => p.status === 'ACTIVE')
  if (tab === 'history') return patches.filter((p) => p.status === 'REJECTED' || p.status === 'REVOKED')
  return patches
}

function emptyMessage(tab: Tab): string {
  if (tab === 'pending') return 'No patches pending review. Open a completed run with a DONE accuracy evaluation and click "Improve Agent" to generate one.'
  if (tab === 'active') return 'No active patches. Activate a pending patch to start injecting instructions into new runs.'
  if (tab === 'history') return 'No rejected or revoked patches yet.'
  return 'No improvement patches yet. Open a completed run with a DONE accuracy evaluation and click "Improve Agent" to generate one.'
}

export default function ImprovementsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const { data: patches, isLoading } = useAgentPatches()

  const filtered = filterPatches(patches ?? [], activeTab)

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={
              activeTab === tab.key
                ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg p-4 h-24 animate-pulse"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {emptyMessage(activeTab)}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((patch) => (
            <PatchCard key={patch.id} patch={patch} />
          ))}
        </div>
      )}
    </div>
  )
}
