export const colors = {
  navy900: "#061827",
  navy800: "#08233A",
  navy700: "#0B2D4A",
  gold500: "#D6AA45",
  gold300: "#F2C766",
  white: "#FFFFFF",
  cardSoft: "#F7FAFF",
  softBlue: "#EAF3FF",
  softBlueAlt: "#F1F7FF",
  textDark: "#07172C",
  textMuted: "#617085",
  success: "#2E9B62",
  danger: "#C83A3A",
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typography = {
  titleLarge: {
    fontSize: 36,
    fontWeight: "800",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
} as const;

export const gsnTokens = {
  colors,
  spacing,
  radius,
  typography,
} as const;
