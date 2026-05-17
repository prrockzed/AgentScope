'use client'

import { useState } from 'react'
import { useAgents } from '@/hooks/useAgents'
import { useDefaultAgent } from '@/hooks/useDefaultAgent'

export default function SettingsPage() {
  const { data: agents = [], isLoading } = useAgents()
  const { agentId, setDefault } = useDefaultAgent()
  const [selected, setSelected] = useState<string | null>(null)

  const pending = selected ?? agentId

  function handleSetDefault() {
    if (selected && selected !== agentId) {
      setDefault(selected)
      setSelected(null)
    }
  }

  return (
    <div className="max-w-sm">
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Default Agent
      </h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Select an agent and click Set as Default.
      </p>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading agents…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {agents.map((agent) => {
            const isSelected = agent.id === pending
            return (
              <button
                key={agent.id}
                onClick={() => setSelected(agent.id)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors w-full"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${isSelected ? 'var(--purple-600)' : 'var(--border-custom)'}`,
                }}
              >
                <div
                  className="h-3.5 w-3.5 rounded-full border-2 flex-shrink-0"
                  style={{
                    borderColor: isSelected ? 'var(--purple-600)' : 'var(--text-muted)',
                    backgroundColor: isSelected ? 'var(--purple-600)' : 'transparent',
                  }}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {agent.name}
                </span>
                {agent.id === agentId && (
                  <span
                    className="ml-auto text-[10px] font-semibold rounded-full px-2 py-0.5"
                    style={{ backgroundColor: 'var(--purple-600)', color: 'white' }}
                  >
                    default
                  </span>
                )}
              </button>
            )
          })}

          <button
            onClick={handleSetDefault}
            disabled={!selected || selected === agentId}
            className="mt-3 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--purple-600)', color: 'white' }}
          >
            Set as Default
          </button>
        </div>
      )}
    </div>
  )
}
