// Font configuration matching the web version
// Web uses: Playfair Display (headings), Merriweather (secondary headings), Inter (body)

export const FontConfig = {
  display: {
    regular: 'PlayfairDisplay_400Regular',
    medium: 'PlayfairDisplay_500Medium',
    semibold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
    extrabold: 'PlayfairDisplay_800ExtraBold',
    black: 'PlayfairDisplay_900Black',
  },
  heading: {
    light: 'Merriweather_300Light',
    regular: 'Merriweather_400Regular',
    bold: 'Merriweather_700Bold',
    black: 'Merriweather_900Black',
  },
  body: {
    light: 'Inter_300Light',
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
};

// Typography styles matching web design system
export const Typography = {
  // Display headings (Playfair Display)
  displayLarge: {
    fontFamily: FontConfig.display.bold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  },
  displayMedium: {
    fontFamily: FontConfig.display.bold,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontFamily: FontConfig.display.semibold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  
  // Headings (Merriweather)
  heading1: {
    fontFamily: FontConfig.heading.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  heading2: {
    fontFamily: FontConfig.heading.bold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  heading3: {
    fontFamily: FontConfig.heading.bold,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: 0,
  },
  heading4: {
    fontFamily: FontConfig.heading.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  
  // Body text (Inter)
  bodyLarge: {
    fontFamily: FontConfig.body.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  bodyMedium: {
    fontFamily: FontConfig.body.regular,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  bodySmall: {
    fontFamily: FontConfig.body.regular,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  
  // Button text
  button: {
    fontFamily: FontConfig.body.semibold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontFamily: FontConfig.body.semibold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  
  // Labels and captions
  label: {
    fontFamily: FontConfig.body.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  caption: {
    fontFamily: FontConfig.body.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  
  // Badge text
  badge: {
    fontFamily: FontConfig.body.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};

// Museum color palette from web
export const Colors = {
  // Primary colors
  primary: '#6e4a2e',
  primaryLight: '#8b5a3c',
  primaryDark: '#5a3d26',
  
  // Neutrals
  white: '#f8f5f0',
  cream: '#f5f2ed',
  parchment: '#f2efea',
  
  // Grays
  gray50: '#f8f5f0',
  gray100: '#f2efea',
  gray200: '#e8e2d8',
  gray300: '#d4c9b8',
  gray400: '#b8a688',
  gray500: '#9c8668',
  gray600: '#7d6b4f',
  gray700: '#6e4a2e',
  gray800: '#3d2817',
  gray900: '#1a0f08',
  
  // Accent
  accent: '#d4b48a',
  accentHover: '#c9a876',
  accentLight: '#f0e6d2',
  gold: '#d4b48a',
  goldDark: '#b8956f',
  goldLight: '#e6d7c3',
  
  // Text
  textPrimary: '#1a0f08',
  textSecondary: '#3d2817',
  textMuted: '#7d6b4f',
  textInverse: '#f8f5f0',
  textAccent: '#6e4a2e',
  
  // Semantic
  success: '#7d8471',
  warning: '#d4b48a',
  error: '#a0522d',
  info: '#8b7355',
};
