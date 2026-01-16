import {
    createComponent,
    createSystem,
    AssetManager,
    PanelUI,
    PanelDocument,
    eq,
    AnimationMixer,
} from "@iwsdk/core";
import { STEPS } from "./steps.js";

export const Model = createComponent("Model", {});

// Build queries dynamically from STEPS so ModelSystem reacts to any number of steps
const MODEL_QUERIES: any = (() => {
    const q: Record<string, any> = {};
    q.panels = { required: [PanelUI] };
    STEPS.forEach((step) => {
        // Support ui being a string path or an object with uiUrl
        const cfg = typeof step.ui === "string" ? step.ui : ((step.ui as any)?.uiUrl ?? step.ui);
        q[step.id] = {
            required: [PanelUI, PanelDocument],
            where: [eq(PanelUI, "config", cfg)],
        };
    });
    return q;
})();

export class ModelSystem extends createSystem(MODEL_QUERIES) {
    private mixer?: AnimationMixer;
    private actions = new Map<string, any>();
    private modelObject?: any;

    init() {
        const gltf = AssetManager.getGLTF("model");
        if (!gltf) return;

        const scene = gltf.scene;
        // start hidden by default
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

        // Subscribe to every step defined in STEPS and play/hide based on assets
        STEPS.forEach((step) => {
            const stepKey = step.id;
            const q = (this.queries as any)[stepKey];
            if (!q) return;
            const actionNameForStep = step.assets.model?.animation ?? null;
            q.subscribe("qualify", () => {
                if (!this.modelObject) return;
                if (!actionNameForStep) {
                    // no animation assigned for this step => hide and stop
                    this.modelObject.visible = false;
                    this.actions.forEach((a) => a.stop());
                    return;
                }
                // show and play the named action if available
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
}
