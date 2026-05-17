'use client'

import { useModels } from '@/hooks/useModels'
import { useDefaultModel } from '@/hooks/useDefaultModel'
import { Skeleton } from '@/components/ui/skeleton'

export default function ModelsPage() {
  const { data: models = [], isLoading } = useModels()
  const { modelId } = useDefaultModel()

  const pulled = models.filter((m) => m.available)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }} />
        ))}
      </div>
    )
  }

  if (pulled.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          0 of {models.length} models pulled
        </p>
        <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          No models are currently available. Pull one with{' '}
          <code
            className="rounded px-1.5 py-0.5 text-xs"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            ollama pull &lt;model-id&gt;
          </code>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {pulled.length} of {models.length} model{models.length !== 1 ? 's' : ''} pulled
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pulled.map((model) => {
          const isDefault = model.id === modelId
          return (
            <div
              key={model.id}
              className="flex flex-col gap-2 rounded-lg p-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: `1px solid ${isDefault ? 'var(--purple-600)' : 'var(--border-custom)'}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {model.name}
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
                {model.description}
              </p>
              <p
                className="mt-auto pt-1 text-[10px] font-mono"
                style={{ color: 'var(--text-muted)', opacity: 0.6 }}
              >
                {model.id}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
