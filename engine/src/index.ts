import {
  AssetManifest,
  AssetType,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SessionMode,
  SRGBColorSpace,
  AssetManager,
  World,
} from "@iwsdk/core";

import { Interactable, PanelUI, ScreenSpace } from "@iwsdk/core";

import { EnvironmentType, LocomotionEnvironment } from "@iwsdk/core";

import { PanelSystem } from "./panel.js";
import { PANEL_CONFIG } from "./panelConfig.js";
import { STEPS, ModelSystem, MODEL_URL } from "./steps.js";

const assets: AssetManifest = {
  chimeSound: {
    url: "./audio/chime.mp3",
    type: AssetType.Audio,
    priority: "background",
  },
  webxr: {
    url: "./textures/webxr.png",
    type: AssetType.Texture,
    priority: "critical",
  },
  environmentDesk: {
    url: "./gltf/environmentDesk/environmentDesk.gltf",
    type: AssetType.GLTF,
    priority: "critical",
  },
  model: {
    url: MODEL_URL,
    type: AssetType.GLTF,
    priority: "critical",
  },
};

// Bootstrap: support optional `moduleId` query param to fetch published runtime
// payload from the backend and use its first step UI as the panel config.
async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  const moduleId = params.get("moduleId");
  let runtimePayload: any | null = null;
  const BACKEND_ORIGIN = "http://localhost:8000";

  if (moduleId) {
    try {
      const resp = await fetch(`${BACKEND_ORIGIN}/api/modules/${moduleId}/runtime`);
      if (resp.ok) {
        runtimePayload = await resp.json();
      } else {
        console.warn(`Failed to fetch runtime for module ${moduleId}: ${resp.status}`);
      }
    } catch (err) {
      console.warn("Error fetching module runtime:", err);
    }
  }

  World.create(document.getElementById("scene-container") as HTMLDivElement, {
    assets,
    xr: {
      sessionMode: SessionMode.ImmersiveVR,
      offer: "always",
      // Optional structured features; layers/local-floor are offered by default
      features: { handTracking: true, layers: true },
    },
    features: {
      locomotion: { useWorker: true },
      grabbing: true,
      physics: false,
      sceneUnderstanding: false,
    },
  }).then((world) => {
    const { camera } = world;

    camera.position.set(-4, 1.5, -6);
    camera.rotateY(-Math.PI * 0.75);

    const { scene: envMesh } = AssetManager.getGLTF("environmentDesk")!;
    envMesh.rotateY(Math.PI);
    envMesh.position.set(0, -0.1, 0);
    world
      .createTransformEntity(envMesh)
      .addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });

    // choose UI config: prefer runtime payload (first step) when available
    let step0Cfg: any = null;
    let opts: any = null;
    if (runtimePayload && Array.isArray(runtimePayload.steps) && runtimePayload.steps.length > 0) {
      const firstStep = runtimePayload.steps[0];
      const uiUrl: string | undefined = firstStep.uiUrl || (firstStep.ui && firstStep.ui.url);
      if (uiUrl) {
        step0Cfg = uiUrl.startsWith("http") ? uiUrl : `${BACKEND_ORIGIN}${uiUrl}`;
      }
      // derive some panel options from global PANEL_CONFIG as a fallback
      opts = PANEL_CONFIG;
    } else {
      const step0 = STEPS[0];
      opts = step0.panelOptions;
      step0Cfg = typeof step0.ui === "string" ? step0.ui : ((step0.ui as any)?.uiUrl ?? step0.ui);
    }

    const panelEntity = world
      .createTransformEntity()
      .addComponent(PanelUI, {
        config: step0Cfg,
        maxHeight: opts?.maxHeight ?? PANEL_CONFIG.maxHeight,
        maxWidth: opts?.maxWidth ?? PANEL_CONFIG.maxWidth,
      })
      .addComponent(Interactable)
      .addComponent(ScreenSpace, opts?.screenSpace ?? PANEL_CONFIG.screenSpace);
    const pos = opts?.position ?? PANEL_CONFIG.position;
    panelEntity.object3D!.position.set(pos.x, pos.y, pos.z);
    panelEntity.object3D!.rotateY(opts?.rotationY ?? PANEL_CONFIG.rotationY);

    const webxrLogoTexture = AssetManager.getTexture("webxr")!;
    webxrLogoTexture.colorSpace = SRGBColorSpace;
    const logoBanner = new Mesh(
      new PlaneGeometry(3.39, 0.96),
      new MeshBasicMaterial({
        map: webxrLogoTexture,
        transparent: true,
      }),
    );
    world.createTransformEntity(logoBanner);
    logoBanner.position.set(0, 1, 1.8);
    logoBanner.rotateY(Math.PI);

    world.registerSystem(PanelSystem).registerSystem(ModelSystem);
  });
}

bootstrap();
