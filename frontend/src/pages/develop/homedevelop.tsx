import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '../../components/ui/dialog'
import AssetSidebar from '../../components/pagecomponents/asset-sidebar'
import Header from '../../components/pagecomponents/header'

export default function HomeDevelop() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [moduleName, setModuleName] = useState('')

  return (
    <main className="min-h-screen bg-background">
      <div>
        <section className="overflow-hidden h-screen">
          <div className="grid grid-rows-[auto_1fr] grid-cols-1 lg:grid-cols-12 h-screen">
            {/* Header spanning full width */}
            <Header title="Development WorkSpace" onBack={() => navigate('/')} />

            {/* Content area: left develop space, right asset sidebar */}
            <div className="col-span-1 lg:col-span-9 pl-2 py-2 overflow-hidden">
              <div className="h-full rounded-lg border border-border bg-background flex flex-col overflow-hidden">
                <div className="p-3 flex items-center justify-between border-b border-border flex-shrink-0">
                  <h3 className="text-lg font-medium text-foreground">Training Modules</h3>
                  <div>
                    <Dialog open={open} onOpenChange={setOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="px-4 py-2">Create Module</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Module</DialogTitle>
                          <DialogDescription>Enter a name for the new module.</DialogDescription>
                        </DialogHeader>

                        <div className="pt-2">
                          <label className="text-sm text-muted-foreground">Module name</label>
                          <input
                            value={moduleName}
                            onChange={(e) => setModuleName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (moduleName.trim()) {
                                  navigate(`createmodule/${encodeURIComponent(moduleName.trim())}`)
                                  setOpen(false)
                                  setModuleName('')
                                }
                              }
                            }}
                            className="mt-2 w-full rounded border border-border px-2 py-1 bg-input text-foreground"
                            aria-label="Module name"
                            autoFocus
                          />
                        </div>

                        <DialogFooter>
                          <Button variant="secondary" onClick={() => { setOpen(false); setModuleName('') }}>
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              if (moduleName && moduleName.trim()) {
                                navigate(`createmodule/${encodeURIComponent(moduleName.trim())}`)
                                setOpen(false)
                                setModuleName('')
                              }
                            }}
                            className="px-4 py-2"
                          >
                            Create
                          </Button>
                        </DialogFooter>
                        <DialogClose />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center overflow-y-auto">
                  <div className="text-muted-foreground">Develop space</div>
                </div>
              </div>
            </div>

            <div className="col-span-1 lg:col-span-3 p-2 bg-background overflow-hidden">
              <div className="h-full">
                <AssetSidebar
                  models={models}
                  showAssign={false}
                  onDelete={(id) => {
                    console.log('Deleted model:', id)
                  }}
                  onUpload={(files) => {
                    const list = Array.from(files as FileList)
                    console.log('Uploaded files:', list.map((f) => f.name))
                    // TODO: implement actual upload logic (API, storage, etc.)
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

// Simple sample models for the sidebar (could be fetched from API)
const models = [
  { id: 'mdl-001', name: 'Robot Arm', uploadedAt: '2026-01-10T14:30:00Z' },
  { id: 'mdl-002', name: 'Office Desk', uploadedAt: '2026-01-12T09:15:00Z' },
  { id: 'mdl-003', name: 'Plant Sansevieria', uploadedAt: '2026-01-13T16:45:00Z' },
]
