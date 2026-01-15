import { Trash2, MoreHorizontal, X, Box } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'

type Step = {
  id: string
  title: string
  content: string
  model?: string
}

interface StepConfigurationProps {
  steps?: Step[]
  selectedIndex?: number | null
  onSelect?: (index: number) => void
  onUpdate?: (index: number, patch: Partial<Step>) => void
  onRemove?: (index: number) => void
}

export default function StepConfiguration({ steps = [], selectedIndex = null, onSelect, onUpdate, onRemove }: StepConfigurationProps) {
  const selectedStep = selectedIndex === null ? null : steps[selectedIndex]

  return (
    <div className="mb-6">
      <div className="mt-4">
        {steps.length === 0 ? (
          <div className="p-6 bg-card text-card-foreground rounded-lg border border-dashed text-center text-muted-foreground">No steps yet. Click "Add Step" to begin.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`bg-card text-card-foreground rounded-lg p-4 border ${selectedIndex === idx ? 'ring-1 ring-ring shadow-sm border-border' : 'border-border'} hover:shadow-md transition-shadow cursor-pointer`}
                onClick={() => onSelect && onSelect(idx)}
              >
                <div className="flex gap-4">

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground">{step.title && step.title.trim() ? step.title : `Step ${idx + 1}`}</div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            onClick={(e) => e.stopPropagation()}
                            variant="ghost"
                            size="icon-sm"
                            title="More"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent sideOffset={6} align="end">
                          <DropdownMenuItem onSelect={() => onRemove && onRemove(idx)}>
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <textarea
                      value={step.content}
                      onChange={(e) => onUpdate && onUpdate(idx, { content: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="type step content here..."
                      className="w-full p-3 mt-2 border rounded-md bg-transparent text-foreground placeholder:text-muted-foreground min-h-[160px] resize-none text-xs"
                    />

                    <div className="mt-3 flex items-start text-sm text-muted-foreground">
                      <div className="flex-shrink-0 w-full h-10 bg-muted rounded-md overflow-hidden flex items-center justify-between text-xs text-muted-foreground px-2">
                        {step.model ? (
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-md">
                              <Box className="w-4 h-4 text-muted-foreground" />
                            </div>

                            <div className="text-left">
                              <div className="font-medium text-foreground">{step.model}</div>
                            </div>

                            <div className="ml-auto">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onUpdate && onUpdate(idx, { model: undefined })
                                }}
                                variant="ghost"
                                size="icon-sm"
                                title="Unassign model"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0 w-full">
                            <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-md">
                              <Box className="w-4 h-4 text-muted-foreground" />
                            </div>

                            <div className="text-left">
                              <div className="font-medium text-foreground">3D Model</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
