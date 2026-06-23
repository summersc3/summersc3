import React, { useState } from 'react';
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
import { transferAPI, currencyFor, type PhoneCountry } from '@/src/api/api';
import { useAuth } from '@/hooks/use-auth';

function detectCountry(phone?: string | null): PhoneCountry {
  if (!phone) return 'OTHER';
  if (phone.startsWith('+1')) return 'US';
  if (phone.startsWith('+84')) return 'VN';
  return 'OTHER';
}

export default function TransferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipient?: string }>();
  const { user } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState<{
    name: string;
    maskedPhone: string;
    phoneCountry?: PhoneCountry;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');

  const senderCountry = detectCountry(user?.phone);
  const recipientCountry = recipient?.phoneCountry;
  const isCrossCountry =
    !!recipientCountry &&
    recipientCountry !== 'OTHER' &&
    senderCountry !== 'OTHER' &&
    recipientCountry !== senderCountry;

  const [balance, setBalance] = useState<number | null>(null);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  const quickAmounts = [20000, 50000, 100000, 200000, 500000, 1000000];

  // Get wallet balance on mount
  React.useEffect(() => {
    const fetchBalance = async () => {
      try {
        const result = await transferAPI.getBalance();
        setBalance(result.balance);
      } catch (err) {
        console.warn('Failed to fetch balance:', err);
      }
    };
    fetchBalance();
  }, []);

  // If we arrived from a Quick Action with a recipient param, pre-fill the
  // input and run the lookup automatically.
  React.useEffect(() => {
    const preset = params.recipient?.toString().trim();
    if (!preset) return;
    setIdentifier(preset);
    setRecipient(null);
    setError('');
    (async () => {
      setLookupLoading(true);
      try {
        const result = await transferAPI.lookupRecipient(preset);
        setRecipient({
          name: result.user.name,
          maskedPhone: result.user.maskedPhone,
          phoneCountry: (result.user.phoneCountry as PhoneCountry) || undefined,
        });
      } catch (err: any) {
        setError(err?.message || 'Recipient not found');
      } finally {
        setLookupLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.recipient]);

  // Look up user by email or phone
  const handleLookup = async () => {
    if (!identifier.trim()) return;
    setLookupLoading(true);
    setError('');
    setRecipient(null);

    try {
      const result = await transferAPI.lookupRecipient(identifier.trim());
      setRecipient({
        name: result.user.name,
        maskedPhone: result.user.maskedPhone,
        phoneCountry: (result.user.phoneCountry as PhoneCountry) || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Recipient not found');
    } finally {
      setLookupLoading(false);
    }
  };

  // Start the transfer process
  const handleContinue = async () => {
    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (numAmount < 1000) {
      setError('Minimum transfer amount is 1,000 đ');
      return;
    }
    if (!recipient) {
      setError('Please search for a valid recipient');
      return;
    }
    if (isCrossCountry) {
      setError(
        'This recipient is in a different country. Please use International Transfer.',
      );
      return;
    }

    setError('');
    try {
      const result = await transferAPI.initiateTransfer(
        identifier.trim(),
        numAmount,
        description.trim() || undefined
      );

      // Domestic transfer — sender and receiver share the same currency.
      const userCurrency = currencyFor(senderCountry);
      router.push({
        pathname: '/transfer-confirm',
        params: {
          transactionId: result.transactionId,
          referenceCode: result.referenceCode,
          amount: numAmount.toString(),
          receiverName: result.receiver.name,
          receiverPhone: result.receiver.maskedPhone,
          description: description.trim(),
          devOtp: result._dev_otp || '',
          senderCurrency: userCurrency,
          receiverCurrency: userCurrency,
          receiverAmount: numAmount.toString(),
        },
      });
    } catch (err: any) {
      setError(err.message || 'Error initiating transaction');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Top bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Money</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Who are we sending to? */}
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
                onSubmitEditing={handleLookup}
              />
              <TouchableOpacity
                style={[styles.lookupBtn, (!identifier.trim() || lookupLoading) && styles.lookupBtnDisabled]}
                onPress={handleLookup}
                disabled={lookupLoading || !identifier.trim()}>
                {lookupLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="search" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {recipient && (
              <View style={styles.recipientCard}>
                <View style={styles.recipientAvatar}>
                  <Ionicons name="person" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipientName}>{recipient.name}</Text>
                  <Text style={styles.recipientPhone}>{recipient.maskedPhone}</Text>
                </View>
                <Ionicons
                  name={isCrossCountry ? 'alert-circle' : 'checkmark-circle'}
                  size={22}
                  color={isCrossCountry ? Colors.warning : Colors.success}
                />
              </View>
            )}

            {recipient && isCrossCountry && (
              <View style={styles.crossCountryWarn}>
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={Colors.warning}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.crossCountryTitle}>
                    Cross-country transfer detected
                  </Text>
                  <Text style={styles.crossCountryDesc}>
                    Recipient is in {recipient.phoneCountry}, you&apos;re in{' '}
                    {senderCountry}. Use International Transfer for currency
                    conversion.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.crossCountryBtn}
                  onPress={() =>
                    router.replace({
                      pathname: '/international-transfer',
                      params: { recipient: identifier.trim() },
                    })
                  }
                >
                  <Text style={styles.crossCountryBtnText}>Switch</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* How much to send? */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountInputRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                value={amount}
                onChangeText={(t) => {
                  setAmount(t.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                keyboardType="number-pad"
              />
              <Text style={styles.currencyLabel}>đ</Text>
            </View>

            {balance !== null && (
              <Text style={styles.balanceText}>
                Available balance: {formatCurrency(balance)}
              </Text>
            )}

            {/* Shortcuts */}
            <View style={styles.quickAmounts}>
              {quickAmounts.map((qa) => (
                <TouchableOpacity
                  key={qa}
                  style={[
                    styles.quickAmountBtn,
                    amount === qa.toString() && styles.quickAmountActive,
                  ]}
                  onPress={() => setAmount(qa.toString())}>
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === qa.toString() && styles.quickAmountTextActive,
                    ]}>
                    {qa >= 1000000 ? `${qa / 1000000}M` : qa >= 1000 ? `${qa / 1000}K` : qa}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Optional message */}
          <View style={styles.section}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={[styles.input, { height: 48 }]}
              placeholder="e.g., Lunch money"
              placeholderTextColor={Colors.text.placeholder}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Action button */}
        <View style={styles.bottomCta}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!recipient || !amount) && styles.continueBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={!recipient || !amount}>
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
  section: { marginBottom: Spacing.lg },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
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
  crossCountryWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fffbeb',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 10,
  },
  crossCountryTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.navy,
  },
  crossCountryDesc: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
    marginTop: 2,
    lineHeight: 16,
  },
  crossCountryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  crossCountryBtnText: {
    color: '#fff',
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
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
    fontSize: 20,
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
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.base,
  },
  quickAmountBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  quickAmountActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickAmountText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.darkGray,
  },
  quickAmountTextActive: {
    color: '#fff',
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnDisabled: {
    backgroundColor: Colors.primaryLight,
    opacity: 0.5,
    shadowOpacity: 0,
  },
  continueBtnText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: '#fff',
  },
});
