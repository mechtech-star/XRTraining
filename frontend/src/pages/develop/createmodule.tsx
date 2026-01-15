import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import AssetSidebar from '../../components/pagecomponents/asset-sidebar'
import Header from '../../components/pagecomponents/header'
import StepConfiguration from '../../components/pagecomponents/step-configuration'

type Step = {
    id: string
    title: string
    content: string
    model?: string
}

const AVAILABLE_MODELS = [
    { id: 'cube', name: 'Cube', uploadedAt: '2026-01-11T08:00:00Z' },
    { id: 'environmentDesk', name: 'Environment Desk', uploadedAt: '2026-01-09T12:20:00Z' },
    { id: 'plantSansevieria', name: 'Plant (Sansevieria)', uploadedAt: '2026-01-05T17:05:00Z' },
    { id: 'robot', name: 'Robot', uploadedAt: '2026-01-14T11:30:00Z' },
]

export default function CreateModule() {
    const navigate = useNavigate()
    const { moduleName } = useParams<{ moduleName: string }>()

    const decodedModuleName = moduleName ? decodeURIComponent(moduleName) : 'New Module'

    const [steps, setSteps] = useState<Step[]>([])
    const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null)

    function addStep() {
        setSteps((prev) => {
            const newStep = { id: String(Date.now()), title: `Step ${prev.length + 1}`, content: '', model: undefined }
            const next = [...prev, newStep]
            setSelectedStepIndex(next.length - 1)
            return next
        })
    }

    function updateStep(index: number, patch: Partial<Step>) {
        setSteps((s) => s.map((st, i) => (i === index ? { ...st, ...patch } : st)))
    }

    function removeStep(index: number) {
        setSteps((s) => s.filter((_, i) => i !== index))
        setSelectedStepIndex((i) => (i === null ? null : i > index ? i - 1 : i === index ? null : i))
    }

    function assignModelToStep(modelId: string) {
        if (selectedStepIndex === null) {
            alert('Select a step to assign this model to (click a step on the left).')
            return
        }
        updateStep(selectedStepIndex, { model: modelId })
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
                                    <div>
                                        <Button size="sm" onClick={addStep}>Add Step</Button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4">
                                <StepConfiguration
                                    steps={steps}
                                    selectedIndex={selectedStepIndex}
                                    onSelect={(i) => setSelectedStepIndex(i)}
                                    onUpdate={updateStep}
                                    onRemove={removeStep}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1 lg:col-span-3 p-2 bg-background overflow-hidden">
                        <div className="h-full">
                            <AssetSidebar
                                models={AVAILABLE_MODELS}
                                onAssignModel={assignModelToStep}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}