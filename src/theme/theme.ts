export const theme = {
  colors: {
    background: '#121212',
    surface: '#1E1E1E',
    primary: '#BB86FC',
    secondary: '#03DAC6',
    error: '#CF6679',
    text: '#FFFFFF',
    textSecondary: '#B3B3B3',
    border: '#2C2C2C',
    success: '#4BB543',
    card: '#242424',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' as const, color: '#FFFFFF', fontFamily: 'Inter-Bold' },
    h2: { fontSize: 24, fontWeight: 'bold' as const, color: '#FFFFFF', fontFamily: 'Inter-Bold' },
    h3: { fontSize: 20, fontWeight: '600' as const, color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
    body: { fontSize: 16, fontWeight: 'normal' as const, color: '#FFFFFF', fontFamily: 'Inter-Regular' },
    caption: { fontSize: 14, fontWeight: 'normal' as const, color: '#B3B3B3', fontFamily: 'Inter-Medium' },
    small: { fontSize: 12, fontWeight: 'normal' as const, color: '#B3B3B3', fontFamily: 'Inter-Regular' },
  },

  borderRadius: {
    sm: 4,
    md: 12,
    lg: 16,
    round: 9999,
  }
};
