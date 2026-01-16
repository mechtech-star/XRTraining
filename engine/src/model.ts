import {
    createComponent,
    createSystem,
    AssetManager,
    PanelUI,
    PanelDocument,
    eq,
    AnimationMixer,
} from "@iwsdk/core";
import { ASSET_ANIMATIONS, STEPS } from "./steps.js";

export const Cube = createComponent("Cube", {});

// Build queries dynamically from STEPS so CubeSystem reacts to any number of steps
const CUBE_QUERIES: any = (() => {
    const q: Record<string, any> = {};
    q.panels = { required: [PanelUI] };
    Object.entries(STEPS).forEach(([stepKey, step]) => {
        q[stepKey] = {
            required: [PanelUI, PanelDocument],
            where: [eq(PanelUI, "config", step.ui)],
        };
    });
    return q;
})();

export class CubeSystem extends createSystem(CUBE_QUERIES) {
    private mixer?: AnimationMixer;
    private actions = new Map<string, any>();
    private cubeObject?: any;

    init() {
        const gltf = AssetManager.getGLTF("cube");
        if (!gltf) return;

        const scene = gltf.scene;
        // start hidden by default
        scene.visible = false;
        this.cubeObject = scene;

        this.world.createTransformEntity(scene).addComponent(Cube);

        this.mixer = new AnimationMixer(scene as any);
        if (gltf.animations) {
            gltf.animations.forEach((clip: any) => {
                const action = this.mixer!.clipAction(clip);
                this.actions.set(clip.name, action);
            });
        }

        // Subscribe to every step defined in STEPS and play/hide based on ASSET_ANIMATIONS
        Object.keys(STEPS).forEach((stepKey) => {
            const q = (this.queries as any)[stepKey];
            if (!q) return;
            const actionNameForStep = ASSET_ANIMATIONS.cube?.[stepKey] ?? null;
            q.subscribe("qualify", () => {
                if (!this.cubeObject) return;
                if (!actionNameForStep) {
                    // no animation assigned for this step => hide and stop
                    this.cubeObject.visible = false;
                    this.actions.forEach((a) => a.stop());
                    return;
                }
                // show and play the named action if available
                this.cubeObject.visible = true;
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
