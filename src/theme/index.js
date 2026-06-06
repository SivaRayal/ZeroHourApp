export const COLORS = {
  // Airport dark theme
  bg: "#0A0C10",
  bgCard: "#0F1218",
  bgElevated: "#141820",
  bgGlass: "rgba(20,24,32,0.85)",

  // Neon accents
  neonGreen: "#00FF88",
  neonBlue: "#00CFFF",
  neonAmber: "#FFB800",
  neonRed: "#FF3B5C",
  neonPurple: "#9B5DE5",
  neonCyan: "#00F5FF",
  neonOrange: "#FF6D00",

  // Text
  textPrimary: "#F0F4FF",
  textSecondary: "#7A8599",
  textDim: "#3D4556",
  textAmber: "#FFB800",

  // Board colors (flip-board style)
  boardBg: "#0C0E14",
  boardText: "#F5E642",
  boardDim: "#2A2D3A",

  // Status
  success: "#00FF88",
  danger: "#FF3B5C",
  warning: "#FFB800",
  info: "#00CFFF",

  // Tab
  tabActive: "#00FF88",
  tabInactive: "#3D4556",
  tabBg: "#0A0C10",

  border: "#1A2035",
};

export const FONTS = {
  // Flipboard/monospace for time displays
  mono: "monospace",
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 28,
    xxxl: 40,
    huge: 56,
    massive: 72,
  },
  weights: {
    light: "300",
    regular: "400",
    medium: "500",
    bold: "700",
    heavy: "900",
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 32,
  full: 999,
};

// Fasting window stages with body change descriptions
export const FASTING_STAGES = [
  {
    hour: 4,
    title: "POST MEAL PHASE",
    subtitle: "Digest & Absorb",
    desc: "Food digestion & absorbing nutrients - ACTIVE. Blood sugar & insulin levels - SPIKED. Energy from food - LOADING. Fat burning - OFF.",
    color: "#00CFFF",
    imageIndex: 1,
  },
  {
    hour: 12,
    title: "EARLY FASTING PHASE",
    subtitle: "Early Fast",
    desc: "Insulin levels - DROPPING. Blood sugar - STABILIZING. Glycogen usage - STARTED. Fat burning - INITIATED.",
    color: "#00FF88",
    imageIndex: 2,
  },
  {
    hour: 16,
    title: "FAT BURNING PHASE",
    subtitle: "Tap into Fat Stores",
    desc: "Glycogen usage - DEPLEATING. Body fat to fuel - IGNITED. Mental clarity - INCREASING. Keton levels - RISING. Hunger - VARIABLE.",
    color: "#FFB800",
    imageIndex: 3,
  },
  {
    hour: 24,
    title: "KETOSIS PHASE",
    subtitle: "Deep Fat Adaptation",
    desc: "Ketosis - ACTIVATED. Fat burning - EFFECIENT. Mental clarity & Focus - PEAK. GH surge - STARTING. Autophagy - INITIATING.",
    color: "#9B5DE5",
    imageIndex: 4,
  },
  {
    hour: 48,
    title: "CELLULAR REPAIR PHASE",
    subtitle: "Cleanse & Restore",
    desc: "Full fat - OXIDATION. Autophagy - ACCELERATING. Cellular repair - OVERDRIVE. Inflamation - REDUCING. Immune system - REJUVENATING.",
    color: "#FF6D00",
    imageIndex: 5,
  },
  {
    hour: 72,
    title: "DEEP HEALING PHASE",
    subtitle: "Renew & Rejuvenate",
    desc: "Deep Cellular - REGENERATING. Immune - RESET. DNA repair - ENHANCED. Longevity pathways - ACTIVATED. Body & Mind - RENEWED.",
    color: "#FF3B5C",
    imageIndex: 6,
  },
];

export const FASTING_WINDOWS = [
  { label: "12:12", hours: 12, desc: "Beginner — Gate Opens" },
  { label: "14:10", hours: 14, desc: "Standard — Short Haul" },
  { label: "16:8", hours: 16, desc: "Popular — Domestic Flight" },
  { label: "18:6", hours: 18, desc: "Advanced — Long Haul" },
  { label: "20:4", hours: 20, desc: "Expert — Intercontinental" },
  { label: "24:0", hours: 24, desc: "Elite — Around the World" },
];
