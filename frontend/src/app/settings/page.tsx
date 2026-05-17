'use client'

import { useState } from 'react'
import { useAgents } from '@/hooks/useAgents'
import { useDefaultAgent } from '@/hooks/useDefaultAgent'
import { useModels } from '@/hooks/useModels'
import { useDefaultModel } from '@/hooks/useDefaultModel'

export default function SettingsPage() {
  const { data: agents = [], isLoading: agentsLoading } = useAgents()
  const { agentId, setDefault: setDefaultAgent } = useDefaultAgent()
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const { data: models = [], isLoading: modelsLoading } = useModels()
  const { modelId, setDefault: setDefaultModel } = useDefaultModel()
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const pendingAgent = selectedAgent ?? agentId
  const pendingModel = selectedModel ?? modelId

  function handleSetDefaultAgent() {
    if (selectedAgent && selectedAgent !== agentId) {
      setDefaultAgent(selectedAgent)
      setSelectedAgent(null)
    }
  }

  function handleSetDefaultModel() {
    if (selectedModel && selectedModel !== modelId) {
      setDefaultModel(selectedModel)
      setSelectedModel(null)
    }
  }

  return (
    <div className="max-w-sm flex flex-col gap-8">
      {/* Default Agent section */}
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Default Agent
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Select an agent and click Set as Default.
        </p>

        {agentsLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading agents…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {agents.map((agent) => {
              const isSelected = agent.id === pendingAgent
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
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
              onClick={handleSetDefaultAgent}
              disabled={!selectedAgent || selectedAgent === agentId}
              className="mt-3 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--purple-600)', color: 'white' }}
            >
              Set as Default
            </button>
          </div>
        )}
      </div>

      {/* Default Model section */}
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Default Model
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Select a model and click Set as Default.
        </p>

        {modelsLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading models…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {models.map((model) => {
              const isSelected = model.id === pendingModel
              return (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors w-full"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: `1px solid ${isSelected ? 'var(--purple-600)' : 'var(--border-custom)'}`,
                    opacity: model.available ? 1 : 0.6,
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
                    {model.name}
                  </span>
                  {!model.available && (
                    <span
                      className="text-[10px] rounded px-1.5 py-0.5"
                      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    >
                      not pulled
                    </span>
                  )}
                  {model.id === modelId && (
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
              onClick={handleSetDefaultModel}
              disabled={!selectedModel || selectedModel === modelId}
              className="mt-3 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--purple-600)', color: 'white' }}
            >
              Set as Default
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
