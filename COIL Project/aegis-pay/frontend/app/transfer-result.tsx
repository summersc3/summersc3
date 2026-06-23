import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/src/api/api';

export default function TransferResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    status: string;
    amount: string;
    receiverName: string;
    referenceCode: string;
    completedAt: string;
    errorMessage?: string;
    senderCurrency?: string;
    receiverCurrency?: string;
    receiverAmount?: string;
  }>();

  const isSuccess = params.status === 'success';
  const senderCurrency = params.senderCurrency || 'USD';
  const receiverCurrency = params.receiverCurrency || senderCurrency;
  const sendAmount = parseFloat(params.amount || '0');
  const receiveAmount = params.receiverAmount
    ? parseFloat(params.receiverAmount)
    : sendAmount;
  const isInternational = senderCurrency !== receiverCurrency;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Status icon (Success/Error) */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isSuccess ? '#f0fdf4' : '#fef2f2' },
          ]}>
          <View
            style={[
              styles.iconInner,
              { backgroundColor: isSuccess ? Colors.success : Colors.error },
            ]}>
            <Ionicons
              name={isSuccess ? 'checkmark' : 'close'}
              size={40}
              color="#fff"
            />
          </View>
        </View>

        {/* Main status heading */}
        <Text style={styles.statusText}>
          {isSuccess ? 'Transfer Successful!' : 'Transfer Failed'}
        </Text>

        {isSuccess ? (
          <Text style={styles.statusSubtext}>
            Money has been sent successfully
          </Text>
        ) : (
          <Text style={styles.statusSubtext}>
            {params.errorMessage || 'Something went wrong. Please try again later.'}
          </Text>
        )}

        {/* Large amount display — sender's currency */}
        <Text style={styles.amount}>
          {formatMoney(sendAmount, senderCurrency)}
        </Text>
        {isInternational && (
          <Text style={styles.intlConvert}>
            ↓ Recipient received{' '}
            <Text style={styles.intlConvertAmount}>
              {formatMoney(receiveAmount, receiverCurrency)}
            </Text>
          </Text>
        )}

        {/* Detailed breakdown */}
        {isSuccess && (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To</Text>
              <Text style={styles.detailValue}>{params.receiverName}</Text>
            </View>
            <View style={styles.detailRowDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference Code</Text>
              <Text style={[styles.detailValue, { fontFamily: 'monospace', fontSize: 13 }]}>
                {params.referenceCode}
              </Text>
            </View>
            <View style={styles.detailRowDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {params.completedAt ? formatDate(params.completedAt) : '-'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Navigation buttons */}
      <View style={styles.bottomActions}>
        {isSuccess && (
            <TouchableOpacity
              style={styles.newTransferBtn}
              onPress={() => router.replace('/(tabs)/transfer')}>
              <Ionicons name="repeat" size={20} color={Colors.primary} />
              <Text style={styles.newTransferText}>New Transfer</Text>
            </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: Typography.fontSizes.base,
    color: Colors.text.placeholder,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  amount: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: Spacing.lg,
    letterSpacing: -1,
  },
  intlConvert: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.darkGray,
    marginTop: 6,
    textAlign: 'center',
  },
  intlConvertAmount: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: Colors.beige,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: 28,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailRowDivider: {
    height: 1,
    backgroundColor: Colors.lightGray,
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
  bottomActions: {
    padding: Spacing.lg,
    paddingBottom: 40,
    gap: 12,
  },
  newTransferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  newTransferText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  homeBtnText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: '#fff',
  },
});
