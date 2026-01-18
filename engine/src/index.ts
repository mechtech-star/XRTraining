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

import { createPanelSystem } from "./panel.js";
import { PANEL_CONFIG } from "./panelConfig.js";
import { buildSteps, DEFAULT_STEPS, createModelSystem, MODEL_URL, setModelUrl } from "./steps.js";

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
        console.log("[Engine] Runtime payload fetched:", runtimePayload);
      } else {
        console.warn(`Failed to fetch runtime for module ${moduleId}: ${resp.status}`);
      }
    } catch (err) {
      console.warn("Error fetching module runtime:", err);
    }
  }

  // If runtime payload contains an asset reference for the model, use it
  // to set the model asset URL (and optional name) so the engine loads
  // the published model instead of the local default.
  if (runtimePayload && Array.isArray(runtimePayload.assets)) {
    try {
      // Map published assets into the engine asset manifest using distinct keys
      (runtimePayload.assets as any[]).forEach((a: any) => {
        if (!a || !a.url) return;
        const resolved = a.url.startsWith("http") ? a.url : `${BACKEND_ORIGIN}${a.url}`;
        const isGltf = /\.glb$|\.gltf$/i.test(a.url) || a.type === 'gltf' || (a.mimeType && a.mimeType.includes('gltf'));
        const key = `model_${a.id}`;
        if (isGltf) {
          assets[key] = { url: resolved, type: AssetType.GLTF, priority: "critical" };
        } else if (a.type === 'texture' || /\.png$|\.jpe?g$/i.test(a.url)) {
          assets[a.id] = { url: resolved, type: AssetType.Texture, priority: "background" };
        } else if (a.type === 'audio' || /\.mp3$|\.wav$/i.test(a.url)) {
          assets[a.id] = { url: resolved, type: AssetType.Audio, priority: "background" };
        }
      });
    } catch (e) {
      console.warn("Failed to map runtime assets into manifest:", e);
    }
  }

  // Build steps from runtime payload if available, otherwise use default fallback steps
  let steps: any[] = DEFAULT_STEPS;
  if (runtimePayload && Array.isArray(runtimePayload.steps) && runtimePayload.steps.length > 0) {
    console.log("[Engine] Building steps from runtime payload:", runtimePayload.steps);
    // Map runtime payload steps to Step objects for the engine
    steps = runtimePayload.steps.map((rStep: any) => {
      // Find the corresponding button actions if we can, or use empty
      const defaultStep = DEFAULT_STEPS.find(ds => ds.stepNumber === rStep.orderIndex - 1);
      const buttons = defaultStep?.buttons || {};
      // Build models[] for this step. Support both legacy single `model` and new `models[]`.
      const models: any[] = [];
      // If authors published a models[] array, prefer that
      if (Array.isArray(rStep.models) && rStep.models.length > 0) {
        rStep.models.forEach((m: any) => {
          const assetId = m.assetId ?? m.asset?.id ?? null;
          // Extract animation from model entry (per-asset animation)
          const animationClip = m.animation ?? null;
          const key = assetId ? `model_${assetId}` : (m.key ?? 'model');
          models.push({ key, assetId, animation: animationClip, transform: m.transform ?? null, slot: m.slot });
        });
      } else {
        // Legacy support: single model reference
        const animationClip = rStep.animation?.clip || null;
        const modelAssetId: string | undefined = rStep?.model?.assetId;
        if (modelAssetId) {
          models.push({ key: `model_${modelAssetId}`, assetId: modelAssetId, animation: animationClip });
        } else {
          models.push({ key: 'model', animation: animationClip });
        }
      }

      const step = {
        id: `step${rStep.orderIndex}Panel`,
        stepNumber: rStep.orderIndex - 1,
        ui: { uiUrl: rStep.uiUrl },
        panelOptions: PANEL_CONFIG,
        models,
        buttons,
      };
      console.log(`[Engine] Created step ${rStep.orderIndex}:`, step);
      return step;
    });
    // Wire up next/back buttons for runtime payload steps
    for (let i = 0; i < steps.length; i++) {
      const nextIndex = (i + 1) % steps.length;
      const prevIndex = (i - 1 + steps.length) % steps.length;
      steps[i].buttons = {
        "next-button": { action: "goto", target: steps[nextIndex].id },
        "back-button": { action: "goto", target: steps[prevIndex].id },
      };
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

    // choose UI config from the steps (which come from runtime payload or default)
    const step0 = steps[0];
    let step0Cfg: any = null;
    let opts: any = null;
    
    opts = step0.panelOptions;
    step0Cfg = typeof step0.ui === "string" ? step0.ui : ((step0.ui as any)?.uiUrl ?? step0.ui);

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

    world.registerSystem(createPanelSystem(steps)).registerSystem(createModelSystem(steps));
  });
}

bootstrap();
