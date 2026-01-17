import { Trash2, MoreHorizontal, X, Box } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu'
import { Button } from '../ui/button'

type Step = {
  id: string
  title: string
  content: string
  model?: string
  modelName?: string
  animation?: string
}

interface StepCardProps {
  step: Step
  index: number
  indexOffset?: number
  selected?: boolean
  onSelect?: (index: number) => void
  onUpdate?: (index: number, patch: Partial<Step>) => void
  onUnassign?: (index: number) => void
  onRemove?: (index: number) => void
  isSaving?: boolean
  assets?: Array<{ id: string; name?: string; originalFilename?: string; metadata?: any }>
  multiSelectMode?: boolean
  isMultiSelected?: boolean
  onToggleSelect?: (index: number) => void
}

export default function StepCard(props: StepCardProps) {
  const { step, index, indexOffset = 0, selected = false, onSelect, onUpdate, onUnassign, onRemove, isSaving = false, assets = [], multiSelectMode = false, isMultiSelected = false, onToggleSelect } = props
  const displayIndex = index + 1 + (indexOffset || 0)

  const handleClick = (e: any) => {
    const target = e.target as HTMLElement | null
    if (target && target.closest('input, textarea, button, select, a')) return
    if (multiSelectMode) {
      onToggleSelect && onToggleSelect(index)
      return
    }
    onSelect && onSelect(index)
  }

  return (
    <div className="relative">
      <div
        className={`bg-card h-64 text-card-foreground rounded-lg p-4 border border-border hover:shadow-md transition-shadow cursor-pointer ${selected ? 'shadow-sm' : ''}`}
        onClick={handleClick}
      >
        {multiSelectMode && (
          <input
            type="checkbox"
            checked={isMultiSelected}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelect && onToggleSelect(index)
            }}
            className="absolute left-3 top-3 w-4 h-4"
          />
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">
              {(step.title && step.title.trim()) ? step.title.trim() : `Step ${displayIndex}`}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button onClick={(e) => e.stopPropagation()} variant="ghost" size="icon-sm" title="More">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent sideOffset={6} align="end">
                <DropdownMenuItem
                  onSelect={() => onRemove && onRemove(index)}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <span className="text-destructive">Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="text-xs text-muted-foreground line-clamp-6 whitespace-pre-wrap break-words">
            {step.content || 'No content yet.'}
          </div>

          <div className="absolute left-4 right-4 bottom-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-md">
                <Box className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">{(step as any).modelName ?? step.model ?? '3D Model'}</div>
              </div>
              {step.model && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onUnassign) return onUnassign(index)
                    onUpdate && onUpdate(index, { model: undefined })
                  }}
                  variant="ghost"
                  size="icon-sm"
                  title="Unassign model"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
