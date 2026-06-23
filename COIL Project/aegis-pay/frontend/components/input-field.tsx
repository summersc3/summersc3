import React, { useState, forwardRef } from 'react';
import {
  View, TextInput, Text, TouchableOpacity,
  StyleSheet, type TextInputProps,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface Props extends Omit<TextInputProps, 'ref'> {
  label?: string;
  error?: string;
  touched?: boolean;
}

const InputField = forwardRef<TextInput, Props>(({
  label, error, touched, secureTextEntry, style, onFocus, onBlur, ...rest
}, ref) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const hasError = touched && !!error;

  const borderColor = hasError
    ? Colors.border.error
    : focused
      ? Colors.border.focus
      : Colors.border.default;

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.row, { borderColor }]}>
        <TextInput
          ref={ref}
          style={[styles.input, { outlineWidth: 0, outlineStyle: 'none' as any }, style]}
          placeholderTextColor={Colors.text.placeholder}
          secureTextEntry={secureTextEntry && !show}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
          suppressHighlighting={true}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShow(v => !v)} style={styles.eye}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons 
              name={show ? 'eye' : 'eye-off'} 
              size={20} 
              color={Colors.text.secondary} 
            />
          </TouchableOpacity>
        )}
      </View>
      {hasError && (
        <View style={styles.errRow}>
          <Text style={styles.errDot}>●</Text>
          <Text style={styles.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
});

InputField.displayName = 'InputField';
export default InputField;

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.base },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.text.primary,
    height: '100%',
  },
  eye: { padding: 4 },
  errRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  errDot: { fontSize: 6, color: Colors.status.error, lineHeight: 14 },
  errText: { fontSize: Typography.fontSizes.xs, color: Colors.status.error, flex: 1 },
});
