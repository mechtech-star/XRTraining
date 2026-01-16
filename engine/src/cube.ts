import {
    createComponent,
    createSystem,
    AssetManager,
    PanelUI,
    PanelDocument,
    eq,
} from "@iwsdk/core";
import { ASSET_ANIMATIONS } from "./steps.js";

import { AnimationMixer } from "@iwsdk/core";

export const Cube = createComponent("Cube", {});

export class CubeSystem extends createSystem({
    step0Panel: {
        required: [PanelUI, PanelDocument],
        where: [eq(PanelUI, "config", "./ui/step-0.json")],
    },
    step1Panel: {
        required: [PanelUI, PanelDocument],
        where: [eq(PanelUI, "config", "./ui/step-1.json")],
    },
    step2Panel: {
        required: [PanelUI, PanelDocument],
        where: [eq(PanelUI, "config", "./ui/step-2.json")],
    },
}) {
    private mixer?: AnimationMixer;
    private actions = new Map<string, any>();
    private cubeObject?: any;

    init() {
        const gltf = AssetManager.getGLTF("cube");
        if (!gltf) return;

        const scene = gltf.scene;
        // start hidden (not visible in step-0)
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

        this.queries.step1Panel.subscribe("qualify", () => {
            if (this.cubeObject) this.cubeObject.visible = true;
            const actionName = ASSET_ANIMATIONS.cube.step1Panel;
            if (actionName) {
                const action = this.actions.get(actionName);
                if (action) {
                    this.actions.forEach((a, name) => {
                        if (name !== actionName) a.stop();
                    });
                    action.reset();
                    action.play();
                }
            }
        });

        this.queries.step2Panel.subscribe("qualify", () => {
            if (this.cubeObject) this.cubeObject.visible = true;
            const actionName = ASSET_ANIMATIONS.cube.step2Panel;
            if (actionName) {
                const action = this.actions.get(actionName);
                if (action) {
                    this.actions.forEach((a, name) => {
                        if (name !== actionName) a.stop();
                    });
                    action.reset();
                    action.play();
                }
            }
        });

        this.queries.step0Panel.subscribe("qualify", () => {
            if (this.cubeObject) this.cubeObject.visible = false;
            this.actions.forEach((a) => a.stop());
        });
    }

    update(delta: number) {
        if (this.mixer) this.mixer.update(delta);
    }
}
