import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '../../components/ui/dropdown-menu'
import { MoreHorizontal, Grid2x2Plus, FolderUp, CircleCheck } from 'lucide-react'
import AssetSidebar from '../../components/pagecomponents/asset-sidebar'
import Header from '../../components/pagecomponents/header'
import ModuleConfiguration from '../../components/pagecomponents/module-configuration'
import { apiClient } from '../../lib/api'

type Step = {
    id: string
    title: string
    content: string
    // support multiple models per step
    models?: Array<{ assetId: string; stepAssetId?: string; metadata?: any }>
    animation?: string
}

export default function CreateModule() {
    const navigate = useNavigate()
    const { moduleName } = useParams<{ moduleName: string }>()
    const [searchParams] = useSearchParams()
    const moduleId = searchParams.get('id')

    const decodedModuleName = moduleName ? decodeURIComponent(moduleName) : 'New Module'

    const [steps, setSteps] = useState<Step[]>([])
    const stepsRef = useRef<Step[]>([])
    const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null)
    const [assets, setAssets] = useState<any[]>([])
    const [multiSelectMode, setMultiSelectMode] = useState(false)
    const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Refs for debounced saves to avoid blocking UI while typing
    const saveTimeoutsRef = useRef<Record<string, number>>({})

    // Load module and assets on mount
    useEffect(() => {
        if (moduleId) {
            loadModule()
        }
    }, [moduleId])

    // keep a ref of the latest steps for background save callbacks
    useEffect(() => {
        stepsRef.current = steps
    }, [steps])

    useEffect(() => {
        // load available assets for assignment
        let mounted = true
        ;(async () => {
            try {
                const list = await apiClient.getAssets()
                if (!mounted) return
                setAssets(list)
            } catch (err) {
                console.warn('Failed to load assets:', err)
            }
        })()
        return () => { mounted = false }
    }, [])

    // Enrich steps with model names when assets OR steps change.
    // Only update steps when a modelName actually differs to avoid loops.
    useEffect(() => {
        if (!assets || assets.length === 0) return
        if (!steps || steps.length === 0) return
        let changed = false
        const next = steps.map((s) => {
            if (!s.model) return s
            const asset = assets.find((a) => a.id === s.model)
            const name = asset ? (asset.name ?? asset.originalFilename ?? '') : ''
            if (name && s.modelName !== name) {
                changed = true
                return { ...s, modelName: name }
            }
            return s
        })
        if (changed) setSteps(next)
    }, [assets, steps])

    const loadModule = async () => {
        if (!moduleId) return
        setIsLoading(true)
        try {
            const module = await apiClient.getModule(moduleId)
            // Transform module steps to local format
            const moduleSteps: Step[] = module.steps.map((step: any) => {
                const assets = (step.step_assets || []).map((sa: any) => ({
                    assetId: sa.asset && (typeof sa.asset === 'string' ? sa.asset : sa.asset.id),
                    stepAssetId: sa.id,
                    metadata: sa.metadata ?? null,
                }))
                return {
                    id: step.id,
                    title: step.title,
                    content: step.body,
                    animation: step.animation ?? undefined,
                    models: assets,
                }
            })
            setSteps(moduleSteps)
        } catch (err) {
            console.error('Failed to load module:', err)
            setError(`Failed to load module: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsLoading(false)
        }
    }

    async function addStep() {
        if (!moduleId) {
            alert('Module not initialized')
            return
        }
        setIsSaving(true)
        try {
            const newStep = await apiClient.createStep(moduleId, `Step ${steps.length + 1}`, 'New step content', false)
            const step: Step = {
                id: newStep.id,
                title: newStep.title,
                content: newStep.body,
                animation: newStep.animation ?? undefined,
            }
            setSteps((prev) => {
                const next = [...prev, step]
                setSelectedStepIndex(next.length - 1)
                return next
            })
        } catch (err) {
            console.error('Failed to add step:', err)
            setError(`Failed to add step: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    function scheduleSave(stepId: string) {
        // clear previous timer
        const prev = saveTimeoutsRef.current[stepId]
        if (prev) window.clearTimeout(prev)
        // schedule a debounced save to backend
        const t = window.setTimeout(async () => {
            const s = stepsRef.current.find((st) => st.id === stepId)
            if (!s) return
                try {
                await apiClient.updateStep(stepId, {
                    title: s.title,
                    body: s.content,
                    animation: (s as any).animation ?? null,
                    required: false,
                })
            } catch (err) {
                console.error('Background save failed for step', stepId, err)
                setError(`Failed to save step: ${err instanceof Error ? err.message : 'Unknown error'}`)
            }
            delete saveTimeoutsRef.current[stepId]
        }, 700)
        saveTimeoutsRef.current[stepId] = t as unknown as number
    }

    function updateStep(index: number, patch: Partial<Step>) {
        const step = steps[index]
        if (!step) return

        // Optimistically update UI immediately
        setSteps((s) => s.map((st, i) => (i === index ? { ...st, ...patch } : st)))

        // Schedule debounced background save using step id
        scheduleSave(step.id)
    }

    async function removeStep(index: number) {
        const step = steps[index]
        if (!step) return

        setIsSaving(true)
        try {
            await apiClient.deleteStep(step.id)
            setSteps((s) => s.filter((_, i) => i !== index))
            setSelectedStepIndex((i) => (i === null ? null : i > index ? i - 1 : i === index ? null : i))
        } catch (err) {
            console.error('Failed to delete step:', err)
            setError(`Failed to delete step: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    async function assignModelToStep(assetId: string) {
        // If multi-select mode active, assign to all selected steps
        const targets = multiSelectMode && multiSelectedIds.length > 0
            ? steps.filter((s) => multiSelectedIds.includes(s.id))
            : (selectedStepIndex === null ? [] : [steps[selectedStepIndex]]).filter(Boolean)

        if (targets.length === 0) {
            alert('Select at least one step to assign this model to.')
            return
        }

        setIsSaving(true)
        try {
            // assign to each target and collect results
            await Promise.all(targets.map(async (t) => {
                const res: any = await apiClient.assignAssetToStep(t.id, assetId, 0, null)
                return { stepId: t.id, res }
            }))

            // update local state for affected steps (append model entry)
            setSteps((prev) => prev.map((s) => {
                if (!targets.find((t) => t.id === s.id)) return s
                const asset = assets.find((a) => a.id === assetId)
                const modelEntry = { assetId, stepAssetId: undefined, metadata: null }
                const nextModels = Array.isArray(s.models) ? [...s.models, modelEntry] : [modelEntry]
                return { ...s, models: nextModels }
            }))

            // exit multi-select mode after assign
            if (multiSelectMode) {
                setMultiSelectMode(false)
                setMultiSelectedIds([])
            }
        } catch (err) {
            console.error('Failed to assign asset:', err)
            setError(`Failed to assign asset: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    // Unassign a specific model from a step by stepAssetId (server) or assetId (local-only)
    async function unassignModel(index: number, assetId?: string, stepAssetId?: string) {
        const step = steps[index]
        if (!step) return
        // If no server id, just remove locally
        if (!stepAssetId) {
            const nextModels = (step.models || []).filter((m) => m.assetId !== assetId)
            updateStep(index, { models: nextModels })
            return
        }
        setIsSaving(true)
        try {
            await apiClient.deleteStepAsset(stepAssetId)
            const nextModels = (step.models || []).filter((m) => m.stepAssetId !== stepAssetId)
            updateStep(index, { models: nextModels })
        } catch (err) {
            console.error('Failed to unassign asset:', err)
            setError(`Failed to unassign asset: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    async function handlePublish() {
        if (!moduleId) {
            alert('Module not initialized')
            return
        }
        if (steps.length === 0) {
            alert('Add at least one step before publishing')
            return
        }

        setIsSaving(true)
        try {
            const published = await apiClient.publishModule(moduleId)
            alert(`Module published successfully (v${published.version})`)
            navigate('/develop')
        } catch (err) {
            console.error('Failed to publish:', err)
            setError(`Failed to publish: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-muted-foreground">Loading module...</div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="overflow-hidden h-screen">
                <div className="grid grid-rows-[auto_1fr] grid-cols-1 lg:grid-cols-12 h-screen">
                    <Header title={`Module Workspace: ${decodedModuleName}`} onBack={() => navigate('/develop')} />

                    <div className="col-span-1 lg:col-span-9 pl-2 py-2 overflow-hidden">
                        <div className="h-full rounded-lg border border-border bg-background flex flex-col overflow-hidden">
                            <div className="px-4 pt-4 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-foreground">Configure Module</h3>
                                    <div className="flex gap-2">
                                            <Button size="sm" onClick={addStep} disabled={isSaving} className="flex items-center gap-2">
                                                <Grid2x2Plus className="w-4 h-4" />
                                                <span>Add Step</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant={multiSelectMode ? 'secondary' : 'outline'}
                                                onClick={() => {
                                                    const next = !multiSelectMode
                                                    setMultiSelectMode(next)
                                                    if (!next) {
                                                        setMultiSelectedIds([])
                                                    } else {
                                                        setSelectedStepIndex(null)
                                                    }
                                                }}
                                                className="flex items-center gap-2"
                                            >
                                                <CircleCheck className="w-4 h-4" />
                                                <span>{multiSelectMode ? 'Exit Multi Select' : 'Multi Select'}</span>
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon-sm" variant="ghost" title="More">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent sideOffset={6} align="end">
                                                    <DropdownMenuItem onSelect={() => handlePublish()}>
                                                        <div className="flex items-center gap-2">
                                                            <FolderUp className="w-4 h-4" />
                                                            <span>Publish</span>
                                                        </div>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                </div>
                                {error && (
                                    <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto px-4">
                                <ModuleConfiguration
                                    steps={steps}
                                    selectedIndex={selectedStepIndex}
                                    onSelect={(i) => {
                                        // Navigate to single-step editor page
                                        const s = steps[i]
                                        if (!s || !moduleId) return
                                        navigate(`/develop/configure-step?moduleId=${moduleId}&stepId=${s.id}&index=${i}&moduleName=${encodeURIComponent(decodedModuleName)}`)
                                    }}
                                    onUpdate={updateStep}
                                    onUnassign={unassignModel}
                                    onRemove={removeStep}
                                    isSaving={isSaving}
                                    assets={assets}
                                    multiSelectMode={multiSelectMode}
                                    multiSelectedIds={multiSelectedIds}
                                    onToggleSelect={(i) => {
                                        const id = steps[i]?.id
                                        if (!id) return
                                        setMultiSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1 lg:col-span-3 p-2 bg-background overflow-hidden">
                        <div className="h-full">
                            <AssetSidebar
                                models={assets}
                                onAssignModel={assignModelToStep}
                                showAssign={true}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}