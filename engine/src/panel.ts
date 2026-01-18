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
import { buildSteps, DEFAULT_STEPS } from "./steps.js";

export function createPanelSystem(steps = DEFAULT_STEPS) {
  // Build queries dynamically from provided steps so the number of steps can change
  const PANEL_QUERIES: any = (() => {
    const q: Record<string, any> = {};
    // a generic panels query to find any PanelUI
    q.panels = { required: [PanelUI] };
    // per-step queries (e.g. step0Panel, step1Panel, ...) and media panels per step
    steps.forEach((step) => {
      // support either a string config or an object with a uiUrl property
      const cfg = typeof step.ui === "string" ? step.ui : (step.ui && (step.ui as any).uiUrl ? (step.ui as any).uiUrl : step.ui);
      q[step.id] = {
        required: [PanelUI, PanelDocument],
        where: [eq(PanelUI, "config", cfg)],
      };

      // media panel config (optional)
      const mediaCfg = step.mediaUi
        ? (typeof step.mediaUi === "string"
            ? step.mediaUi
            : (step.mediaUi && (step.mediaUi as any).uiUrl ? (step.mediaUi as any).uiUrl : step.mediaUi))
        : null;
      if (mediaCfg) {
        q[`${step.id}_media`] = {
          required: [PanelUI, PanelDocument],
          where: [eq(PanelUI, "config", mediaCfg)],
        };
      }
    });
    return q;
  })();

  return class PanelSystem extends createSystem(PANEL_QUERIES) {
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

        // --- Media-panel specific layout fixes ---
        // Detect media panel queries which are wired with a suffix '_media'
        const isMediaPanel = stepKey.endsWith("_media");
        let baseStepId = stepKey;
        if (isMediaPanel) baseStepId = stepKey.replace(/_media$/, "");
        const baseStep = steps.find((s: any) => s.id === baseStepId);
        if (isMediaPanel && baseStep) {
          try {
            // If the runtime step provides a mediaSrc we can compute aspect ratio
            const mediaSrc = (baseStep as any).mediaSrc;

            // Normalize: find the root class name for this document
            const rootClass = (document.element && (document.element as any).properties && (document.element as any).properties.class) || null;
            const mediaFlag = (document.element && (document.element as any).properties && (document.element as any).properties.mediaPanel) === true;

            // Apply layout tweaks only when the template explicitly marks itself as a media panel
            // (or as a fallback when using the old 'panel-root' class).
            const shouldApply = mediaFlag || rootClass === 'panel-root';
            if (shouldApply && rootClass && document.classes && document.classes[rootClass] && document.classes[rootClass].content) {
              const c = document.classes[rootClass].content;
              // reduce explicit horizontal padding while preserving vertical padding
              c.paddingLeft = c.paddingRight = c.paddingLeft ?? c.padding ?? 0.12;
              // ensure children stretch horizontally
              c.alignItems = 'stretch';
            }

            // Find an image-like class (heuristic: a class key that begins with '__id__')
            let imageClassKey: string | null = null;
            if (document.classes) {
              for (const k of Object.keys(document.classes)) {
                if (k.startsWith('__id__')) {
                  imageClassKey = k;
                  break;
                }
              }
            }

            if (imageClassKey && document.classes[imageClassKey] && document.classes[imageClassKey].content) {
              const imgStyle = document.classes[imageClassKey].content;
              // Make image stretch horizontally
              imgStyle.width = '100%';
              imgStyle.objectFit = imgStyle.objectFit ?? 'contain';

              // If we have a mediaSrc and it's an image, preload to compute aspect and set height accordingly
              if (mediaSrc && /\.(png|jpe?g|webp|gif|bmp)$/i.test(mediaSrc)) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  try {
                    const parentMaxH = (document && document.props && document.props.maxHeight) || null;
                    // Fallback max height (world units) - match PANEL_CONFIG default
                    const maxH = parentMaxH ?? PANEL_CONFIG.maxHeight;
                    const computedWidth = (img.width / img.height) * maxH;
                    imgStyle.height = String(maxH);
                    // ensure panel entity width resolver uses the image width by setting a suggested maxWidth
                    if (entity && entity.entity) {
                      try {
                        const panelEntity = (entity as any).entity;
                        if (panelEntity && panelEntity.getComponent) {
                          // set an instance property to hint maxWidth (SDK-specific)
                          (panelEntity as any)._suggestedMaxWidth = computedWidth;
                          try {
                            // Also store the media's intrinsic/preferred width so
                            // layout code can position panels based on the
                            // actual media size while keeping clamp bounds.
                            if (panelEntity.object3D) {
                              (panelEntity.object3D as any).userData.preferredWidth = computedWidth;
                            }
                          } catch (e) {}
                        }
                      } catch (e) {}
                    }
                  } catch (e) {
                    console.warn('[PanelSystem] media sizing failed:', e);
                  }
                };
                img.onerror = () => {
                  // fallback: leave height auto
                };
                img.src = mediaSrc;
              } else {
                // no media src - ensure height auto
                imgStyle.height = imgStyle.height ?? 'auto';
              }
            }
          } catch (e) {
            console.warn('[PanelSystem] media layout hook failed:', e);
          }
        }

        // Enforce fixed sizing for text panels (clip overflow) when not a media panel
        if (!isMediaPanel) {
          try {
            const rootClass2 = (document.element && (document.element as any).properties && (document.element as any).properties.class) || null;
            if (rootClass2 && document.classes && document.classes[rootClass2] && document.classes[rootClass2].content) {
              const tc = document.classes[rootClass2].content;
              tc.width = tc.width ?? String(PANEL_CONFIG.text.width);
              tc.height = tc.height ?? String(PANEL_CONFIG.text.height);
              tc.overflow = 'hidden';
              tc.overflowX = 'hidden';
              tc.overflowY = 'hidden';
              tc.alignItems = tc.alignItems ?? 'stretch';
            }
          } catch (e) {
            console.warn('[PanelSystem] text panel sizing hook failed:', e);
          }
        }

        const step = steps.find(s => s.id === stepKey);
        const actions = step?.buttons || {};
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
              const targetStep = steps.find(s => s.id === target);
              if (!targetStep) return;
              const opts = targetStep.panelOptions;
              // prefer a uiUrl property when present
              const targetCfg = typeof targetStep!.ui === "string" ? targetStep!.ui : ((targetStep!.ui as any)?.uiUrl ?? targetStep!.ui);
              console.log('[PanelSystem] Creating panel with config:', targetCfg);
              
              const panelWidth = PANEL_CONFIG.text.width;
              const panelHeight = PANEL_CONFIG.text.height;
              const gap = PANEL_CONFIG.gap;

              // Create parent entity to group main and media panels. The parent
              // is positioned at the midpoint between panels so children are
              // placed relative to that center (not offset by their own widths).
              const panelGroupParent = this.world.createTransformEntity();

              // Hide group until positioned to avoid visible jumping on first render
              try {
                if (panelGroupParent.object3D) panelGroupParent.object3D.visible = false;
              } catch (e) {}

              const pos = opts?.position ?? PANEL_CONFIG.position;
              panelGroupParent.object3D!.position.set(pos.x, pos.y, pos.z);
              panelGroupParent.object3D!.rotateY(opts?.rotationY ?? PANEL_CONFIG.rotationY);
              panelGroupParent.object3D!.userData.isPanelGroup = true;

              const newPanelEntity = this.world
                .createTransformEntity()
                .addComponent(PanelUI, {
                  config: targetCfg,
                  maxHeight: panelHeight,
                  maxWidth: panelWidth,
                })
                .addComponent(Interactable)
                .addComponent(ScreenSpace, opts?.screenSpace ?? PANEL_CONFIG.screenSpace);
              // Add main panel as a child of the centered parent. We'll position
              // it after computing the media width so both panels are centered
              // around the parent's origin. Start at origin (centered) for single-panel case.
              panelGroupParent.object3D!.add(newPanelEntity.object3D!);
              // Position main panel so its left edge aligns with the
              // parent's origin. This anchors the whole group to a fixed
              // point in space (the left edge of the text panel) so the
              // UI doesn't shift when media sizes change.
              newPanelEntity.object3D!.position.set(0, 0, 0);

              // Align panels helper: waits for documents to compute their
              // actual sizes, then repositions main + media so the gap is
              // stable and both panels are anchored to a fixed point.
              const alignPanels = (mainEntity: any, mediaEntity: any | null, gapVal: number, attempts = 0) => {
                try {
                  const maxAttempts = 12;
                  const mainDoc = mainEntity ? PanelDocument.data.document[mainEntity.index] as any : null;
                  const mediaDoc = mediaEntity ? PanelDocument.data.document[mediaEntity.index] as any : null;

                  const mainReady = mainDoc && mainDoc.computedSize && mainDoc.scale && mainDoc.computedSize.width;
                  const mediaReady = !mediaEntity || (mediaDoc && mediaDoc.computedSize && mediaDoc.scale && mediaDoc.computedSize.width);

                  if (!mainReady || !mediaReady) {
                    if (attempts < maxAttempts) {
                      setTimeout(() => alignPanels(mainEntity, mediaEntity, gapVal, attempts + 1), 50);
                    }
                    return;
                  }

                  const mainWidthMeters = (mainDoc.computedSize.width / 100) * mainDoc.scale.x;
                  const mediaWidthMeters = mediaEntity ? (mediaDoc.computedSize.width / 100) * mediaDoc.scale.x : 0;

                  // Keep main panel centered at parent origin
                  if (mainEntity && mainEntity.object3D) {
                    mainEntity.object3D.position.set(0, 0, 0);
                  }

                  // Place media so its right edge sits at the text panel's
                  // left edge minus gap. Text panel left edge is at -panelWidth/2.
                  if (mediaEntity && mediaEntity.object3D) {
                    const textPanelLeftEdge = -(panelWidth / 2);
                    const mediaRightEdge = textPanelLeftEdge - gapVal;
                    const mediaCenterX = mediaRightEdge - (mediaWidthMeters / 2);
                    // Offset media to the right slightly
                    mediaEntity.object3D.position.set(mediaCenterX + 0.40, 0, 0);
                  }

                  // Show group now that alignment is complete
                  try { if (panelGroupParent.object3D) panelGroupParent.object3D.visible = true; } catch (e) {}
                } catch (e) {
                  if (attempts < 12) setTimeout(() => alignPanels(mainEntity, mediaEntity, gapVal, attempts + 1), 50);
                  else { try { if (panelGroupParent.object3D) panelGroupParent.object3D.visible = true; } catch (e) {} }
                }
              };

              // Create associated media panel for the target step (if configured)
              const mediaCfg = targetStep.mediaUi
                ? (typeof targetStep.mediaUi === "string"
                    ? targetStep.mediaUi
                    : ((targetStep.mediaUi as any)?.uiUrl ?? targetStep.mediaUi))
                : null;
              if (mediaCfg) {
                const mediaOpts = targetStep.panelOptions ?? PANEL_CONFIG;
                const mediaHeight = PANEL_CONFIG.media.height;
                console.log('[PanelSystem] Creating media panel with config:', mediaCfg, 'mediaSrc:', (targetStep as any).mediaSrc);

                const createMedia = (maxW: number) => {
                  // Clamp width to min/max constraints
                  // Use the media's intrinsic width (`maxW`) as the preferred
                  // width for positioning so the visual alignment follows the
                  // media's aspect. The actual panel width used by the UI
                  // remains clamped between min/max bounds.
                  const preferredWidth = maxW;
                  const clampedWidth = Math.max(PANEL_CONFIG.media.minWidth, Math.min(PANEL_CONFIG.media.maxWidth, preferredWidth));

                  // Compute target so the media panel's RIGHT edge always
                  // aligns to a fixed point near the text panel's LEFT edge.
                  // Use the preferred (intrinsic) width for centering so the
                  // layout follows media size even when the rendered panel is
                  // clamped.
                  // Anchor the media's RIGHT edge at `-gap` relative to the
                  // parent's origin (which is the text-panel left edge).
                  // Use the clamped (rendered) width to compute the center
                  // so the right edge stays fixed and the UI doesn't slide.
                  const mediaRightEdge = -gap;
                  const mediaCenterX = mediaRightEdge - (clampedWidth / 2);

                  // Ensure main panel remains positioned with its left edge
                  // anchored at the parent origin.
                  newPanelEntity.object3D!.position.set(panelWidth / 2, 0, 0);

                  const newMediaPanel = this.world
                    .createTransformEntity()
                    .addComponent(PanelUI, {
                      config: mediaCfg,
                      maxHeight: mediaHeight,
                      maxWidth: clampedWidth,
                      // hint the panel of the media's preferred width when
                      // supported by the runtime. This allows the UI to pick
                      // the intrinsic size and still respect min/max bounds.
                      preferredWidth: preferredWidth,
                    })
                    .addComponent(Interactable)
                    .addComponent(ScreenSpace, mediaOpts?.screenSpace ?? PANEL_CONFIG.screenSpace);
                  // Position media panel relative to parent origin (to the right).
                  // Some coordinate systems render positive X to the left, so
                  // add the media and place its center so its right edge
                  // hits the fixed `mediaRightEdge` point.
                  panelGroupParent.object3D!.add(newMediaPanel.object3D!);
                  try {
                    if (newMediaPanel.object3D) (newMediaPanel.object3D as any).userData.preferredWidth = preferredWidth;
                  } catch (e) {}
                  newMediaPanel.object3D!.position.set(mediaCenterX, 0, 0);

                  // Align panels once rendered sizes are available
                  alignPanels(newPanelEntity, newMediaPanel, gap);
                };

                const mediaSrc = (targetStep as any).mediaSrc ?? null;
                if (mediaSrc && /\.(png|jpe?g|webp|gif|bmp)$/i.test(mediaSrc)) {
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.onload = () => {
                    const width = (img.width / img.height) * mediaHeight;
                    createMedia(width);
                  };
                  img.onerror = () => {
                    createMedia(PANEL_CONFIG.media.maxWidth);
                  };
                  img.src = mediaSrc;
                } else {
                  createMedia(PANEL_CONFIG.media.maxWidth);
                  // For the single-panel case, align using the main document
                  setTimeout(() => alignPanels(newPanelEntity, null, gap), 50);
                }
              }

              // Destroy any panels belonging to the current step (main + media)
              const currentMainQuery = (this.queries as any)[stepKey];
              if (currentMainQuery && currentMainQuery.entities) {
                currentMainQuery.entities.forEach((e: any) => e.destroy());
              }
              const currentMediaQuery = (this.queries as any)[`${stepKey}_media`];
              if (currentMediaQuery && currentMediaQuery.entities) {
                currentMediaQuery.entities.forEach((e: any) => e.destroy());
              }
            }
          });
        });
      });
    };

    // wire all steps dynamically (wire both main + media queries)
    steps.forEach((step) => {
      wireStep(step.id, (this.queries as any)[step.id]);
      wireStep(`${step.id}_media`, (this.queries as any)[`${step.id}_media`]);
    });
  }

  update() {
    // Collect all parent groups (marked with isPanelGroup) and rotate them
    const parentGroups = new Set();
    this.queries.panels.entities.forEach((entity) => {
      const obj = entity.object3D!;
      // Find the parent group if this panel is a child of one
      if (obj.parent && obj.parent.userData && obj.parent.userData.isPanelGroup) {
        parentGroups.add(obj.parent);
      }
    });
    
    // Rotate only the parent groups, not individual panels
    parentGroups.forEach((parentObj: any) => {
      this.player.head.getWorldPosition(this.lookAtTarget);
      parentObj.getWorldPosition(this.vec3);
      this.lookAtTarget.y = this.vec3.y;
      parentObj.lookAt(this.lookAtTarget);
    });
  }
};
}
