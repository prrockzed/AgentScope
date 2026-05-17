'use client'

import { useAgents } from '@/hooks/useAgents'
import { useDefaultAgent } from '@/hooks/useDefaultAgent'

export default function SettingsPage() {
  const { data: agents = [], isLoading } = useAgents()
  const { agentId, setDefault } = useDefaultAgent()

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Default Agent
      </h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        The agent selected here will be used by default when you submit a new run.
      </p>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading agents…
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map((agent) => {
            const isActive = agent.id === agentId
            return (
              <div
                key={agent.id}
                className="flex items-start justify-between gap-4 rounded-lg p-4"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${isActive ? 'var(--purple-600)' : 'var(--border-custom)'}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0"
                    style={{
                      borderColor: isActive ? 'var(--purple-600)' : 'var(--text-muted)',
                      backgroundColor: isActive ? 'var(--purple-600)' : 'transparent',
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {agent.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {agent.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDefault(agent.id)}
                  disabled={isActive}
                  className="flex-shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-opacity disabled:opacity-50"
                  style={
                    isActive
                      ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                      : {
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-custom)',
                          color: 'var(--text-primary)',
                        }
                  }
                >
                  {isActive ? 'Active' : 'Set as default'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
