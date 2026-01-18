import { X, Box, Play, ChevronDown } from 'lucide-react'
import React, { useEffect, useState, useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'

type ModelContainer = {
  stepAssetId?: string
  model?: string
  modelName?: string
  animation?: string
}

type Step = {
  id: string
  title: string
  content: string
  models?: ModelContainer[]
  model?: string
  modelName?: string
  animation?: string
}

interface StepConfigurationProps {
  steps?: Step[]
  selectedIndex?: number | null
  onSelect?: (index: number) => void
  onUpdate?: (index: number, patch: Partial<Step>) => void
  onUnassign?: (index: number, containerIndex?: number) => void
  onAnimationUpdate?: (containerIndex: number, animation: string) => void
  onRemove?: (index: number) => void
  indexOffset?: number
  centerSingle?: boolean
  isSaving?: boolean
  assets?: Array<{ id: string; name?: string; originalFilename?: string; metadata?: any }>
}

export default function StepConfiguration({ steps = [], selectedIndex = null, onSelect, onUpdate, onUnassign, onAnimationUpdate, onRemove, indexOffset = 0, centerSingle = false, isSaving = false, assets = [] }: StepConfigurationProps) {
  const selectedStep = selectedIndex === null ? null : steps[selectedIndex]
  const cardFillClass = centerSingle ? 'w-full' : ''

  // Local state for textarea content to avoid focus loss during typing
  const [localContent, setLocalContent] = useState<{ [key: string]: string }>(() => {
    const initial: { [key: string]: string } = {}
    steps.forEach((step) => {
      initial[step.id] = step.content
    })
    return initial
  })
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const initializedSteps = useRef<Set<string>>(new Set())
  const processedModels = useRef<Set<string>>(new Set())

  // Only sync new steps that haven't been initialized yet
  useEffect(() => {
    steps.forEach((step) => {
      if (!initializedSteps.current.has(step.id)) {
        initializedSteps.current.add(step.id)
        setLocalContent((prev) => ({
          ...prev,
          [step.id]: step.content
        }))
      }
    })
  }, [steps])

  const handleContentChange = (stepId: string, idx: number, value: string) => {
    // Update local state immediately for responsive typing
    setLocalContent((prev) => ({ ...prev, [stepId]: value }))

    // Clear existing timer
    if (debounceTimers.current[stepId]) {
      clearTimeout(debounceTimers.current[stepId])
    }

    // Debounce the parent update
    debounceTimers.current[stepId] = setTimeout(() => {
      onUpdate && onUpdate(idx, { content: value })
    }, 800)
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // When a model with animations is assigned, auto-select first animation if not set yet
  // Only run this once per model to avoid overwriting saved animations on refresh
  useEffect(() => {
    if (!onAnimationUpdate) return
    if (!steps || steps.length === 0) return
    if (!assets || assets.length === 0) return

    steps.forEach((step, idx) => {
      if (!step || !step.models) return
      step.models.forEach((model, mIdx) => {
        if (!model || !model.model) return
        
        // Create unique key for this model assignment
        const modelKey = `${step.id}-${model.model}`
        
        // Skip if already processed
        if (processedModels.current.has(modelKey)) return
        
        const asset = assets.find((a) => a.id === model.model)
        const animations = asset?.metadata?.animations || []
        
        // Only auto-select if there are animations and no animation is set
        if (animations.length > 0 && !model.animation) {
          processedModels.current.add(modelKey)
          onAnimationUpdate(mIdx, animations[0].name || '')
        } else if (model.animation || animations.length === 0) {
          // Mark as processed even if animation already exists or no animations available
          processedModels.current.add(modelKey)
        }
      })
    })
  }, [steps, assets, onAnimationUpdate])

  return (
    <div className="mb-6">
      <div className="mt-4">
        {steps.length === 0 ? (
          <div className="p-6 bg-card text-card-foreground rounded-lg border border-dashed text-center text-muted-foreground">No steps yet. Click "Add Step" to begin.</div>
        ) : (
          <div className={`${(steps.length === 1 && centerSingle) ? 'flex flex-col items-center gap-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3'}`}>
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div
                  // card has its own key but fragment needs the unique key for the list

                  className={`${cardFillClass} bg-card text-card-foreground rounded-lg px-3 pt-3 pb-2 border border-border hover:shadow-md transition-shadow cursor-pointer ${selectedIndex === idx ? 'shadow-sm' : ''}`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement | null
                    if (target && target.closest('input, textarea, button, select, a')) return
                    onSelect && onSelect(idx)
                  }}
                >
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-foreground">{(() => {
                          const t = step.title && step.title.trim() ? step.title.trim() : ''
                          const isAuto = /^Step\s+\d+$/i.test(t)
                          const displayIndex = idx + 1 + (indexOffset || 0)
                          return t && !isAuto ? t : `Step ${displayIndex}`
                        })()}</div>

                        {/* deletion handled in module page; no action here */}
                      </div>

                      <textarea
                        value={localContent[step.id] ?? step.content}
                        onChange={(e) => handleContentChange(step.id, idx, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="type step content here..."
                        className="w-full p-4 mt-3 bg-muted/60 text-foreground placeholder:text-muted-foreground min-h-[300px] resize-none text-sm rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Render model/animation containers (support multiple models per step) */}
                <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {(() => {
                    const containers = step.models && step.models.length > 0 ? step.models : (step.model ? [{ model: step.model, modelName: step.modelName, animation: step.animation, stepAssetId: step.stepAssetId }] : [])
                    return containers.length === 0 ? (
                      <div className="w-64 bg-card rounded-md overflow-hidden flex items-center justify-center text-xs text-muted-foreground p-2 border border-dashed border-border/30">
                        <div className="text-center">
                          <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-md mx-auto mb-3">
                            <Box className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="text-sm font-semibold text-foreground mb-1">No 3D model assigned</div>
                          <div className="text-xs text-muted-foreground mb-3">Assign a .glb/.gltf model from the Asset Manager</div>
                        </div>
                      </div>
                    ) : (
                      containers.map((container, cIdx) => (
                        <div key={cIdx} className="w-64 bg-card rounded-md overflow-hidden flex items-center justify-center text-xs text-muted-foreground p-2 border border-dashed border-border/30">
                          {container.model ? (
                            <div className="w-full h-full flex flex-col justify-between">
                              <div className="flex items-center gap-4 w-full bg-muted rounded-md">
                                <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-md">
                                  <Box className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="text-left ml-0.5">
                                  <div className="font-semibold text-foreground">{container.modelName ?? container.model}</div>
                                </div>
                                <div className="ml-auto">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (onUnassign) return onUnassign(idx, cIdx)
                                    }}
                                    variant="ghost"
                                    size="icon-sm"
                                    title="Unassign model"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-2 flex items-center gap-3 w-full bg-muted rounded-md">
                                {(() => {
                                  const asset = (assets || []).find((a) => a.id === container.model)
                                  const animations = asset?.metadata?.animations || []
                                  return (
                                    <div className="flex items-center gap-3 w-full">
                                      <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-md">
                                        <Play className="w-4 h-4 text-muted-foreground ml-2" />
                                      </div>
                                      <div className="text-left w-full">
                                        {animations.length === 0 ? (
                                          <div className="pl-2 text-xs text-muted-foreground">no animation</div>
                                        ) : (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button onClick={(e) => e.stopPropagation()} variant="ghost" size="sm" className="w-full justify-between px-2 hover:bg-accent/5">
                                                <div className="flex items-center">
                                                  <span className="text-xs text-left">{container.animation || '(none)'}</span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                              </Button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent sideOffset={6} align="start">
                                              <DropdownMenuItem onSelect={() => { onAnimationUpdate && onAnimationUpdate(cIdx, '') }}>
                                                (none)
                                              </DropdownMenuItem>
                                              {animations.map((a: any, i: number) => (
                                                <DropdownMenuItem key={i} onSelect={() => { onAnimationUpdate && onAnimationUpdate(cIdx, a.name) }}>
                                                  {a.name || `clip-${i}`}
                                                </DropdownMenuItem>
                                              ))}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )
                  })()}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
