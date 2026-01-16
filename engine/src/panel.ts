import {
  createSystem,
  PanelUI,
  PanelDocument,
  eq,
  VisibilityState,
  UIKitDocument,
  Interactable,
  ScreenSpace,
  Vector3,
} from "@iwsdk/core";
import { PANEL_CONFIG } from "./panelConfig.js";
import { STEPS, BUTTON_ACTIONS } from "./steps.js";
// Build queries dynamically from STEPS so the number of steps can change
const PANEL_QUERIES: any = (() => {
  const q: Record<string, any> = {};
  // a generic panels query to find any PanelUI
  q.panels = { required: [PanelUI] };
  // per-step queries (e.g. step0Panel, step1Panel, ...)
  Object.entries(STEPS).forEach(([stepKey, step]) => {
    q[stepKey] = {
      required: [PanelUI, PanelDocument],
      where: [eq(PanelUI, "config", step.ui)],
    };
  });
  return q;
})();

export class PanelSystem extends createSystem(PANEL_QUERIES) {
  private lookAtTarget!: Vector3;
  private vec3!: Vector3;

  init() {
    this.lookAtTarget = new Vector3();
    this.vec3 = new Vector3();

    const wireStep = (stepKey: string, entitiesQuery: any) => {
      if (!entitiesQuery) return;
      entitiesQuery.subscribe("qualify", (entity: any) => {
        const document = PanelDocument.data.document[entity.index] as UIKitDocument;
        if (!document) return;

        const actions = BUTTON_ACTIONS[stepKey] || {};
        Object.keys(actions).forEach((id) => {
          const el = document.getElementById(id) as any | null;
          if (!el) return;
          el.addEventListener("click", () => {
            const action = actions[id];
            if (!action) return;
            if (action.action === "launchXR") {
              this.world.launchXR();
              return;
            }
            if (action.action === "launchOrGoto") {
              if (this.world.visibilityState.value === VisibilityState.NonImmersive) {
                this.world.launchXR();
                return;
              }
            }
            if (action.action === "goto" || action.action === "launchOrGoto") {
              const target = (action as any).target as string;
              const step = STEPS[target];
              if (!step) return;
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
      });
    };

    // wire all steps dynamically
    Object.keys(STEPS).forEach((stepKey) => {
      wireStep(stepKey, (this.queries as any)[stepKey]);
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
