import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { validateLoginForm, type LoginForm, type FormErrors } from '@/src/utils/validation';
import InputField from '@/components/input-field';
import PrimaryButton from '@/components/primary-button';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

const EMPTY: LoginForm = { email: '', password: '' };

export default function LoginScreen() {
  const { login } = useAuth();
  const [form, setForm]       = useState<LoginForm>(EMPTY);
  const [errors, setErrors]   = useState<FormErrors<LoginForm>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof LoginForm, boolean>>>({});
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleChange = useCallback(<K extends keyof LoginForm>(field: K, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) {
      const e = validateLoginForm(next);
      setErrors(prev => ({ ...prev, [field]: e[field] }));
    }
  }, [form, touched]);

  const handleBlur = useCallback((field: keyof LoginForm) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const e = validateLoginForm(form);
    setErrors(prev => ({ ...prev, [field]: e[field] }));
  }, [form]);

  const handleSubmit = async () => {
    setTouched({ email: true, password: true });
    const e = validateLoginForm(form);
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await login(form.email, form.password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login failed', err.message ?? 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.logo}>Aegis Pay</Text>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.sub}>Sign in to your account to continue</Text>
        </View>

        {/* ── Form card ── */}
        <View style={styles.card}>
          {/* ── Inputs Card ── */}
          <View style={styles.inputsCard}>
            <InputField
              label="Email address"
              value={form.email}
              onChangeText={v => handleChange('email', v)}
              onBlur={() => handleBlur('email')}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              touched={touched.email}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <InputField
              ref={passwordRef}
              label="Password"
              value={form.password}
              onChangeText={v => handleChange('password', v)}
              onBlur={() => handleBlur('password')}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="password"
              error={errors.password}
              touched={touched.password}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>



          {/* ── Action Buttons ── */}
          <View style={styles.buttonGroup}>
            <PrimaryButton
              title="Login"
              onPress={handleSubmit}
              loading={loading}
              variant="solid"
            />
            <PrimaryButton
              title="Create Account"
              onPress={() => router.push('/(auth)/sign-up')}
              variant="outline"
              disabled={loading}
            />
          </View>

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1 },

  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxxl + Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center' },
  logo:   { fontSize: Typography.fontSizes.xxl, fontWeight: Typography.fontWeights.bold, color: '#fff', letterSpacing: 0.5, marginBottom: Spacing.lg },
  title:  { fontSize: Typography.fontSizes.xxl, fontWeight: Typography.fontWeights.bold, color: '#fff', marginBottom: Spacing.xs },
  sub:    { fontSize: Typography.fontSizes.base, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  card:   { flex: 1, backgroundColor: Colors.offWhite, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: Spacing.xl, paddingTop: Spacing.xxl, minHeight: 480 },

  inputsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },

  forgot:    { alignSelf: 'flex-end', marginTop: -Spacing.sm, marginBottom: Spacing.base },
  forgotTxt: { fontSize: Typography.fontSizes.sm, color: Colors.primaryLight, fontWeight: Typography.fontWeights.medium },

  buttonGroup: { flexDirection: 'column', gap: Spacing.sm, marginBottom: Spacing.lg },

  btn: { marginTop: Spacing.sm, marginBottom: Spacing.lg },

  footer:    { flexDirection: 'row', justifyContent: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.offWhite },
  footerTxt: { fontSize: Typography.fontSizes.sm, color: Colors.text.secondary },
  footerLink:{ fontSize: Typography.fontSizes.sm, color: Colors.primary, fontWeight: Typography.fontWeights.semibold },
});