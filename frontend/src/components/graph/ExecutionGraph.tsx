'use client'

import '@xyflow/react/dist/style.css'

import { useState, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
  type NodeTypes,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import { StepNode, type StepNodeData } from './StepNode'
import { StepDetailPanel } from './StepDetailPanel'
import type { TraceStep } from '@/types'

// Defined at module scope to prevent React Flow re-initialisation on every render
const nodeTypes: NodeTypes = { stepNode: StepNode }

interface ExecutionGraphProps {
  steps: TraceStep[]
}

function ExecutionGraphInner({ steps }: ExecutionGraphProps) {
  const { fitView } = useReactFlow()
  const [selectedStep, setSelectedStep] = useState<TraceStep | null>(null)

  const nodes: Node<StepNodeData>[] = steps.map((step, index) => ({
    id: step.id,
    type: 'stepNode',
    position: { x: 0, y: index * 140 },
    data: { step, selected: selectedStep?.id === step.id },
  }))

  const edges: Edge[] = steps.slice(0, -1).map((step, i) => ({
    id: `edge-${i}`,
    source: step.id,
    target: steps[i + 1].id,
    type: 'smoothstep',
    style: { stroke: '#1e1e2e', strokeWidth: 2 },
  }))

  // fitView after steps change — 50ms delay because RF processes positions async
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50)
    return () => clearTimeout(t)
  }, [steps, fitView])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const step = (node.data as StepNodeData).step
      setSelectedStep((prev) => (prev?.id === step.id ? null : step))
    },
    []
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnDrag
      zoomOnScroll
      fitView
    >
      <Background variant={BackgroundVariant.Dots} color="#1e1e2e" gap={20} />
      <Controls
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-custom)',
          borderRadius: 8,
        }}
      />
      <StepDetailPanel step={selectedStep} onClose={() => setSelectedStep(null)} />
    </ReactFlow>
  )
}

export function ExecutionGraph({ steps }: ExecutionGraphProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '65vh',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-custom)',
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ReactFlowProvider>
        <ExecutionGraphInner steps={steps} />
      </ReactFlowProvider>
    </div>
  )
}
