import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  Animated,
} from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth, type RegisterPayload } from "@/hooks/use-auth";
import {
  validateRegisterForm,
  getPasswordStrength,
  type RegisterForm,
  type FormErrors,
} from "@/src/utils/validation";
import InputField from "@/components/input-field";
import PrimaryButton from "@/components/primary-button";
import { Colors, Typography, Spacing, BorderRadius } from "@/constants/theme";

const EMPTY: RegisterForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

// Supported countries for phone registration. Extend this list to add more.
const COUNTRIES = [
  { code: "US", flag: "🇺🇸", dial: "+1", placeholder: "5551234567" },
  { code: "VN", flag: "🇻🇳", dial: "+84", placeholder: "0981234567" },
] as const;
type CountryCode = (typeof COUNTRIES)[number]["code"];

// ── Password strength bar ─────────────────────────────────────────────────────
function StrengthBar({ password }: { password: string }) {
  const { level, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <View style={sb.wrap}>
      <View style={sb.bars}>
        {([1, 2, 3] as const).map((i) => (
          <View
            key={i}
            style={[
              sb.bar,
              { backgroundColor: i <= level ? color : Colors.lightGray },
            ]}
          />
        ))}
      </View>
      <Text style={[sb.label, { color }]}>{label}</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: { marginTop: -8, marginBottom: 12 },
  bars: { flexDirection: "row", gap: 4, marginBottom: 3 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: 11, fontWeight: "500" },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterForm>(EMPTY);
  const [errors, setErrors] = useState<FormErrors<RegisterForm>>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof RegisterForm, boolean>>
  >({});
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [country, setCountry] = useState<CountryCode>("US");
  const selectedCountry =
    COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  const textAnim = useRef(new Animated.Value(0)).current;
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Animate text on mount
  React.useEffect(() => {
    Animated.timing(textAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [textAnim]);

  const handleChange = useCallback(
    <K extends keyof RegisterForm>(field: K, value: string) => {
      const next = { ...form, [field]: value };
      setForm(next);
      if (touched[field]) {
        const e = validateRegisterForm(next);
        setErrors((prev) => ({ ...prev, [field]: e[field] }));
      }
    },
    [form, touched],
  );

  const handleBlur = useCallback(
    (field: keyof RegisterForm) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const e = validateRegisterForm(form);
      setErrors((prev) => ({ ...prev, [field]: e[field] }));
    },
    [form],
  );

  const handleSubmit = async () => {
    // Touch all fields to reveal any hidden errors
    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    const e = validateRegisterForm(form);
    setErrors(e);

    // Check if user agreed to terms (BEFORE other validations)
    if (!agreed) {
      if (Platform.OS === "web") {
        alert(
          "⚠️ Please check the box to agree to our Terms of Service and Privacy Policy",
        );
      } else {
        Alert.alert(
          "⚠️ Agreement Required",
          "Please check the box to agree to our Terms of Service and Privacy Policy before signing up.",
          [{ text: "OK" }],
        );
      }
      return;
    }

    if (Object.keys(e).length) {
      return;
    }

    setLoading(true);
    try {
      // Build E.164 phone: strip everything non-digit from local input, drop
      // any leading 0 (common in VN/EU local format), then prepend dial code.
      const localDigits = form.phone.replace(/\D/g, "").replace(/^0+/, "");
      const e164Phone = `${selectedCountry.dial}${localDigits}`;

      const payload: RegisterPayload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: e164Phone,
        email: form.email,
        password: form.password,
      };
      await register(payload);
      setLoading(false);

      // Auto-login succeeds, AuthGate will automatically intercept and route to /(tabs)
    } catch (err: any) {
      setLoading(false);
      Alert.alert(
        "Registration failed",
        err.message ?? "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.logo}>Aegis Pay</Text>
            <Text style={styles.title}>Let&apos;s Get Started</Text>
            <Text style={styles.sub}>Create your free account today</Text>
          </View>
        </View>

        {/* ── Form card ── */}
        <View style={styles.card}>
          <View style={styles.inputsCard}>
            <View style={{ flexDirection: "row", gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="First name"
                  value={form.firstName}
                  onChangeText={(v) => handleChange("firstName", v)}
                  onBlur={() => handleBlur("firstName")}
                  placeholder="John"
                  autoCapitalize="words"
                  autoComplete="name-given"
                  error={errors.firstName}
                  touched={touched.firstName}
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  ref={lastNameRef}
                  label="Last name"
                  value={form.lastName}
                  onChangeText={(v) => handleChange("lastName", v)}
                  onBlur={() => handleBlur("lastName")}
                  placeholder="Doe"
                  autoCapitalize="words"
                  autoComplete="name-family"
                  error={errors.lastName}
                  touched={touched.lastName}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </View>
            </View>

            <View style={styles.countryRow}>
              {COUNTRIES.map((c) => {
                const active = c.code === country;
                return (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => setCountry(c.code)}
                    style={[
                      styles.countryPill,
                      active && styles.countryPillActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.countryFlag}>{c.flag}</Text>
                    <Text
                      style={[
                        styles.countryDial,
                        active && styles.countryDialActive,
                      ]}
                    >
                      {c.dial}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <InputField
              ref={phoneRef}
              label={`Phone number (${selectedCountry.dial})`}
              value={form.phone}
              onChangeText={(v) => handleChange("phone", v)}
              onBlur={() => handleBlur("phone")}
              placeholder={selectedCountry.placeholder}
              keyboardType="phone-pad"
              autoComplete="tel"
              error={errors.phone}
              touched={touched.phone}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <InputField
              ref={emailRef}
              label="Email address"
              value={form.email}
              onChangeText={(v) => handleChange("email", v)}
              onBlur={() => handleBlur("email")}
              placeholder="example@gmail.com"
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
              onChangeText={(v) => handleChange("password", v)}
              onBlur={() => handleBlur("password")}
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
              secureTextEntry
              autoComplete="new-password"
              error={errors.password}
              touched={touched.password}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <StrengthBar password={form.password} />

            <InputField
              ref={confirmRef}
              label="Confirm password"
              value={form.confirmPassword}
              onChangeText={(v) => handleChange("confirmPassword", v)}
              onBlur={() => handleBlur("confirmPassword")}
              placeholder="Re-enter your password"
              secureTextEntry
              autoComplete="new-password"
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <Text style={styles.terms}>
            By creating an account, you agree to our{" "}
            <Text
              style={styles.termsLink}
              onPress={() =>
                WebBrowser.openBrowserAsync("https://expo.dev/terms")
              }
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              style={styles.termsLink}
              onPress={() =>
                WebBrowser.openBrowserAsync("https://expo.dev/terms")
              }
            >
              Privacy Policy
            </Text>
            .
          </Text>

          {/* ── Agreement Checkbox ── */}
          <TouchableOpacity
            onPress={() => setAgreed(!agreed)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </TouchableOpacity>

          <View style={styles.buttonGroup}>
            <PrimaryButton
              title="Sign Up"
              onPress={handleSubmit}
              loading={loading}
              variant="solid"
            />
          </View>
        </View>

        {/* ── Footer ── */}
        <Animated.View style={{ opacity: textAnim }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text style={styles.loginText}>
              Already have an account?{" "}
              <Text style={styles.loginLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1 },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.base,
  },
  buttonGroup: {
    flexDirection: "column",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  backIcon: { fontSize: 20, color: "#fff", lineHeight: 24 },
  headerCenter: { alignItems: "center" },
  logo: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: "#fff",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: "#fff",
    marginBottom: Spacing.xs,
  },
  sub: {
    fontSize: Typography.fontSizes.base,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },

  card: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },

  inputsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  countryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  countryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    backgroundColor: Colors.surface,
  },
  countryPillActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(58,173,96,0.08)",
  },
  countryFlag: { fontSize: 18 },
  countryDial: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.text.secondary,
  },
  countryDialActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
  },

  terms: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
    textAlign: "left",
    lineHeight: 18,
    marginBottom: Spacing.base,
  },
  termsLink: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.navy,
    fontWeight: Typography.fontWeights.bold,
    textDecorationLine: "underline",
    lineHeight: 18,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.darkGray,
    marginRight: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: Typography.fontWeights.bold,
  },
  checkboxLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.darkGray,
    flex: 1,
  },

  btn: { marginBottom: Spacing.base },

  loginText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    letterSpacing: 0.1,
    textAlign: "center",
  },
  loginLink: {
    color: "#ffffff",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
