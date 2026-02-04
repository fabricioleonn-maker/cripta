// Stitch Design System Tokens
// Based on VOKE's secure aesthetic (Dark Mode First)

export const Colors = {
  // Brand
  BrandPrimary: '#00F0FF', // Cyber Cyan - Core Action
  BrandSecondary: '#7000FF', // Deep Purple - Secondary Action
  
  // Backgrounds
  BgRoot: '#0D0D11', // Deepest user-facing background
  BgSurface: '#16161E', // Cards, lists
  BgElevated: '#21212B', // Modals, popups
  
  // Text
  TextPrimary: '#FFFFFF',
  TextSecondary: '#A0A0B0',
  TextDisabled: '#505060',
  TextInverse: '#000000',

  // Status
  StatusSuccess: '#00FF94',
  StatusWarning: '#FFB800',
  StatusError: '#FF4D4D',
  StatusInfo: '#3D8CFF',

  // Border & Dividers
  BorderSubtle: '#ffffff1a', // 10% white
  BorderFocus: '#00F0FF80', // 50% brand
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  fontFamily: {
    regular: 'System', // Replace with custom font if needed (Inter/Roboto)
    bold: 'System',
    mono: 'System', // Code/monospace
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  weight: {
    regular: '400',
    medium: '500',
    bold: '700',
  }
};
