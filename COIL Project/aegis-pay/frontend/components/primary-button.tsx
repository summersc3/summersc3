import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, type ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  style?: ViewStyle;
}

export default function PrimaryButton({
  title, onPress, loading = false, disabled = false,
  variant = 'solid', style,
}: Props) {
  const off = disabled || loading;
  const solid = variant === 'solid';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      activeOpacity={0.85}
      style={[
        styles.base,
        solid ? styles.solid : styles.outline,
        off && (solid ? styles.solidOff : styles.outlineOff),
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={solid ? '#fff' : Colors.primary} size="small" />
        : <Text style={[styles.text, solid ? styles.solidTxt : styles.outlineTxt, off && styles.offTxt]}>
            {title}
          </Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  solid:      { backgroundColor: Colors.primary },
  outline:    { borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: 'transparent' },
  solidOff:   { backgroundColor: Colors.lightGray },
  outlineOff: { borderColor: Colors.lightGray },
  text:       { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semibold, letterSpacing: 0.3 },
  solidTxt:   { color: '#fff' },
  outlineTxt: { color: Colors.primary },
  offTxt:     { color: Colors.text.muted },
});
