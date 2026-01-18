import { PANEL_CONFIG } from "./panelConfig.js";
import { createComponent, createSystem, AssetManager, PanelUI, PanelDocument, eq, AnimationMixer } from "@iwsdk/core";

// Centralize model asset path here so other modules can reference it.
// Expose a mutable `MODEL_URL` and a setter so runtime can override it.
export let MODEL_URL = "./gltf/cube/cube.glb";
export let MODEL_NAME: string | undefined = undefined;

export function setModelUrl(url: string, name?: string) {
    MODEL_URL = url;
    MODEL_NAME = name;
}

export type PanelOptions = {
    maxHeight?: number;
    maxWidth?: number;
    screenSpace?: Record<string, string>;
    position?: { x: number; y: number; z: number };
    rotationY?: number;
};

// Button action configuration per step. Keys are element ids inside the
// UIKit document. Action types:
// - { action: 'goto', target: '<stepKey>' }
// - { action: 'launchXR' }
// - { action: 'launchOrGoto', target: '<stepKey>' } // launch XR if not immersive, otherwise goto
export type ButtonAction =
    | { action: "goto"; target: string }
    | { action: "launchXR" }
    | { action: "launchOrGoto"; target: string };

export type ModelEntry = {
    // key matches an AssetManifest key (e.g. 'model' or 'model_<assetId>')
    key?: string;
    assetId?: string;
    url?: string;
    animation?: string | null;
    slot?: string;
    transform?: {
        position?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number };
        scale?: { x: number; y: number; z: number };
    };
};

export type Step = {
    id: string;
    stepNumber: number;
    ui: string | { uiUrl: string };
    // optional media UI for image/video panel associated with this step
    mediaUi?: string | { uiUrl: string } | Record<string, any> | null;
    panelOptions: PanelOptions | null;
    models: ModelEntry[];
    buttons: Record<string, ButtonAction>;
};

const DEFAULT_PUBLISHED_MODULE_ID = "test-001-413937dc-e3ce-4468-8d7e-6b6da632a09e";

function publishedModuleUrl(moduleId: string, stepNumber: number) {
    return `http://localhost:8000/media/published_modules/${moduleId}-step-${stepNumber}.json`;
}

export function createSteps(moduleId: string = DEFAULT_PUBLISHED_MODULE_ID): Step[] {
    return [
        {
            id: 'step1Panel',
            stepNumber: 0,
            ui: { uiUrl: publishedModuleUrl(moduleId, 1) },
            panelOptions: PANEL_CONFIG,
            models: [
                { key: 'model', animation: "cubeanimation1" },
            ],
            buttons: {} as Record<string, ButtonAction>,
        },
        {
            id: 'step2Panel',
            stepNumber: 1,
            ui: { uiUrl: publishedModuleUrl(moduleId, 2) },
            panelOptions: PANEL_CONFIG,
            models: [
                { key: 'model', animation: "cubeanimation2" },
            ],
            buttons: {} as Record<string, ButtonAction>,
        },
        {
            id: 'step3Panel',
            stepNumber: 3,
            ui: { uiUrl: publishedModuleUrl(moduleId, 3) },
            panelOptions: PANEL_CONFIG,
            models: [
                { key: 'model', animation: "cubeanimation2" },
            ],
            buttons: {} as Record<string, ButtonAction>,
        },
        {
            id: 'step4Panel',
            stepNumber: 4,
            ui: { uiUrl: publishedModuleUrl(moduleId, 4) },
            panelOptions: PANEL_CONFIG,
            models: [
                { key: 'model', animation: "cubeanimation2" },
            ],
            buttons: {} as Record<string, ButtonAction>,
        },
    ];
}

export function buildSteps(moduleId: string = DEFAULT_PUBLISHED_MODULE_ID): Step[] {
    const steps = createSteps(moduleId);
    for (let i = 0; i < steps.length; i++) {
        const nextIndex = (i + 1) % steps.length;
        const prevIndex = (i - 1 + steps.length) % steps.length;
        steps[i].buttons = {
            "next-button": { action: "goto", target: steps[nextIndex].id },
            "back-button": { action: "goto", target: steps[prevIndex].id },
        };
    }
    return steps;
}

export const DEFAULT_STEPS: Step[] = buildSteps();
export const TOTAL_STEPS = DEFAULT_STEPS.length;

export default DEFAULT_STEPS;

// --- ModelSystem moved here so it can derive queries directly from `STEPS` ---
export const Model = createComponent("Model", {});

// Build queries dynamically from provided steps so ModelSystem reacts to any number of steps
export function createModelSystem(steps: Step[]) {
    const MODEL_QUERIES: any = (() => {
        const q: Record<string, any> = {};
        q.panels = { required: [PanelUI] };
        steps.forEach((step) => {
            const cfg = typeof step.ui === "string" ? step.ui : ((step.ui as any)?.uiUrl ?? step.ui);
            q[step.id] = {
                required: [PanelUI, PanelDocument],
                where: [eq(PanelUI, "config", cfg)],
            };
        });
        return q;
    })();

    return class ModelSystem extends createSystem(MODEL_QUERIES) {
    private mixers: Record<string, any> = {};
    private actionsMap: Record<string, Map<string, any>> = {};
    private modelObjects: Record<string, any> = {};
    private instances: Record<string, any> = {};

    init() {
        // collect unique asset keys referenced by steps (default to 'model')
        const keys = new Set<string>();
        steps.forEach(step => {
            (step.models || []).forEach((m) => {
                if (m.key) keys.add(m.key);
            });
        });
        keys.add('model');

        keys.forEach((key) => {
            const gltf = AssetManager.getGLTF(key as any);
            if (!gltf) return;
            const scene = gltf.scene;
            scene.visible = false;
            this.modelObjects[key] = scene;
            const entity = this.world.createTransformEntity(scene).addComponent(Model);
            this.instances[key] = entity;

            const mixer = new AnimationMixer(scene as any);
            this.mixers[key] = mixer;
            this.actionsMap[key] = new Map<string, any>();
            if (gltf.animations) {
                gltf.animations.forEach((clip: any) => {
                    const action = mixer.clipAction(clip);
                    this.actionsMap[key].set(clip.name, action);
                });
            }
        });

        // wire step qualify behavior: show/hide and play per-step models
        steps.forEach((step) => {
            const stepKey = step.id;
            const q = (this.queries as any)[stepKey];
            if (!q) return;
            q.subscribe("qualify", () => {
                const stepModelKeys = (step.models || []).map(m => m.key || 'model');

                Object.keys(this.instances).forEach((k) => {
                    const obj = this.modelObjects[k];
                    const ent = this.instances[k];
                    const actions = this.actionsMap[k];

                    const belongs = stepModelKeys.includes(k);
                    if (belongs) {
                        if (obj) obj.visible = true;
                        const entry = (step.models || []).find(m => (m.key || 'model') === k) as ModelEntry | undefined;
                        if (entry && entry.transform && ent && ent.object3D) {
                            const pos = entry.transform.position;
                            if (pos) ent.object3D.position.set(pos.x, pos.y, pos.z);
                            const rot = entry.transform.rotation;
                            if (rot) ent.object3D.rotation.set(rot.x, rot.y, rot.z);
                            const scl = entry.transform.scale;
                            if (scl) ent.object3D.scale.set(scl.x, scl.y, scl.z);
                        }

                        const actionName = entry?.animation ?? null;
                        if (!actionName) {
                            actions?.forEach((a) => a.stop());
                        } else {
                            const action = actions?.get(actionName);
                            if (action) {
                                actions?.forEach((a, name) => {
                                    if (name !== actionName) a.stop();
                                });
                                action.reset();
                                action.play();
                            }
                        }
                    } else {
                        if (obj) obj.visible = false;
                        actions?.forEach((a) => a.stop());
                    }
                });
            });
        });
    }

    update(delta: number) {
        Object.keys(this.mixers).forEach((k) => {
            const m = this.mixers[k];
            if (m) m.update(delta);
        });
    }
};
}
