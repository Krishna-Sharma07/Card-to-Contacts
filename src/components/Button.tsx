import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, space, type } from '../theme/theme';

type Variant = 'primary' | 'outline' | 'ghost';

type Props = {
  testID?: string;
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Shared so the whole app uses exactly one accent treatment (primary) and
// one neutral treatment (outline/ghost) instead of each screen inventing
// its own button look.
function Button({ testID, label, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      android_ripple={{ color: rippleColor(variant) }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && variant === 'ghost' && styles.ghostPressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.accent} />
      ) : (
        <Text style={[styles.label, textVariantStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

function rippleColor(variant: Variant): string {
  if (variant === 'primary') {
    return 'rgba(255,255,255,0.24)';
  }
  return colors.accentMuted;
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
  ghostPressed: {
    backgroundColor: colors.accentMuted,
  },
  label: {
    ...type.button,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.accent,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: 40,
    paddingHorizontal: space.sm,
  },
});

const textVariantStyles = StyleSheet.create({
  primary: {
    color: colors.onAccent,
  },
  outline: {
    color: colors.textPrimary,
  },
  ghost: {
    color: colors.accent,
  },
});

export default Button;
