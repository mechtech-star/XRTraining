import { PANEL_CONFIG } from "./panelConfig.js";

export type PanelOptions = {
    maxHeight?: number;
    maxWidth?: number;
    screenSpace?: Record<string, string>;
    position?: { x: number; y: number; z: number };
    rotationY?: number;
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

export type Step = {
    id: string;
    stepNumber: number;
    ui: string | { uiUrl: string };
    panelOptions: PanelOptions | null;
    assets: Record<string, { animation: string | null }>;
    buttons: Record<string, ButtonAction>;
};

export const STEPS: Step[] = [
    {
        id: 'step1Panel',
        stepNumber: 0,
        ui: { uiUrl: "http://localhost:8000/media/published_modules/test-001-413937dc-e3ce-4468-8d7e-6b6da632a09e-step-1.json" },
        panelOptions: {
            maxHeight: PANEL_CONFIG.maxHeight,
            maxWidth: PANEL_CONFIG.maxWidth,
            screenSpace: PANEL_CONFIG.screenSpace,
            position: PANEL_CONFIG.position,
            rotationY: PANEL_CONFIG.rotationY,
        },
        assets: {
            model: { animation: "cubeanimation1" },
            robot: { animation: null },
        },
        buttons: {
            "next-button": { action: "goto", target: "step2Panel" },
            "back-button": { action: "goto", target: "step2Panel" },
        },
    },
    {
        id: 'step2Panel',
        stepNumber: 1,
        ui: { uiUrl: "http://localhost:8000/media/published_modules/test-001-413937dc-e3ce-4468-8d7e-6b6da632a09e-step-2.json" },
        panelOptions: {
            maxHeight: 0.8,
            maxWidth: 1.6,
            screenSpace: { top: "20px", right: "20px", height: "40%" },
            position: PANEL_CONFIG.position,
            rotationY: PANEL_CONFIG.rotationY,
        },
        assets: {
            model: { animation: "cubeanimation2" },
            robot: { animation: null },
        },
        buttons: {
            "next-button": { action: "goto", target: "step3Panel" },
            "back-button": { action: "goto", target: "step1Panel" },
        },
    },
    {
        id: 'step3Panel',
        stepNumber: 3,
        ui: { uiUrl: "http://localhost:8000/media/published_modules/test-001-413937dc-e3ce-4468-8d7e-6b6da632a09e-step-3.json" },
        panelOptions: {
            maxHeight: 0.8,
            maxWidth: 1.6,
            screenSpace: { top: "20px", right: "20px", height: "40%" },
            position: PANEL_CONFIG.position,
            rotationY: PANEL_CONFIG.rotationY,
        },
        assets: {
            model: { animation: "cubeanimation2" },
            robot: { animation: null },
        },
        buttons: {
            "next-button": { action: "goto", target: "step1Panel" },
            "back-button": { action: "goto", target: "step2Panel" },
        },
    },
];

export const TOTAL_STEPS = STEPS.length;

export default STEPS;
