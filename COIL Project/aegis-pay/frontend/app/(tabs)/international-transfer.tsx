import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import {
  transferAPI,
  currencyFor,
  type PhoneCountry,
} from '@/src/api/api';
import { useAuth } from '@/hooks/use-auth';

// Detect country from a raw phone number (E.164).
function detectCountry(phone?: string | null): PhoneCountry {
  if (!phone) return 'OTHER';
  if (phone.startsWith('+1')) return 'US';
  if (phone.startsWith('+84')) return 'VN';
  return 'OTHER';
}

const FLAGS: Record<string, string> = {
  US: '🇺🇸',
  VN: '🇻🇳',
  OTHER: '🌐',
};

export default function InternationalTransferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipient?: string }>();
  const { user } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState<{
    name: string;
    maskedPhone: string;
    phoneCountry: PhoneCountry;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  // Conversion state
  const [converted, setConverted] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [convertLoading, setConvertLoading] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const convertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const senderCountry: PhoneCountry = detectCountry(user?.phone);
  const senderCurrency = currencyFor(senderCountry);
  const receiverCurrency = currencyFor(recipient?.phoneCountry);

  const isCrossCountry =
    !!recipient &&
    recipient.phoneCountry !== 'OTHER' &&
    senderCountry !== 'OTHER' &&
    recipient.phoneCountry !== senderCountry;

  // Fetch balance once on mount.
  useEffect(() => {
    transferAPI
      .getBalance()
      .then((r) => setBalance(r.balance))
      .catch(() => {});
  }, []);

  // If we arrived from a Quick Action with ?recipient=email, auto-look-up.
  useEffect(() => {
    const preset = params.recipient?.toString().trim();
    if (!preset) return;
    setIdentifier(preset);
    runLookup(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.recipient]);

  const runLookup = async (idValue?: string) => {
    const id = (idValue ?? identifier).trim();
    if (!id) return;
    setLookupLoading(true);
    setError('');
    setRecipient(null);
    setConverted(null);
    setRate(null);

    try {
      const res = await transferAPI.lookupRecipient(id);
      setRecipient({
        name: res.user.name,
        maskedPhone: res.user.maskedPhone,
        phoneCountry: (res.user.phoneCountry as PhoneCountry) || 'OTHER',
      });
    } catch (err: any) {
      setError(err?.message || 'Recipient not found');
    } finally {
      setLookupLoading(false);
    }
  };

  // Debounced currency conversion whenever amount or recipient changes.
  useEffect(() => {
    if (convertTimer.current) clearTimeout(convertTimer.current);
    setConverted(null);
    setRate(null);

    if (!isCrossCountry) return;
    const numeric = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!numeric || numeric <= 0) return;

    convertTimer.current = setTimeout(async () => {
      setConvertLoading(true);
      setConversionError(null);
      try {
        const res = await transferAPI.convertCurrency(
          senderCurrency,
          receiverCurrency,
          numeric,
        );
        setConverted(res.result);
        setRate(res.result / numeric);
      } catch (err: any) {
        setConverted(null);
        setRate(null);
        setConversionError(
          err?.message ||
            'Failed to fetch exchange rate. Check EXCHANGE_RATE_API_KEY on the backend.',
        );
      } finally {
        setConvertLoading(false);
      }
    }, 350);

    return () => {
      if (convertTimer.current) clearTimeout(convertTimer.current);
    };
  }, [amount, senderCurrency, receiverCurrency, isCrossCountry]);

  const handleContinue = async () => {
    setError('');
    const numeric = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!numeric || numeric <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!recipient) {
      setError('Please look up a valid recipient first');
      return;
    }
    if (!isCrossCountry) {
      setError(
        'Recipient is in your own country — use the regular Transfer screen.',
      );
      return;
    }

    try {
      const result = await transferAPI.initiateTransfer(
        identifier.trim(),
        numeric,
        description.trim() || undefined,
      );
      router.push({
        pathname: '/transfer-confirm',
        params: {
          transactionId: result.transactionId,
          referenceCode: result.referenceCode,
          amount: numeric.toString(),
          receiverName: result.receiver.name,
          receiverPhone: result.receiver.maskedPhone,
          description: description.trim(),
          devOtp: result._dev_otp || '',
          senderCurrency,
          receiverCurrency,
          receiverAmount: converted != null ? converted.toString() : '',
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Error initiating transaction');
    }
  };

  const fmt = (val: number, cur: string) =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: cur === 'VND' ? 0 : 2,
    }).format(val);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>International Transfer</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {/* Country chips */}
          <View style={styles.countryStrip}>
            <View style={styles.countryBox}>
              <Text style={styles.countryFlag}>
                {FLAGS[senderCountry] || '🌐'}
              </Text>
              <View>
                <Text style={styles.countryLabel}>You</Text>
                <Text style={styles.countryValue}>
                  {senderCountry} · {senderCurrency}
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.darkGray} />
            <View style={styles.countryBox}>
              <Text style={styles.countryFlag}>
                {FLAGS[recipient?.phoneCountry || 'OTHER'] || '🌐'}
              </Text>
              <View>
                <Text style={styles.countryLabel}>Recipient</Text>
                <Text style={styles.countryValue}>
                  {recipient
                    ? `${recipient.phoneCountry} · ${receiverCurrency}`
                    : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Recipient lookup */}
          <View style={styles.section}>
            <Text style={styles.label}>Recipient</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Phone or email"
                placeholderTextColor={Colors.text.placeholder}
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  setRecipient(null);
                  setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                onSubmitEditing={() => runLookup()}
              />
              <TouchableOpacity
                style={[
                  styles.lookupBtn,
                  (!identifier.trim() || lookupLoading) &&
                    styles.lookupBtnDisabled,
                ]}
                onPress={() => runLookup()}
                disabled={lookupLoading || !identifier.trim()}
              >
                {lookupLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="search" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {recipient && (
              <View
                style={[
                  styles.recipientCard,
                  !isCrossCountry && styles.recipientCardWarn,
                ]}
              >
                <View style={styles.recipientAvatar}>
                  <Ionicons name="person" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipientName}>{recipient.name}</Text>
                  <Text style={styles.recipientPhone}>
                    {recipient.maskedPhone}
                  </Text>
                </View>
                <Ionicons
                  name={isCrossCountry ? 'checkmark-circle' : 'alert-circle'}
                  size={22}
                  color={isCrossCountry ? Colors.success : Colors.warning}
                />
              </View>
            )}

            {recipient && !isCrossCountry && (
              <View style={styles.warnBox}>
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={Colors.warning}
                />
                <Text style={styles.warnText}>
                  This recipient is in your own country. Use the regular{' '}
                  <Text
                    style={styles.warnLink}
                    onPress={() => router.replace('/transfer')}
                  >
                    Transfer
                  </Text>{' '}
                  screen instead.
                </Text>
              </View>
            )}
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>You send</Text>
            <View style={styles.amountInputRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                value={amount}
                onChangeText={(t) => {
                  setAmount(t.replace(/[^0-9.]/g, ''));
                  setError('');
                }}
                keyboardType="number-pad"
              />
              <Text style={styles.currencyLabel}>{senderCurrency}</Text>
            </View>
            {balance !== null && (
              <Text style={styles.balanceText}>
                Available balance: {fmt(balance, senderCurrency)}{' '}
                {senderCurrency}
              </Text>
            )}
          </View>

          {/* Conversion preview */}
          {isCrossCountry && (
            <View style={styles.conversionCard}>
              <View style={styles.conversionRow}>
                <Text style={styles.conversionLabel}>Recipient gets</Text>
                {convertLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : converted !== null ? (
                  <Text style={styles.conversionAmount}>
                    {fmt(converted, receiverCurrency)} {receiverCurrency}
                  </Text>
                ) : (
                  <Text style={styles.conversionMuted}>—</Text>
                )}
              </View>
              {rate !== null && (
                <Text style={styles.conversionRate}>
                  1 {senderCurrency} ≈ {fmt(rate, receiverCurrency)}{' '}
                  {receiverCurrency} · live rate
                </Text>
              )}
              {conversionError && (
                <View style={styles.conversionErrorRow}>
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={Colors.error}
                  />
                  <Text style={styles.conversionErrorText}>
                    {conversionError}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Note */}
          <View style={styles.section}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={[styles.input, { height: 48 }]}
              placeholder="e.g., Birthday gift"
              placeholderTextColor={Colors.text.placeholder}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={Colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Continue button */}
        <View style={styles.bottomCta}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!recipient || !amount || !isCrossCountry) &&
                styles.continueBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={!recipient || !amount || !isCrossCountry}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.beige },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.navy,
  },
  body: { flex: 1, paddingHorizontal: Spacing.lg },

  countryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  countryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  countryFlag: { fontSize: 24 },
  countryLabel: { fontSize: 11, color: Colors.darkGray },
  countryValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.navy,
  },

  section: { marginBottom: Spacing.lg },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: Typography.fontSizes.base,
    color: Colors.navy,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  lookupBtn: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookupBtnDisabled: {
    backgroundColor: Colors.primaryLight,
    opacity: 0.6,
  },

  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: BorderRadius.lg,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  recipientCardWarn: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  recipientAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.navy,
  },
  recipientPhone: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
    marginTop: 1,
  },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 10,
  },
  warnText: {
    flex: 1,
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
    lineHeight: 18,
  },
  warnLink: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
    textDecorationLine: 'underline',
  },

  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.navy,
    paddingVertical: 12,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
    marginLeft: 4,
  },
  balanceText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.text.secondary,
    marginTop: 8,
    marginLeft: 4,
  },

  conversionCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversionLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.navy,
    fontWeight: Typography.fontWeights.medium,
  },
  conversionAmount: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  conversionMuted: {
    fontSize: Typography.fontSizes.base,
    color: Colors.darkGray,
  },
  conversionRate: {
    fontSize: 11,
    color: Colors.darkGray,
    marginTop: 4,
  },
  conversionErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  conversionErrorText: {
    fontSize: 11,
    color: Colors.error,
    flex: 1,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.error,
    flex: 1,
  },
  bottomCta: {
    padding: Spacing.lg,
    paddingBottom: 36,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
  },
  continueBtnDisabled: {
    backgroundColor: Colors.primaryLight,
    opacity: 0.5,
  },
  continueBtnText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: '#fff',
  },
});
