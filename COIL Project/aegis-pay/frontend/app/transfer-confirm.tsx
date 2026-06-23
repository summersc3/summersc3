import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { transferAPI, formatMoney } from '@/src/api/api';

export default function TransferConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transactionId: string;
    referenceCode: string;
    amount: string;
    receiverName: string;
    receiverPhone: string;
    description: string;
    devOtp: string;
    senderCurrency?: string;
    receiverCurrency?: string;
    receiverAmount?: string;
  }>();

  const senderCurrency = params.senderCurrency || 'USD';
  const receiverCurrency = params.receiverCurrency || senderCurrency;
  const sendAmount = parseFloat(params.amount || '0');
  const receiveAmount = params.receiverAmount
    ? parseFloat(params.receiverAmount)
    : sendAmount;
  const isInternational = senderCurrency !== receiverCurrency;

  // Pre-fill with 000000 because backend SKIP_OTP=true accepts any code.
  // Lets the user click "Confirm Transfer" immediately without seeing the OTP UI.
  const [otp, setOtp] = useState(['0', '0', '0', '0', '0', '0']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30); // 30 seconds expiry

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // 30 second timer for OTP expiry
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (val: number) => formatMoney(val, senderCurrency);

  // Manage digit entry across 6 inputs
  const handleOtpChange = (text: string, index: number) => {
    // Intercept native 6-digit iOS auto-fill payloads
    if (text.length === 6) {
      setOtp(text.split(''));
      setError('');
      inputRefs.current[5]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Final check and transaction execution
  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit OTP code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await transferAPI.verifyOTP(params.transactionId!, otpCode);

      // Navigate to result screen — forward currency info so the success
      // page can display the sent amount in the sender's currency (and the
      // received amount for international transfers).
      router.replace({
        pathname: '/transfer-result',
        params: {
          status: 'success',
          amount: params.amount,
          receiverName: params.receiverName,
          referenceCode: result.transaction.referenceCode,
          completedAt: result.transaction.completedAt || new Date().toISOString(),
          senderCurrency,
          receiverCurrency,
          receiverAmount: params.receiverAmount || params.amount,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Transfer</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Transaction details */}
      <View style={styles.summaryCard}>
        <View style={styles.amountRow}>
          <Text style={styles.summaryAmountLabel}>Amount to Send</Text>
          <Text style={styles.summaryAmount}>
            {formatMoney(sendAmount, senderCurrency)}
          </Text>
          {isInternational && (
            <View style={styles.intlConvRow}>
              <Ionicons
                name="arrow-down"
                size={14}
                color={Colors.darkGray}
              />
              <Text style={styles.intlConvText}>
                Recipient gets{' '}
                <Text style={styles.intlConvAmount}>
                  {formatMoney(receiveAmount, receiverCurrency)}
                </Text>
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>To</Text>
          <Text style={styles.detailValue}>{params.receiverName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone Number</Text>
          <Text style={styles.detailValue}>{params.receiverPhone}</Text>
        </View>
        {params.description ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Note</Text>
            <Text style={styles.detailValue}>{params.description}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Reference Code</Text>
          <Text style={[styles.detailValue, { fontFamily: 'monospace', fontSize: 13 }]}>
            {params.referenceCode}
          </Text>
        </View>
      </View>

      {/* OTP verification area */}
      <View style={styles.otpSection}>
        <Text style={styles.otpTitle}>Enter OTP</Text>
        <Text style={styles.otpSubtitle}>
          A 6-digit verification code has been sent to you
        </Text>

        {/* DEV OTP hint */}
        {params.devOtp ? (
          <View style={styles.devOtpHint}>
            <Text style={styles.devOtpText}>
              Dev OTP: <Text style={{ fontWeight: '800' }}>{params.devOtp}</Text>
            </Text>
          </View>
        ) : null}

        {/* 6-digit code entry */}
        <View style={styles.otpInputRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                error ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Expiry indicator */}
        <View style={styles.countdownRow}>
          <Ionicons name="time-outline" size={16} color={Colors.darkGray} />
          <Text style={styles.countdownText}>
            {countdown > 0 ? `Expires in ${formatTime(countdown)}` : 'OTP code has expired'}
          </Text>
        </View>

        {/* Feedback messages */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {/* Action button */}
      <View style={styles.bottomCta}>
        <TouchableOpacity
          style={[styles.verifyBtn, isVerifying && styles.verifyBtnLoading]}
          onPress={handleVerify}
          disabled={isVerifying || countdown === 0}>
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.verifyBtnText}>Confirm Transfer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.beige },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.navy,
  },
  summaryCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  amountRow: {
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  summaryAmountLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.text.placeholder,
    fontWeight: Typography.fontWeights.medium,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -1,
    marginTop: 4,
  },
  intlConvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ecfdf5',
    borderRadius: BorderRadius.md,
  },
  intlConvText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
  },
  intlConvAmount: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.text.placeholder,
    fontWeight: Typography.fontWeights.medium,
  },
  detailValue: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.navy,
    fontWeight: Typography.fontWeights.semibold,
  },
  otpSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  otpTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.navy,
  },
  otpSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.text.placeholder,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  devOtpHint: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  devOtpText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.md,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    backgroundColor: Colors.surface,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#ecfdf5',
  },
  otpInputError: {
    borderColor: '#fca5a5',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.base,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.base,
  },
  errorText: { fontSize: Typography.fontSizes.xs, color: Colors.error },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: 36,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  verifyBtn: {
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
  verifyBtnLoading: {
    backgroundColor: Colors.primaryLight,
  },
  verifyBtnText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: '#fff',
  },
});
