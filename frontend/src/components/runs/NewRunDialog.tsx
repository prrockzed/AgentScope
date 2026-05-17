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
import { useDefaultAgent } from '@/hooks/useDefaultAgent'

export function NewRunDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [task, setTask] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { mutate, isPending } = useCreateRun()
  const { data: agents = [] } = useAgents()
  const { agentId, setDefault } = useDefaultAgent()

  const defaultAgent = agents.find((a) => a.id === agentId)
  const defaultAgentName = defaultAgent?.name ?? 'Tool Agent'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function submit(selectedAgentType: string) {
    if (!task.trim()) return
    mutate(
      { task: task.trim(), agentType: selectedAgentType },
      {
        onSuccess: (newRun) => {
          setOpen(false)
          setTask('')
          setDropdownOpen(false)
          router.push(`/runs/${newRun.id}`)
        },
      },
    )
  }

  function handleSubmit() {
    submit(agentId)
  }

  function handleRunAs(agentType: string) {
    setDropdownOpen(false)
    submit(agentType)
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
              <div className="relative" ref={dropdownRef}>
                <Button
                  onClick={() => setDropdownOpen((v) => !v)}
                  disabled={isPending || !task.trim()}
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

                {dropdownOpen && (
                  <div
                    className="absolute right-0 z-50 mt-1 w-72 rounded-md py-1 shadow-lg"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-custom)',
                    }}
                  >
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleRunAs(agent.id)}
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
            </div>

            {/* Sub-label showing default agent */}
            <p className="text-xs pl-0.5" style={{ color: 'var(--text-muted)' }}>
              via {defaultAgentName}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
