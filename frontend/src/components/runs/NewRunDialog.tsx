'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useCreateRun } from '@/hooks/useCreateRun'
import { useAgents } from '@/hooks/useAgents'
import { useModels } from '@/hooks/useModels'
import { useDefaultAgent } from '@/hooks/useDefaultAgent'
import { useDefaultModel } from '@/hooks/useDefaultModel'

export function NewRunDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [task, setTask] = useState('')
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const agentDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  const { mutate, isPending } = useCreateRun()
  const { data: agents = [] } = useAgents()
  const { data: models = [] } = useModels()
  const { agentId } = useDefaultAgent()
  const { modelId } = useDefaultModel()

  const [pendingAgentId, setPendingAgentId] = useState<string>(agentId)
  const [pendingModelId, setPendingModelId] = useState<string>(modelId)

  // Sync pending state when dialog opens
  useEffect(() => {
    if (open) {
      setPendingAgentId(agentId)
      setPendingModelId(modelId)
    }
  }, [open, agentId, modelId])

  const pendingAgent = agents.find((a) => a.id === pendingAgentId)
  const pendingAgentName = pendingAgent?.name ?? 'Tool Agent'
  const pendingModel = models.find((m) => m.id === pendingModelId)
  const pendingModelName = pendingModel?.name ?? 'Qwen3 4B'

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setAgentDropdownOpen(false)
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSubmit() {
    if (!task.trim()) return
    mutate(
      { task: task.trim(), agentType: pendingAgentId, model: pendingModelId },
      {
        onSuccess: (newRun) => {
          setOpen(false)
          setTask('')
          setAgentDropdownOpen(false)
          setModelDropdownOpen(false)
          router.push(`/runs/${newRun.id}`)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="gap-1.5"
            style={{ backgroundColor: 'var(--purple-600)', color: 'white' }}
          />
        }
      >
        <Plus size={14} />
        New Run
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-lg"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>New Agent Run</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <Textarea
            placeholder="Describe the task for the agent…"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={5}
            className="resize-none"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-custom)',
              color: 'var(--text-primary)',
            }}
          />

          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              {/* Primary submit button */}
              <Button
                onClick={handleSubmit}
                disabled={isPending || !task.trim()}
                className="flex-1"
                style={{ backgroundColor: 'var(--purple-600)', color: 'white' }}
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Submitting…
                  </>
                ) : (
                  'Submit Task'
                )}
              </Button>

              {/* Run as… dropdown */}
              <div className="relative" ref={agentDropdownRef}>
                <Button
                  onClick={() => {
                    setModelDropdownOpen(false)
                    setAgentDropdownOpen((v) => !v)
                  }}
                  disabled={isPending}
                  className="gap-1"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-custom)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Run as…
                  <ChevronDown size={13} />
                </Button>

                {agentDropdownOpen && (
                  <div
                    className="absolute right-0 z-50 mt-1 w-72 rounded-md py-1 shadow-lg max-h-70 overflow-y-auto"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-custom)',
                    }}
                  >
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setPendingAgentId(agent.id)
                          setAgentDropdownOpen(false)
                        }}
                        className="w-full px-3 py-2 text-left hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <div className="text-sm font-medium">{agent.name}</div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {agent.description}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Model dropdown */}
              <div className="relative" ref={modelDropdownRef}>
                <Button
                  onClick={() => {
                    setAgentDropdownOpen(false)
                    setModelDropdownOpen((v) => !v)
                  }}
                  disabled={isPending}
                  className="gap-1"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-custom)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Model
                  <ChevronDown size={13} />
                </Button>

                {modelDropdownOpen && (
                  <div
                    className="absolute right-0 z-50 mt-1 w-72 rounded-md py-1 shadow-lg max-h-70 overflow-y-auto"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-custom)',
                    }}
                  >
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          if (!model.available) return
                          setPendingModelId(model.id)
                          setModelDropdownOpen(false)
                        }}
                        className="w-full px-3 py-2 text-left transition-opacity"
                        style={{
                          color: model.available ? 'var(--text-primary)' : 'var(--text-muted)',
                          cursor: model.available ? 'pointer' : 'default',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{model.name}</span>
                          {!model.available && (
                            <span
                              className="text-[10px] rounded px-1.5 py-0.5"
                              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                            >
                              not pulled
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {model.description}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sub-label showing selected agent and model */}
            <p className="text-xs pl-0.5" style={{ color: 'var(--text-muted)' }}>
              via {pendingAgentName} · {pendingModelName}
              {pendingModel && !pendingModel.available && (
                <span style={{ color: 'var(--orange-500, #f97316)' }}> — not pulled</span>
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
