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

export type Step = {
    id: string;
    stepNumber: number;
    ui: string | { uiUrl: string };
    panelOptions: PanelOptions | null;
    assets: Record<string, { animation: string | null }>;
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
            assets: {
                model: { animation: "cubeanimation1" },
            },
            buttons: {} as Record<string, ButtonAction>,
        },
        {
            id: 'step2Panel',
            stepNumber: 1,
            ui: { uiUrl: publishedModuleUrl(moduleId, 2) },
            panelOptions: PANEL_CONFIG,
            assets: {
                model: { animation: "cubeanimation2" },
            },
            buttons: {} as Record<string, ButtonAction>,
        },
        {
            id: 'step3Panel',
            stepNumber: 3,
            ui: { uiUrl: publishedModuleUrl(moduleId, 3) },
            panelOptions: PANEL_CONFIG,
            assets: {
                model: { animation: "cubeanimation2" },
            },
            buttons: {} as Record<string, ButtonAction>,
        },
        {
            id: 'step4Panel',
            stepNumber: 4,
            ui: { uiUrl: publishedModuleUrl(moduleId, 4) },
            panelOptions: PANEL_CONFIG,
            assets: {
                model: { animation: "cubeanimation2" },
            },
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
    private mixer?: AnimationMixer;
    private actions = new Map<string, any>();
    private modelObject?: any;

    init() {
        const gltf = AssetManager.getGLTF("model");
        if (!gltf) return;

        const scene = gltf.scene;
        scene.visible = false;
        this.modelObject = scene;

        this.world.createTransformEntity(scene).addComponent(Model);

        this.mixer = new AnimationMixer(scene as any);
        if (gltf.animations) {
            gltf.animations.forEach((clip: any) => {
                const action = this.mixer!.clipAction(clip);
                this.actions.set(clip.name, action);
            });
        }

        steps.forEach((step) => {
            const stepKey = step.id;
            const q = (this.queries as any)[stepKey];
            if (!q) return;
            const actionNameForStep = step.assets.model?.animation ?? null;
            q.subscribe("qualify", () => {
                if (!this.modelObject) return;
                if (!actionNameForStep) {
                    this.modelObject.visible = false;
                    this.actions.forEach((a) => a.stop());
                    return;
                }
                this.modelObject.visible = true;
                const action = this.actions.get(actionNameForStep);
                if (action) {
                    this.actions.forEach((a, name) => {
                        if (name !== actionNameForStep) a.stop();
                    });
                    action.reset();
                    action.play();
                }
            });
        });
    }

    update(delta: number) {
        if (this.mixer) this.mixer.update(delta);
    }
};
}
