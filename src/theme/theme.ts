// Single source of truth for color, spacing, and type so every screen reads
// from the same scale instead of picking one-off values.

export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E4E7EC',
  placeholder: '#EEF1F5',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  accent: '#2F6FED',
  accentMuted: '#E8EFFE',
  danger: '#DC2626',
  dangerMuted: '#FDECEC',
  onAccent: '#FFFFFF',
} as const;

// 4px base unit -- every margin/padding in the app should be one of these.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const type = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.textPrimary },
  subtitle: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary },
  button: { fontSize: 16, fontWeight: '600' as const },
};
