/**
 * Token Motion & Animasi Terstandar Altcycles
 * Mengikuti prinsip Zero-Layout-Shift, 60 FPS GPU acceleration (transform & opacity),
 * dan kepatuhan penuh terhadap preferensi aksesibilitas prefers-reduced-motion.
 */

export const MOTION_DURATIONS = {
  instant: 0.1, // 100ms
  fast: 0.15, // 150ms
  normal: 0.2, // 200ms
  relaxed: 0.3, // 300ms
  slow: 0.5, // 500ms
} as const;

export const MOTION_SPRINGS = {
  // Snappy spring untuk micro-interaction tab & pill indicator
  snappy: {
    type: "spring" as const,
    stiffness: 500,
    damping: 35,
    mass: 0.8,
  },
  // Smooth spring untuk sidebar & accordion
  smooth: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
    mass: 1,
  },
  // Gentle spring untuk modal dialog & overlay popups
  gentle: {
    type: "spring" as const,
    stiffness: 300,
    damping: 28,
  },
} as const;

export const MOTION_EASINGS = {
  // Kurva bezier cubic standar untuk dialog entrance
  outQuint: "cubic-bezier(0.16, 1, 0.3, 1)",
  outExpo: "cubic-bezier(0.19, 1, 0.22, 1)",
  inOutCubic: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

export const MOTION_CLASSES = {
  // Press feedback untuk tombol & icon button
  pressable:
    "active:scale-[0.98] transition-all duration-100 ease-out motion-reduce:transform-none motion-reduce:transition-none",
  // Transisi entrance & exit modal dialog
  dialogContent:
    "duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:animate-none",
  // Transisi overlay backdrop modal dialog
  dialogOverlay:
    "duration-200 ease-out animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none",
} as const;
