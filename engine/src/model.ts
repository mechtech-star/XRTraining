import { createComponent } from "@iwsdk/core";
import { DEFAULT_STEPS, createModelSystem } from "./steps.js";

export const Model = createComponent("Model", {});

// Export a ModelSystem class built from the default steps so older imports
// that expect `ModelSystem` continue to work.
export const ModelSystem = createModelSystem(DEFAULT_STEPS);
