'use client'

import { useState } from 'react'
import { useAgents } from '@/hooks/useAgents'
import { useDefaultAgent } from '@/hooks/useDefaultAgent'
import { useModels } from '@/hooks/useModels'
import { useDefaultModel } from '@/hooks/useDefaultModel'
import { useEvaluatorModel } from '@/hooks/useEvaluatorModel'

// ─── local ui helpers ─────────────────────────────────────────────────────────

function Card({
  title,
  description,
  children,
  onSave,
  saveLabel,
  saveDisabled,
  saved,
}: {
  title: string
  description: string
  children: React.ReactNode
  onSave: () => void
  saveLabel: string
  saveDisabled: boolean
  saved: boolean
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-custom)', backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="px-6 pt-5 pb-4">
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      </div>

      <div className="px-3 pb-3 flex flex-col gap-0.5">
        {children}
      </div>

      <div
        className="flex items-center justify-end px-5 py-3"
        style={{ borderTop: '1px solid var(--border-custom)' }}
      >
        <button
          onClick={onSave}
          disabled={saveDisabled}
          className="rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200"
          style={{
            backgroundColor: saved
              ? 'rgba(34, 197, 94, 0.12)'
              : 'var(--purple-600)',
            color: saved ? 'rgb(74, 222, 128)' : 'white',
            opacity: saveDisabled && !saved ? 0.35 : 1,
            cursor: saveDisabled ? 'default' : 'pointer',
          }}
        >
          {saved ? '✓ Saved' : saveLabel}
        </button>
      </div>
    </div>
  )
}

function Row({
  label,
  isSelected,
  isActive,
  activeBadge,
  unavailableBadge,
  disabled,
  onClick,
}: {
  label: string
  isSelected: boolean
  isActive: boolean
  activeBadge: string
  unavailableBadge?: string | null
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-left transition-all duration-150"
      style={{
        backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
        border: `1px solid ${isSelected ? 'rgba(139, 92, 246, 0.4)' : 'transparent'}`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <div
        className="h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 transition-all duration-150"
        style={{
          borderColor: isSelected ? 'var(--purple-600)' : 'var(--text-muted)',
          backgroundColor: isSelected ? 'var(--purple-600)' : 'transparent',
        }}
      />

      <span
        className="text-sm flex-1 text-left"
        style={{
          color: 'var(--text-primary)',
          fontWeight: isSelected ? 500 : 400,
        }}
      >
        {label}
      </span>

      {unavailableBadge && (
        <span
          className="text-[10px] rounded-md px-1.5 py-0.5 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          {unavailableBadge}
        </span>
      )}

      {isActive && (
        <span
          className="text-[10px] font-medium rounded-full px-2 py-0.5 flex-shrink-0"
          style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: 'var(--purple-600)' }}
        >
          {activeBadge}
        </span>
      )}
    </button>
  )
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-10 rounded-xl animate-pulse mx-0"
          style={{ backgroundColor: 'var(--bg-elevated)', opacity: 0.5 }}
        />
      ))}
    </>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: agents = [], isLoading: agentsLoading } = useAgents()
  const { agentId, setDefault: setDefaultAgent } = useDefaultAgent()
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const { data: models = [], isLoading: modelsLoading } = useModels()
  const { modelId, setDefault: setDefaultModel } = useDefaultModel()
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const { modelId: evaluatorModelId, setEvaluatorModel } = useEvaluatorModel()
  const [selectedEvaluatorModel, setSelectedEvaluatorModel] = useState<string | null>(null)

  const [savedSection, setSavedSection] = useState<string | null>(null)

  const pendingAgent = selectedAgent ?? agentId
  const pendingModel = selectedModel ?? modelId
  const pendingEvaluatorModel = selectedEvaluatorModel ?? evaluatorModelId

  function flashSaved(section: string) {
    setSavedSection(section)
    setTimeout(() => setSavedSection(null), 2000)
  }

  function handleSetDefaultAgent() {
    if (selectedAgent && selectedAgent !== agentId) {
      setDefaultAgent(selectedAgent)
      setSelectedAgent(null)
      flashSaved('agent')
    }
  }

  function handleSetDefaultModel() {
    if (selectedModel && selectedModel !== modelId) {
      setDefaultModel(selectedModel)
      setSelectedModel(null)
      flashSaved('model')
    }
  }

  function handleSetEvaluatorModel() {
    if (selectedEvaluatorModel && selectedEvaluatorModel !== evaluatorModelId) {
      setEvaluatorModel(selectedEvaluatorModel)
      setSelectedEvaluatorModel(null)
      flashSaved('evaluator')
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div>
        <h1 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Configure defaults used when creating new runs.
        </p>
      </div>

      {/* Cards grid — side by side on wide screens */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>

      {/* Default Agent */}
      <Card
        title="Default Agent"
        description="The agent pre-selected when you open the new run form."
        onSave={handleSetDefaultAgent}
        saveLabel="Save"
        saveDisabled={!selectedAgent || selectedAgent === agentId}
        saved={savedSection === 'agent'}
      >
        {agentsLoading ? (
          <LoadingRows />
        ) : (
          agents.map((agent) => (
            <Row
              key={agent.id}
              label={agent.name}
              isSelected={agent.id === pendingAgent}
              isActive={agent.id === agentId}
              activeBadge="default"
              onClick={() => setSelectedAgent(agent.id)}
            />
          ))
        )}
      </Card>

      {/* Default Model */}
      <Card
        title="Default Model"
        description="The model pre-selected when you open the new run form."
        onSave={handleSetDefaultModel}
        saveLabel="Save"
        saveDisabled={!selectedModel || selectedModel === modelId}
        saved={savedSection === 'model'}
      >
        {modelsLoading ? (
          <LoadingRows />
        ) : (
          models.map((model) => (
            <Row
              key={model.id}
              label={model.name}
              isSelected={model.id === pendingModel}
              isActive={model.id === modelId}
              activeBadge="default"
              unavailableBadge={!model.available ? (model.unavailableReason ?? 'unavailable') : null}
              disabled={!model.available}
              onClick={() => { if (model.available) setSelectedModel(model.id) }}
            />
          ))
        )}
      </Card>

      {/* Evaluator Model */}
      <Card
        title="Evaluator Model"
        description="Used to score run accuracy. Cloud models produce more reliable output."
        onSave={handleSetEvaluatorModel}
        saveLabel="Save"
        saveDisabled={!selectedEvaluatorModel || selectedEvaluatorModel === evaluatorModelId}
        saved={savedSection === 'evaluator'}
      >
        {modelsLoading ? (
          <LoadingRows />
        ) : (
          models.map((model) => (
            <Row
              key={model.id}
              label={model.name}
              isSelected={model.id === pendingEvaluatorModel}
              isActive={model.id === evaluatorModelId}
              activeBadge="evaluator"
              unavailableBadge={!model.available ? (model.unavailableReason ?? 'unavailable') : null}
              disabled={!model.available}
              onClick={() => { if (model.available) setSelectedEvaluatorModel(model.id) }}
            />
          ))
        )}
      </Card>

      </div>{/* end grid */}
    </div>
  )
}
