import {
  createSystem,
  PanelUI,
  PanelDocument,
  eq,
  VisibilityState,
  UIKitDocument,
  UIKit,
  Interactable,
  ScreenSpace,
  Vector3,
} from "@iwsdk/core";
import { PANEL_CONFIG } from "./panelConfig.js";
import { STEPS } from "./steps.js";

export class PanelSystem extends createSystem({
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
  panels: {
    required: [PanelUI],
  },
}) {
  private lookAtTarget!: Vector3;
  private vec3!: Vector3;
  init() {
    this.lookAtTarget = new Vector3();
    this.vec3 = new Vector3();
    this.queries.step0Panel.subscribe("qualify", (entity) => {
      const document = PanelDocument.data.document[
        entity.index
      ] as UIKitDocument;
      if (!document) {
        return;
      }

      const xrButton = document.getElementById("xr-button") as UIKit.Text;
      xrButton.addEventListener("click", () => {
        if (this.world.visibilityState.value === VisibilityState.NonImmersive) {
          this.world.launchXR();
        } else {
          // Switch to step-1 UI
          const entity = Array.from(this.queries.step0Panel.entities)[0];
          const step = STEPS.step1Panel;
          const opts = step.panelOptions;
          const newPanelEntity = this.world
            .createTransformEntity()
            .addComponent(PanelUI, {
              config: step.ui,
              maxHeight: opts?.maxHeight ?? PANEL_CONFIG.maxHeight,
              maxWidth: opts?.maxWidth ?? PANEL_CONFIG.maxWidth,
            })
            .addComponent(Interactable)
            .addComponent(ScreenSpace, opts?.screenSpace ?? PANEL_CONFIG.screenSpace);
          const pos = opts?.position ?? PANEL_CONFIG.position;
          newPanelEntity.object3D!.position.set(pos.x, pos.y, pos.z);
          newPanelEntity.object3D!.rotateY(opts?.rotationY ?? PANEL_CONFIG.rotationY);
          entity.destroy();
        }
      });
    });

    this.queries.step1Panel.subscribe("qualify", (entity) => {
      const document = PanelDocument.data.document[
        entity.index
      ] as UIKitDocument;
      if (!document) {
        return;
      }

      const nextButton = document.getElementById("next-button") as UIKit.Text;
      nextButton.addEventListener("click", () => {
        const entity = Array.from(this.queries.step1Panel.entities)[0];
        const step = STEPS.step2Panel;
        const opts = step.panelOptions;
        const newPanelEntity = this.world
          .createTransformEntity()
          .addComponent(PanelUI, {
            config: step.ui,
            maxHeight: opts?.maxHeight ?? PANEL_CONFIG.maxHeight,
            maxWidth: opts?.maxWidth ?? PANEL_CONFIG.maxWidth,
          })
          .addComponent(Interactable)
          .addComponent(ScreenSpace, opts?.screenSpace ?? PANEL_CONFIG.screenSpace);
        const pos = opts?.position ?? PANEL_CONFIG.position;
        newPanelEntity.object3D!.position.set(pos.x, pos.y, pos.z);
        newPanelEntity.object3D!.rotateY(opts?.rotationY ?? PANEL_CONFIG.rotationY);
        entity.destroy();
      });

      const backButton = document.getElementById("back-button") as UIKit.Text;
      backButton.addEventListener("click", () => {
        const entity = Array.from(this.queries.step1Panel.entities)[0];
        const step = STEPS.step0Panel;
        const opts = step.panelOptions;
        const newPanelEntity = this.world
          .createTransformEntity()
          .addComponent(PanelUI, {
            config: step.ui,
            maxHeight: opts?.maxHeight ?? PANEL_CONFIG.maxHeight,
            maxWidth: opts?.maxWidth ?? PANEL_CONFIG.maxWidth,
          })
          .addComponent(Interactable)
          .addComponent(ScreenSpace, opts?.screenSpace ?? PANEL_CONFIG.screenSpace);
        const pos = opts?.position ?? PANEL_CONFIG.position;
        newPanelEntity.object3D!.position.set(pos.x, pos.y, pos.z);
        newPanelEntity.object3D!.rotateY(opts?.rotationY ?? PANEL_CONFIG.rotationY);
        entity.destroy();
      });
    });

    this.queries.step2Panel.subscribe("qualify", (entity) => {
      const document = PanelDocument.data.document[
        entity.index
      ] as UIKitDocument;
      if (!document) {
        return;
      }

      const nextButton = document.getElementById("next-button") as UIKit.Text;
      nextButton.addEventListener("click", () => {
        // No step-3 defined — cycle back to step-0
        const entity = Array.from(this.queries.step2Panel.entities)[0];
        const step = STEPS.step0Panel;
        const opts = step.panelOptions;
        const newPanelEntity = this.world
          .createTransformEntity()
          .addComponent(PanelUI, {
            config: step.ui,
            maxHeight: opts?.maxHeight ?? PANEL_CONFIG.maxHeight,
            maxWidth: opts?.maxWidth ?? PANEL_CONFIG.maxWidth,
          })
          .addComponent(Interactable)
          .addComponent(ScreenSpace, opts?.screenSpace ?? PANEL_CONFIG.screenSpace);
        const pos = opts?.position ?? PANEL_CONFIG.position;
        newPanelEntity.object3D!.position.set(pos.x, pos.y, pos.z);
        newPanelEntity.object3D!.rotateY(opts?.rotationY ?? PANEL_CONFIG.rotationY);
        entity.destroy();
      });

      const backButton = document.getElementById("back-button") as UIKit.Text;
      backButton.addEventListener("click", () => {
        const entity = Array.from(this.queries.step2Panel.entities)[0];
        const step = STEPS.step1Panel;
        const opts = step.panelOptions;
        const newPanelEntity = this.world
          .createTransformEntity()
          .addComponent(PanelUI, {
            config: step.ui,
            maxHeight: opts?.maxHeight ?? PANEL_CONFIG.maxHeight,
            maxWidth: opts?.maxWidth ?? PANEL_CONFIG.maxWidth,
          })
          .addComponent(Interactable)
          .addComponent(ScreenSpace, opts?.screenSpace ?? PANEL_CONFIG.screenSpace);
        const pos = opts?.position ?? PANEL_CONFIG.position;
        newPanelEntity.object3D!.position.set(pos.x, pos.y, pos.z);
        newPanelEntity.object3D!.rotateY(opts?.rotationY ?? PANEL_CONFIG.rotationY);
        entity.destroy();
      });
    });
  }

  update() {
    // Make any PanelUI entities face the user's head (preserve their local Y)
    this.queries.panels.entities.forEach((entity) => {
      this.player.head.getWorldPosition(this.lookAtTarget);
      const obj = entity.object3D!;
      obj.getWorldPosition(this.vec3);
      this.lookAtTarget.y = this.vec3.y;
      obj.lookAt(this.lookAtTarget);
    });
  }
}
