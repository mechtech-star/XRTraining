import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
import { apiClient } from '../../lib/api'

interface Asset {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: string
}

export default function HomeDevelop() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [moduleName, setModuleName] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    // Load assets on mount
    let mounted = true
    ;(async () => {
      try {
        const list = await apiClient.getAssets()
        if (!mounted) return
        setAssets(list)
      } catch (err) {
        console.warn('Failed to fetch assets:', err)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleCreateModule = async (name: string) => {
    try {
      const newModule = await apiClient.createModule(name)
      navigate(`/develop/createmodule/${encodeURIComponent(name)}?id=${newModule.id}`)
      setOpen(false)
      setModuleName('')
    } catch (error) {
      console.error('Failed to create module:', error)
      alert(`Failed to create module: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleAssetUpload = async (files: FileList | File[]) => {
    setUploadError(null)
    const fileList = Array.from(files)
    const gltfFiles = fileList.filter((f) => f.name.endsWith('.glb') || f.name.endsWith('.gltf'))

    if (gltfFiles.length === 0) {
      setUploadError('Only .glb and .gltf files are supported')
      return
    }

    setIsLoadingAssets(true)
    try {
      for (const file of gltfFiles) {
        await apiClient.uploadAsset(file, 'gltf')
      }
      // Reload assets when backend provides list endpoint
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setUploadError(`Upload failed: ${msg}`)
      console.error('Asset upload error:', error)
    } finally {
      setIsLoadingAssets(false)
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    // Backend delete endpoint will be implemented
    console.log('Delete asset:', assetId)
  }

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
                                  handleCreateModule(moduleName.trim())
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
                                handleCreateModule(moduleName.trim())
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
                {uploadError && (
                  <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-sm">
                    {uploadError}
                  </div>
                )}
                <AssetSidebar
                  models={assets}
                  showAssign={false}
                  isLoading={isLoadingAssets}
                  onDelete={handleDeleteAsset}
                  onUpload={handleAssetUpload}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
