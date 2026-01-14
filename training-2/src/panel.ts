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
} from "@iwsdk/core";

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
}) {
  init() {
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
          const newPanelEntity = this.world
            .createTransformEntity()
            .addComponent(PanelUI, {
              config: "./ui/step-1.json",
              maxHeight: 0.8,
              maxWidth: 1.6,
            })
            .addComponent(Interactable)
            .addComponent(ScreenSpace, {
              top: "20px",
              left: "20px",
              height: "40%",
            });
          newPanelEntity.object3D!.position.set(0, 1.29, -1.9);
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
        const newPanelEntity = this.world
          .createTransformEntity()
          .addComponent(PanelUI, {
            config: "./ui/step-2.json",
            maxHeight: 0.8,
            maxWidth: 1.6,
          })
          .addComponent(Interactable)
          .addComponent(ScreenSpace, {
            top: "20px",
            left: "20px",
            height: "40%",
          });
        newPanelEntity.object3D!.position.set(0, 1.29, -1.9);
        entity.destroy();
      });

      const backButton = document.getElementById("back-button") as UIKit.Text;
      backButton.addEventListener("click", () => {
        const entity = Array.from(this.queries.step1Panel.entities)[0];
        const newPanelEntity = this.world
          .createTransformEntity()
          .addComponent(PanelUI, {
            config: "./ui/step-0.json",
            maxHeight: 0.8,
            maxWidth: 1.6,
          })
          .addComponent(Interactable)
          .addComponent(ScreenSpace, {
            top: "20px",
            left: "20px",
            height: "40%",
          });
        newPanelEntity.object3D!.position.set(0, 1.29, -1.9);
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
        const newPanelEntity = this.world
          .createTransformEntity()
          .addComponent(PanelUI, {
            config: "./ui/step-0.json",
            maxHeight: 0.8,
            maxWidth: 1.6,
          })
          .addComponent(Interactable)
          .addComponent(ScreenSpace, {
            top: "20px",
            left: "20px",
            height: "40%",
          });
        newPanelEntity.object3D!.position.set(0, 1.29, -1.9);
        entity.destroy();
      });

      const backButton = document.getElementById("back-button") as UIKit.Text;
      backButton.addEventListener("click", () => {
        const entity = Array.from(this.queries.step2Panel.entities)[0];
        const newPanelEntity = this.world
          .createTransformEntity()
          .addComponent(PanelUI, {
            config: "./ui/step-1.json",
            maxHeight: 0.8,
            maxWidth: 1.6,
          })
          .addComponent(Interactable)
          .addComponent(ScreenSpace, {
            top: "20px",
            left: "20px",
            height: "40%",
          });
        newPanelEntity.object3D!.position.set(0, 1.29, -1.9);
        entity.destroy();
      });
    });

  }
}
