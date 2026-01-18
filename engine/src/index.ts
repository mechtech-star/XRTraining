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

import { Interactable, PanelUI, ScreenSpace, PanelDocument } from "@iwsdk/core";

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
  // Use relative URLs so the dev server can proxy `/api` and `/media` to the backend.
  // This avoids mixed-content when the engine runs over HTTPS in dev.
  const BACKEND_ORIGIN = "http://localhost:8000";

  if (moduleId) {
    try {
      // Use a relative request so Vite's dev server can proxy to the backend
      // (configure proxy for `/api` -> http://localhost:8000` in `engine/vite.config.ts`).
      const resp = await fetch(`/api/modules/${moduleId}/runtime`);
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

  // Try to fetch the media panel template so we can populate it per-step
  let mediaPanelTemplate: any = null;
  try {
    const tResp = await fetch(`/template/mediapanel.json`);
    if (tResp.ok) {
      mediaPanelTemplate = await tResp.json();
    } else {
      console.warn("Failed to fetch mediapanel template:", tResp.status);
    }
  } catch (e) {
    console.warn("Error fetching mediapanel template:", e);
  }

  // If runtime payload contains an asset reference for the model, use it
  // to set the model asset URL (and optional name) so the engine loads
  // the published model instead of the local default.
  if (runtimePayload && Array.isArray(runtimePayload.assets)) {
    try {
      // Map published assets into the engine asset manifest using distinct keys
        (runtimePayload.assets as any[]).forEach((a: any) => {
          if (!a || !a.url) return;
          // keep relative paths as-is so the dev server can proxy `/media` to backend
          const resolved = a.url.startsWith("http") ? a.url : a.url;
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

      // Build a media-panel-specific config by cloning the template and
      // inserting a per-step media src (if present in the runtime step)
      let mediaUiObj: any = null;
      try {
        if (mediaPanelTemplate) {
          mediaUiObj = JSON.parse(JSON.stringify(mediaPanelTemplate));
          // find first image child and replace `src` with published media url when available
          const mediaRef = (rStep.media && (rStep.media.url || rStep.media.path)) || (rStep.assets && rStep.assets.length ? rStep.assets[0].url : null) || null;
              if (mediaRef) {
                // leave relative media refs untouched so Vite can proxy `/media` to backend
                const resolved = mediaRef.startsWith("http") ? mediaRef : mediaRef;
                try {
                  if (mediaUiObj.element && Array.isArray(mediaUiObj.element.children) && mediaUiObj.element.children.length > 0) {
                    const child = mediaUiObj.element.children[0];
                    if (child && child.properties) {
                      child.properties.src = resolved;
                    }
                  }
                } catch (e) {
                  console.warn("Failed to inject media src into media UI template:", e);
                }
                // capture the media src so the engine can size the panel to the image
                (rStep as any)._mediaSrc = resolved;
              }
        }
      } catch (e) {
        mediaUiObj = null;
      }

      // If we generated a media UI object, convert it into a blob URL so
      // PanelUI can fetch it as a JSON resource instead of receiving an
      // inline object which the Panel system may not accept. Also capture
      // the media source for sizing.
      let mediaUiForStep: any = null;
      try {
        if (mediaUiObj) {
          const json = JSON.stringify(mediaUiObj);
          const blob = new Blob([json], { type: "application/json" });
          mediaUiForStep = URL.createObjectURL(blob);
          console.log("[Engine] Created media UI blob URL for step", rStep.orderIndex, mediaUiForStep);
        }
      } catch (e) {
        console.warn("[Engine] Failed to create blob URL for media UI:", e);
        mediaUiForStep = null;
      }

      const step = {
        id: `step${rStep.orderIndex}Panel`,
        stepNumber: rStep.orderIndex - 1,
        ui: { uiUrl: rStep.uiUrl },
        panelOptions: PANEL_CONFIG,
        mediaUi: mediaUiForStep ?? mediaUiObj,
        // internal helper: original media src (relative or absolute)
        mediaSrc: (rStep as any)._mediaSrc ?? null,
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
    // initial panels are created after systems are registered below

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

    // create initial panel after systems are registered so queries pick it up
    try {
      const step0 = steps[0];
      let step0Cfg: any = null;
      const opts: any = step0.panelOptions;
      step0Cfg = typeof step0.ui === "string" ? step0.ui : ((step0.ui as any)?.uiUrl ?? step0.ui);

      console.log('[Engine] Creating initial panel with config:', step0Cfg);
      const panelWidth = PANEL_CONFIG.text.width;
      const panelHeight = PANEL_CONFIG.text.height;
      const gap = PANEL_CONFIG.gap;

      // Create parent entity to group main and media panels. Position at configured pos
      const panelGroupParent = world.createTransformEntity();
      const pos = opts?.position ?? PANEL_CONFIG.position;
      panelGroupParent.object3D!.position.set(pos.x, pos.y, pos.z);
      panelGroupParent.object3D!.rotateY(opts?.rotationY ?? PANEL_CONFIG.rotationY);
      panelGroupParent.object3D!.userData.isPanelGroup = true;
      // Hide initial group until aligned to avoid visible jump
      try { if (panelGroupParent.object3D) panelGroupParent.object3D.visible = false; } catch (e) {}

      const panelEntity = world
        .createTransformEntity()
        .addComponent(PanelUI, {
          config: step0Cfg,
          maxHeight: panelHeight,
          maxWidth: panelWidth,
        })
        .addComponent(Interactable)
        .addComponent(ScreenSpace, opts?.screenSpace ?? PANEL_CONFIG.screenSpace);
      // Position main panel centered at parent origin
      // (parent center = text panel center)
      panelGroupParent.object3D!.add(panelEntity.object3D!);
      panelEntity.object3D!.position.set(panelWidth / 2, 0, 0);

      // Wait for main panel document to be ready, then create media panel
      // (if configured). This ensures media is positioned with full info.
      const waitForMainAndCreateMedia = (attempts = 0) => {
        try {
          const mainDoc = PanelDocument.data.document[panelEntity.index] as any;
          const mainReady = mainDoc && mainDoc.computedSize && mainDoc.scale && mainDoc.computedSize.width;

          if (!mainReady) {
            if (attempts < 20) setTimeout(() => waitForMainAndCreateMedia(attempts + 1), 50);
            else { try { if (panelGroupParent.object3D) panelGroupParent.object3D.visible = true; } catch (e) {} }
            return;
          }

          // Main panel is ready. If step0 has media, create it now.
          if (step0.mediaUi) {
            const mediaCfg = typeof step0.mediaUi === "string" ? step0.mediaUi : ((step0.mediaUi as any)?.uiUrl ?? step0.mediaUi);
            const mediaOpts = step0.panelOptions ?? PANEL_CONFIG;
            const mediaHeight = PANEL_CONFIG.media.height;

            const createAndAlignMedia = (maxW: number) => {
              const clampedWidth = Math.max(PANEL_CONFIG.media.minWidth, Math.min(PANEL_CONFIG.media.maxWidth, maxW));
              // Media right edge at text panel left edge minus gap
              // Text panel extends from -panelWidth/2 to +panelWidth/2
              const textPanelLeftEdge = -(panelWidth / 2);
              const mediaRightEdge = textPanelLeftEdge - gap;
              const mediaCenterX = mediaRightEdge - (clampedWidth / 2);

              const newMediaPanel = world
                .createTransformEntity()
                .addComponent(PanelUI, {
                  config: mediaCfg,
                  maxHeight: mediaHeight,
                  maxWidth: clampedWidth,
                })
                .addComponent(Interactable)
                .addComponent(ScreenSpace, mediaOpts?.screenSpace ?? PANEL_CONFIG.screenSpace);
              panelGroupParent.object3D!.add(newMediaPanel.object3D!);
              // Offset media to the right slightly
              newMediaPanel.object3D!.position.set(mediaCenterX + 0.40, 0, 0);

              // Now align both panels using rendered sizes
              const alignBoth = (mediaAttempts = 0) => {
                try {
                  const mainDocFinal = PanelDocument.data.document[panelEntity.index] as any;
                  const mediaDocFinal = PanelDocument.data.document[newMediaPanel.index] as any;

                  const mainOk = mainDocFinal && mainDocFinal.computedSize && mainDocFinal.scale;
                  const mediaOk = mediaDocFinal && mediaDocFinal.computedSize && mediaDocFinal.scale;

                  if (!mainOk || !mediaOk) {
                    if (mediaAttempts < 15) setTimeout(() => alignBoth(mediaAttempts + 1), 50);
                    else { try { if (panelGroupParent.object3D) panelGroupParent.object3D.visible = true; } catch (e) {} }
                    return;
                  }

                  // Keep main panel centered at parent origin
                  panelEntity.object3D!.position.set(0, 0, 0);
                  // Adjust media to maintain gap from text panel left edge, with right offset
                  const mediaWidthMeters = (mediaDocFinal.computedSize.width / 100) * mediaDocFinal.scale.x;
                  const textPanelLeft = -(panelWidth / 2);
                  const mediaRight = textPanelLeft - gap;
                  const finalMediaCenterX = mediaRight - (mediaWidthMeters / 2);
                  newMediaPanel.object3D!.position.set(finalMediaCenterX + 0.40, 0, 0);

                  try { if (panelGroupParent.object3D) panelGroupParent.object3D.visible = true; } catch (e) {}
                } catch (e) {
                  if (mediaAttempts < 15) setTimeout(() => alignBoth(mediaAttempts + 1), 50);
                  else { try { if (panelGroupParent.object3D) panelGroupParent.object3D.visible = true; } catch (e) {} }
                }
              };
              setTimeout(() => alignBoth(), 50);
            };

            const mediaSrc = (step0 as any).mediaSrc ?? null;
            if (mediaSrc && /\.(png|jpe?g|webp|gif|bmp)$/i.test(mediaSrc)) {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                const width = (img.width / img.height) * mediaHeight;
                createAndAlignMedia(width);
              };
              img.onerror = () => {
                createAndAlignMedia(PANEL_CONFIG.media.maxWidth);
              };
              img.src = mediaSrc;
            } else {
              createAndAlignMedia(PANEL_CONFIG.media.maxWidth);
            }
          } else {
            // No media panel, just show main panel
            try { if (panelGroupParent.object3D) panelGroupParent.object3D.visible = true; } catch (e) {}
          }
        } catch (e) {
          if (attempts < 20) setTimeout(() => waitForMainAndCreateMedia(attempts + 1), 50);
          else { try { if (panelGroupParent.object3D) panelGroupParent.object3D.visible = true; } catch (e) {} }
        }
      };

      // Trigger the sequence: wait for main, then create media if needed
      setTimeout(() => waitForMainAndCreateMedia(), 50);
    } catch (e) {
      console.warn('[Engine] Initial panel creation failed:', e);
    }
  });
}

bootstrap();
