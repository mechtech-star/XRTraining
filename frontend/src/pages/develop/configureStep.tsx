import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import AssetSidebar from '../../components/pagecomponents/asset-sidebar'
import Header from '../../components/pagecomponents/header'
import StepConfiguration from '../../components/pagecomponents/step-configuration'
import { apiClient } from '../../lib/api'

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
    // Legacy single model support
    model?: string
    modelName?: string
    stepAssetId?: string
    animation?: string
}

export default function ConfigureStep() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const moduleId = searchParams.get('moduleId')
    const stepId = searchParams.get('stepId')
    const moduleName = searchParams.get('moduleName') ?? 'Module'
    const indexParam = parseInt(searchParams.get('index') ?? '0', 10) || 0

    const [step, setStep] = useState<Step | null>(null)
    const [moduleSteps, setModuleSteps] = useState<any[] | null>(null)
    const [assets, setAssets] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
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

    useEffect(() => {
        if (!moduleId || !stepId) return
        setIsLoading(true)
        ;(async () => {
            try {
                const module = await apiClient.getModule(moduleId)
                setModuleSteps(module.steps || [])
                const found = module.steps.find((s: any) => s.id === stepId)
                if (!found) {
                    setError('Step not found')
                    return
                }
                const assetEntry = found.step_assets?.[0]
                const assetField = assetEntry?.asset
                const assetId = assetField && (typeof assetField === 'string' ? assetField : assetField.id)
                const stepAssetId = assetEntry?.id
                
                // Build models array from all step_assets (support multiple models per step)
                const models: ModelContainer[] = (found.step_assets || []).map((sa: any) => {
                    const aField = sa.asset
                    const aId = aField && (typeof aField === 'string' ? aField : aField.id)
                    return {
                        stepAssetId: sa.id,
                        model: aId,
                        animation: sa.metadata?.animation,
                    }
                })
                
                const s: Step = {
                    id: found.id,
                    title: found.title,
                    content: found.body,
                    animation: found.animation ?? undefined,
                    models: models.length > 0 ? models : undefined,
                    // Legacy fields for backward compatibility
                    model: assetId,
                    modelName: undefined,
                    stepAssetId,
                }
                setStep(s)
            } catch (err) {
                console.error('Failed to load step:', err)
                setError(`Failed to load step: ${err instanceof Error ? err.message : 'Unknown error'}`)
            } finally {
                setIsLoading(false)
            }
        })()
    }, [moduleId, stepId])

    function goToNeighbor(delta: number) {
        if (!moduleSteps || moduleSteps.length === 0 || !step) return
        const currentIndex = moduleSteps.findIndex((s) => s.id === step.id)
        if (currentIndex === -1) return
        const newIndex = currentIndex + delta
        if (newIndex < 0 || newIndex >= moduleSteps.length) return
        const next = moduleSteps[newIndex]
        navigate(`/develop/configure-step?moduleId=${moduleId}&stepId=${next.id}&index=${newIndex}&moduleName=${encodeURIComponent(moduleName)}`)
    }

    useEffect(() => {
        if (!assets || assets.length === 0) return
        if (!step) return
        
        // Update model names for all models in the step
        if (step.models && step.models.length > 0) {
            const updated = step.models.map(m => {
                if (!m.model || m.modelName) return m
                const asset = assets.find((a) => a.id === m.model)
                const name = asset ? (asset.name ?? asset.originalFilename ?? '') : ''
                return { ...m, modelName: name }
            })
            if (JSON.stringify(updated) !== JSON.stringify(step.models)) {
                setStep(s => s ? { ...s, models: updated } : s)
            }
        } else if (!step.models && step.model) {
            // Legacy single model support
            const asset = assets.find((a) => a.id === step.model)
            const name = asset ? (asset.name ?? asset.originalFilename ?? '') : ''
            if (name && step.modelName !== name) setStep((s) => s ? { ...s, modelName: name } : s)
        }
    }, [assets, step])

    async function updateStep(_index: number, patch: Partial<Step>) {
        if (!step) return
        
        setIsSaving(true)
        try {
            await apiClient.updateStep(step.id, {
                title: patch.title ?? step.title,
                body: patch.content ?? step.content,
                animation: patch.animation ?? step.animation ?? null,
                required: false,
            })
            // Only update state after successful save
            setStep((prev) => prev ? { ...prev, ...patch } : prev)
        } catch (err) {
            console.error('Failed to save step:', err)
            setError(`Failed to save step: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    async function assignModelToStep(assetId: string) {
        if (!step) return
        setIsSaving(true)
        try {
            // Assign asset with metadata support for animation (will be set separately)
            const res: any = await apiClient.assignAssetToStep(step.id, assetId, 0, { animation: undefined })
            const asset = assets.find((a) => a.id === assetId)
            const modelName = asset ? (asset.name ?? asset.originalFilename ?? '') : undefined
            
            // Add to models array or create if doesn't exist
            const newModel: ModelContainer = { 
                model: assetId, 
                modelName, 
                stepAssetId: res?.id,
                animation: undefined 
            }
            const updated = step.models ? [...step.models, newModel] : [newModel]
            setStep(prev => prev ? { ...prev, models: updated } : prev)
        } catch (err) {
            console.error('Failed to assign asset:', err)
            setError(`Failed to assign asset: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    async function unassignModel(_index: number, containerIndex?: number) {
        if (!step) return
        
        if (step.models && containerIndex !== undefined) {
            // Unassign from models array
            const container = step.models[containerIndex]
            if (container?.stepAssetId) {
                setIsSaving(true)
                try {
                    await apiClient.deleteStepAsset(container.stepAssetId)
                    setStep(prev => {
                        if (!prev || !prev.models) return prev
                        return { ...prev, models: prev.models.filter((_, i) => i !== containerIndex) }
                    })
                } catch (err) {
                    console.error('Failed to unassign asset:', err)
                    setError(`Failed to unassign asset: ${err instanceof Error ? err.message : 'Unknown error'}`)
                } finally {
                    setIsSaving(false)
                }
            }
        } else if (step.stepAssetId) {
            // Legacy single model unassign
            setIsSaving(true)
            try {
                await apiClient.deleteStepAsset(step.stepAssetId)
                setStep({ ...step, model: undefined, modelName: undefined, stepAssetId: undefined, animation: undefined })
            } catch (err) {
                console.error('Failed to unassign asset:', err)
                setError(`Failed to unassign asset: ${err instanceof Error ? err.message : 'Unknown error'}`)
            } finally {
                setIsSaving(false)
            }
        } else {
            setStep({ ...step, model: undefined, modelName: undefined, stepAssetId: undefined, animation: undefined })
        }
    }

    async function updateModelAnimation(containerIndex: number, animation: string) {
        if (!step || !step.models || !step.models[containerIndex]) return
        const container = step.models[containerIndex]
        if (!container.stepAssetId) return
        
        setIsSaving(true)
        try {
            // Update the step asset metadata with animation via API client
            await apiClient.updateStepAssetMetadata(container.stepAssetId, { animation: animation || null })
            
            // Update local state
            setStep(prev => {
                if (!prev || !prev.models) return prev
                const updated = [...prev.models]
                updated[containerIndex] = { ...updated[containerIndex], animation }
                return { ...prev, models: updated }
            })
        } catch (err) {
            console.error('Failed to update animation:', err)
            setError(`Failed to update animation: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading || !step) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-muted-foreground">Loading step...</div>
            </main>
        )
    }

    function goBackToModule() {
        if (moduleId) {
            navigate(`/develop/createmodule/${encodeURIComponent(moduleName)}?id=${moduleId}`)
            return
        }
        navigate('/develop')
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="overflow-hidden h-screen">
                <div className="grid grid-rows-[auto_1fr] grid-cols-1 lg:grid-cols-12 h-screen">
                    <Header title={`Step Workspace: ${moduleName}`} onBack={goBackToModule} />

                    <div className="col-span-1 lg:col-span-9 pl-2 py-2 overflow-hidden">
                        <div className="h-full rounded-lg border border-border bg-background flex flex-col overflow-hidden">
                            <div className="px-4 pt-4 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-foreground">Configure Step</h3>
                                    <div className="flex gap-2 items-center">
                                        <Button size="sm" variant="secondary" onClick={() => goToNeighbor(-1)} disabled={!moduleSteps || !step || (moduleSteps.findIndex((s) => s.id === step.id) <= 0)}>
                                            Previous Step
                                        </Button>
                                        <Button size="sm" onClick={() => goToNeighbor(1)} disabled={!moduleSteps || !step || (moduleSteps.findIndex((s) => s.id === step.id) === -1) || (moduleSteps.findIndex((s) => s.id === step.id) >= ((moduleSteps?.length || 1) - 1))}>
                                            Next Step
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
                                {/** Center the single step card visually within the editor space */}
                                {[step].length === 1 ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-full max-w-lg">
                                            <StepConfiguration
                                                steps={[step]}
                                                selectedIndex={0}
                                                indexOffset={indexParam}
                                                onSelect={() => { /* no-op - single step */ }}
                                                onUpdate={updateStep}
                                                onUnassign={unassignModel}
                                                onAnimationUpdate={updateModelAnimation}
                                                onRemove={() => { /* removal handled in module page */ }}
                                                isSaving={isSaving}
                                                assets={assets}
                                                centerSingle={true}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <StepConfiguration
                                        steps={[step]}
                                        selectedIndex={0}
                                        indexOffset={indexParam}
                                        onSelect={() => { /* no-op - single step */ }}
                                        onUpdate={updateStep}
                                        onUnassign={unassignModel}
                                        onAnimationUpdate={updateModelAnimation}
                                        onRemove={() => { /* removal handled in module page */ }}
                                        isSaving={isSaving}
                                        assets={assets}
                                    />
                                )}
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
