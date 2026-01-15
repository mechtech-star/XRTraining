import { Button } from '../ui/button'
import { useState, useRef, useCallback } from 'react'
import { Trash2, MoreHorizontal, UploadCloud, Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '../ui/input-group'

type Model = {
  id: string
  name: string
  uploadedAt?: string
}

type Step = {
  id: string
  title: string
  content: string
  model?: string
}

interface AssetSidebarProps {
  models: Model[]
  onAssignModel?: (modelId: string) => void
  onDelete?: (modelId: string) => void
  onUpload?: (files: FileList | File[]) => void
  showAssign?: boolean
}

export default function AssetSidebar({ models, onAssignModel, onDelete, onUpload, showAssign = true }: AssetSidebarProps) {
  function formatUploaded(dateStr?: string) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString()
  }
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const onTriggerUpload = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    if (typeof (onUpload) === 'function') onUpload(files)
  }, [onUpload])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }
  return (
    <aside className="col-span-4 h-full rounded-lg bg-card border flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="text-card-foreground rounded-lg p-2">
          <div className="flex flex-col p-3 pb-6 pt-4 border-b sticky top-0 bg-card/80 backdrop-blur-md z-10">
            <header>
              <h2 className="font-semibold text-foreground text-lg">Asset Manager</h2>
            </header>
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <InputGroup className="flex-1">
                <InputGroupAddon>
                  <Search className="w-4 h-4" />
                </InputGroupAddon>
                <InputGroupInput
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search models..."
                />
              </InputGroup>
            </div>
            <div
              className={`mb-3 w-full aspect-[2/1] flex flex-col items-center justify-center p-4 rounded-md overflow-hidden transition-all cursor-pointer border-2 border-dashed ${isDragging ? 'border-accent/80 bg-accent/10 shadow-md' : 'border-border bg-gradient-to-b from-transparent to-accent/3 hover:shadow-sm'} `}
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              aria-label="Upload 3D models"
            >
              <div className="flex-1 flex flex-col items-center justify-center gap-3 w-full px-4">
                <div className="text-sm font-medium text-foreground text-center">Drop .glb or .gltf files here</div>
                <div className="text-xs text-muted-foreground text-center">or click Upload</div>

                <div className="mt-2">
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onTriggerUpload() }} className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4" />
                    Upload
                  </Button>
                </div>

                <input ref={inputRef} type="file" accept=".glb,.gltf" multiple onChange={handleInputChange} style={{ display: 'none' }} />
              </div>
            </div>

            <div className="space-y-2">
              {models
                .filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-transparent hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors"
                  >
                    <div>
                      <div className="font-sans font-semibold text-sm text-foreground">{m.name}</div>
                      <div className="text-sm text-muted-foreground">Uploaded: {formatUploaded(m.uploadedAt)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {showAssign ? (
                        <Button size="sm" variant="secondary" onClick={() => onAssignModel && onAssignModel(m.id)}>Assign</Button>
                      ) : (
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
                            <DropdownMenuItem onSelect={() => onDelete && onDelete(m.id)}>
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
