'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
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

export function NewRunDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [task, setTask] = useState('')
  const { mutate, isPending } = useCreateRun()

  function handleSubmit() {
    if (!task.trim()) return
    mutate(task.trim(), {
      onSuccess: (newRun) => {
        setOpen(false)
        setTask('')
        router.push(`/runs/${newRun.id}`)
      },
    })
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
          <Button
            onClick={handleSubmit}
            disabled={isPending || !task.trim()}
            className="w-full"
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
