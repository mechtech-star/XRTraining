import { PANEL_CONFIG } from "./panelConfig.js";

export type PanelOptions = {
    maxHeight?: number;
    maxWidth?: number;
    screenSpace?: Record<string, string>;
    position?: { x: number; y: number; z: number };
    rotationY?: number;
};

export const STEPS: Record<
    string,
    { ui: string; panelOptions: PanelOptions | null }
> = {
    step0Panel: {
        ui: "./ui/step-0.json",
        panelOptions: {
            maxHeight: PANEL_CONFIG.maxHeight,
            maxWidth: PANEL_CONFIG.maxWidth,
            screenSpace: PANEL_CONFIG.screenSpace,
            position: PANEL_CONFIG.position,
            rotationY: PANEL_CONFIG.rotationY,
        },
    },
    step1Panel: {
        ui: "./ui/step-1.json",
        panelOptions: {
            maxHeight: PANEL_CONFIG.maxHeight,
            maxWidth: PANEL_CONFIG.maxWidth,
            screenSpace: PANEL_CONFIG.screenSpace,
            position: PANEL_CONFIG.position,
            rotationY: PANEL_CONFIG.rotationY,
        },
    },
    step2Panel: {
        ui: "./ui/step-2.json",
        panelOptions: {
            maxHeight: 0.8,
            maxWidth: 1.6,
            screenSpace: { top: "20px", right: "20px", height: "40%" },
            position: PANEL_CONFIG.position,
            rotationY: PANEL_CONFIG.rotationY,
        },
    },
};

export const ASSET_ANIMATIONS: Record<string, Record<string, string | null>> = {
    cube: {
        step0Panel: null,
        step1Panel: "cubeanimation1",
        step2Panel: "cubeanimation2",
    },
};

// Button action configuration per step. Keys are element ids inside the
// UIKit document. Action types:
// - { action: 'goto', target: '<stepKey>' }
// - { action: 'launchXR' }
// - { action: 'launchOrGoto', target: '<stepKey>' } // launch XR if not immersive, otherwise goto
export type ButtonAction =
    | { action: "goto"; target: string }
    | { action: "launchXR" }
    | { action: "launchOrGoto"; target: string };

export const BUTTON_ACTIONS: Record<string, Record<string, ButtonAction>> = {
    step0Panel: {
        "xr-button": { action: "launchOrGoto", target: "step1Panel" },
    },
    step1Panel: {
        "next-button": { action: "goto", target: "step2Panel" },
        "back-button": { action: "goto", target: "step0Panel" },
    },
    step2Panel: {
        "next-button": { action: "goto", target: "step0Panel" },
        "back-button": { action: "goto", target: "step1Panel" },
    },
};

export default STEPS;
