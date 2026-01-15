import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import AssetSidebar from '../../components/pagecomponents/asset-sidebar'
import Header from '../../components/pagecomponents/header'
import StepConfiguration from '../../components/pagecomponents/step-configuration'
import { apiClient } from '../../lib/api'

type Step = {
    id: string
    title: string
    content: string
    model?: string
}

export default function CreateModule() {
    const navigate = useNavigate()
    const { moduleName } = useParams<{ moduleName: string }>()
    const [searchParams] = useSearchParams()
    const moduleId = searchParams.get('id')

    const decodedModuleName = moduleName ? decodeURIComponent(moduleName) : 'New Module'

    const [steps, setSteps] = useState<Step[]>([])
    const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null)
    const [assets, setAssets] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load module and assets on mount
    useEffect(() => {
        if (moduleId) {
            loadModule()
        }
    }, [moduleId])

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

    const loadModule = async () => {
        if (!moduleId) return
        setIsLoading(true)
        try {
            const module = await apiClient.getModule(moduleId)
            // Transform module steps to local format
            const moduleSteps: Step[] = module.steps.map((step: any) => ({
                id: step.id,
                title: step.title,
                content: step.body,
                model: step.step_assets?.[0]?.asset?.id,
            }))
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
            const newStep = await apiClient.createStep(moduleId, `Step ${steps.length + 1}`, '', false)
            const step: Step = {
                id: newStep.id,
                title: newStep.title,
                content: newStep.body,
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

    async function updateStep(index: number, patch: Partial<Step>) {
        const step = steps[index]
        if (!step) return

        setIsSaving(true)
        try {
            await apiClient.updateStep(step.id, {
                title: patch.title || step.title,
                body: patch.content || step.content,
                required: false,
            })
            setSteps((s) => s.map((st, i) => (i === index ? { ...st, ...patch } : st)))
        } catch (err) {
            console.error('Failed to update step:', err)
            setError(`Failed to update step: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
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
        if (selectedStepIndex === null) {
            alert('Select a step to assign this model to (click a step on the left).')
            return
        }
        const step = steps[selectedStepIndex]
        if (!step) return

        setIsSaving(true)
        try {
            await apiClient.assignAssetToStep(step.id, assetId, 0)
            updateStep(selectedStepIndex, { model: assetId })
        } catch (err) {
            console.error('Failed to assign asset:', err)
            setError(`Failed to assign asset: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
                                    <h3 className="text-lg font-semibold text-foreground">Configure Steps</h3>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={addStep} disabled={isSaving}>
                                            Add Step
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={handlePublish} disabled={isSaving || steps.length === 0}>
                                            Publish
                                        </Button>
                                    </div>
                                </div>
                                {error && (
                                    <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto px-4">
                                <StepConfiguration
                                    steps={steps}
                                    selectedIndex={selectedStepIndex}
                                    onSelect={(i) => setSelectedStepIndex(i)}
                                    onUpdate={updateStep}
                                    onRemove={removeStep}
                                    isSaving={isSaving}
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