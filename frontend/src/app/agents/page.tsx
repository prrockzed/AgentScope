'use client'

import { useAgents } from '@/hooks/useAgents'
import { useDefaultAgent } from '@/hooks/useDefaultAgent'
import { Skeleton } from '@/components/ui/skeleton'

export default function AgentsPage() {
  const { data: agents = [], isLoading } = useAgents()
  const { agentId } = useDefaultAgent()

  const sorted = [...agents].sort((a, b) => a.name.localeCompare(b.name))

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {agents.length} agent{agents.length !== 1 ? 's' : ''} available
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((agent) => {
          const isDefault = agent.id === agentId
          return (
            <div
              key={agent.id}
              className="flex flex-col gap-2 rounded-lg p-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: `1px solid ${isDefault ? 'var(--purple-600)' : 'var(--border-custom)'}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {agent.name}
                </span>
                {isDefault && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: 'var(--purple-600)', color: 'white' }}
                  >
                    default
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {agent.description}
              </p>
              <p
                className="mt-auto pt-1 text-[10px] font-mono"
                style={{ color: 'var(--text-muted)', opacity: 0.6 }}
              >
                {agent.id}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
