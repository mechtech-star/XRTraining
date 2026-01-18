export const PANEL_CONFIG = {
  // ScreenSpace anchoring / CSS-like values
  screenSpace: {
    top: "20px",
    right: "20px",
    height: "40%",
  },
  // World-space position for the panel (user's right)
  position: {
    x: 1.8,
    y: 1.29,
    z: -0.3,
  },
  // Rotation around Y axis (radians)
  rotationY: -1.5,
  
  // Text panel sizing (constant width and height)
  text: {
    height: 0.8,
    width: 2,
  },
  
  // Media panel sizing (constant height, auto width with constraints)
  media: {
    height: 0.8,  // Must match text.height
    minWidth: 0.5,
    maxWidth: 2.0,
  },
  
  // Gap between panels
  gap: 0.001,
  
  // Deprecated: use text.height/width or media.height instead
  maxHeight: 0.8,
  maxWidth: 2,
};
