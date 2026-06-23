import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBalance } from '@/hooks/use-balance';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/src/api/api';

type DirectionFilter = 'all' | 'sent' | 'received';
type StatusFilter = 'all' | 'completed' | 'pending' | 'cancelled' | 'failed';

const directionOptions: { key: DirectionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
];

const statusOptions: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Any status' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'failed', label: 'Failed' },
];

// Status visuals — completed uses theme green to match the rest of the app
const statusVisuals: Record<
  string,
  { bg: string; fg: string; icon: any; label: string }
> = {
  completed: {
    bg: '#dcfce7',
    fg: Colors.primary,
    icon: 'checkmark-circle',
    label: 'Completed',
  },
  pending: {
    bg: '#fef3c7',
    fg: '#d97706',
    icon: 'time',
    label: 'Pending',
  },
  cancelled: {
    bg: '#f3f4f6',
    fg: '#6b7280',
    icon: 'close-circle',
    label: 'Cancelled',
  },
  failed: {
    bg: '#fee2e2',
    fg: '#dc2626',
    icon: 'alert-circle',
    label: 'Failed',
  },
};

export default function HistoryScreen() {
  const router = useRouter();
  const { transactions, isRefreshing, refresh } = useBalance();

  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return (transactions || [])
      .filter((t: any) => direction === 'all' || t.direction === direction)
      .filter((t: any) => status === 'all' || t.status === status)
      .filter((t: any) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const senderName = t.sender?.name?.toLowerCase() || '';
        const receiverName = t.receiver?.name?.toLowerCase() || '';
        const ref = t.referenceCode?.toLowerCase() || '';
        const desc = t.description?.toLowerCase() || '';
        return (
          senderName.includes(q) ||
          receiverName.includes(q) ||
          ref.includes(q) ||
          desc.includes(q)
        );
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [transactions, direction, status, search]);

  // Totals: only sum amountReceived for incoming, amountSent for outgoing.
  // Bucket by currency so USD and VND aren't summed together; surface the
  // most-common currency in each direction for the header card.
  const totals = useMemo(() => {
    const sentByCur: Record<string, number> = {};
    const receivedByCur: Record<string, number> = {};
    for (const t of filtered as any[]) {
      if (t.status !== 'completed') continue;
      if (t.direction === 'sent') {
        const amt = Number(t.amountSent ?? t.amount) || 0;
        const cur = t.currencySent || t.currency || 'USD';
        sentByCur[cur] = (sentByCur[cur] || 0) + amt;
      } else if (t.direction === 'received') {
        const amt = Number(t.amountReceived ?? t.amount) || 0;
        const cur = t.currencyReceived || t.currency || 'USD';
        receivedByCur[cur] = (receivedByCur[cur] || 0) + amt;
      }
    }
    const pickPrimary = (m: Record<string, number>) => {
      const entries = Object.entries(m);
      if (entries.length === 0) return { amount: 0, currency: 'USD' };
      entries.sort((a, b) => b[1] - a[1]);
      return { amount: entries[0][1], currency: entries[0][0] };
    };
    return {
      sent: pickPrimary(sentByCur),
      received: pickPrimary(receivedByCur),
    };
  }, [filtered]);

  // Group by date — Today / Yesterday / "Apr 25, 2026"
  const grouped = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const map = new Map<string, any[]>();
    for (const tx of filtered) {
      const d = new Date(tx.createdAt);
      d.setHours(0, 0, 0, 0);
      let label: string;
      if (d.getTime() === today.getTime()) label = 'Today';
      else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
      else
        label = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(tx);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const formatTime = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#ecfdf5' }]}>
            <Text style={styles.summaryLabel}>Total Received</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              +{formatMoney(totals.received.amount, totals.received.currency)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fef2f2' }]}>
            <Text style={styles.summaryLabel}>Total Sent</Text>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
              -{formatMoney(totals.sent.amount, totals.sent.currency)}
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={Colors.darkGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, reference code, or note"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.text.placeholder}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.darkGray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter rows */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {directionOptions.map((opt) => {
            const active = direction === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setDirection(opt.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {statusOptions.map((opt) => {
            const active = status === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setStatus(opt.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tables */}
        <View style={styles.tableWrap}>
          {grouped.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color={Colors.darkGray}
              />
              <Text style={styles.emptyText}>
                No transactions match your filters
              </Text>
            </View>
          ) : (
            grouped.map(([dateLabel, txs]) => (
              <View key={dateLabel} style={styles.dateGroup}>
                {/* Date group header */}
                <View style={styles.dateGroupHeader}>
                  <Text style={styles.dateGroupLabel}>{dateLabel}</Text>
                  <Text style={styles.dateGroupCount}>
                    {txs.length}{' '}
                    {txs.length === 1 ? 'Transaction' : 'Transactions'}
                  </Text>
                </View>

                {/* Column headers */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.colHeader, styles.colName]}>Name</Text>
                  <Text style={[styles.colHeader, styles.colType]}>Type</Text>
                  <Text style={[styles.colHeader, styles.colRef]}>
                    Transaction ID
                  </Text>
                  <Text style={[styles.colHeader, styles.colAmount]}>
                    Amount
                  </Text>
                  <Text style={[styles.colHeader, styles.colStatus]}>
                    Status
                  </Text>
                </View>

                {/* Rows */}
                <View style={styles.tableBody}>
                  {txs.map((t: any, idx: number) => {
                    const isReceived = t.direction === 'received';
                    const otherName = isReceived
                      ? t.sender?.name
                      : t.receiver?.name;
                    // Direction-aware amount + currency for this row.
                    const rowAmount = isReceived
                      ? Number(t.amountReceived ?? t.amount)
                      : Number(t.amountSent ?? t.amount);
                    const rowCurrency = isReceived
                      ? (t.currencyReceived || t.currency || 'USD')
                      : (t.currencySent || t.currency || 'USD');
                    const visual =
                      statusVisuals[t.status] || {
                        bg: '#f3f4f6',
                        fg: Colors.darkGray,
                        icon: 'help-circle',
                        label: t.status,
                      };
                    return (
                      <View
                        key={t.transactionId}
                        style={[
                          styles.tableRow,
                          idx > 0 && styles.tableRowBorder,
                        ]}
                      >
                        {/* Name with avatar + time */}
                        <View style={[styles.colName, styles.cellRow]}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {getInitials(otherName || '?')}
                            </Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.nameText} numberOfLines={1}>
                              {otherName || 'Unknown'}
                            </Text>
                            <View style={styles.timeRow}>
                              <Ionicons
                                name="time-outline"
                                size={11}
                                color={Colors.darkGray}
                              />
                              <Text style={styles.timeText}>
                                {formatTime(t.createdAt)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Type */}
                        <View style={[styles.colType, styles.cellRow]}>
                          <Ionicons
                            name={isReceived ? 'arrow-down' : 'arrow-up'}
                            size={14}
                            color={isReceived ? Colors.primary : '#dc2626'}
                          />
                          <Text
                            style={[
                              styles.typeText,
                              {
                                color: isReceived
                                  ? Colors.primary
                                  : '#dc2626',
                              },
                            ]}
                          >
                            {isReceived ? 'Received' : 'Sent'}
                          </Text>
                        </View>

                        {/* Reference */}
                        <Text
                          style={[styles.refText, styles.colRef]}
                          numberOfLines={1}
                        >
                          {t.referenceCode || '—'}
                        </Text>

                        {/* Amount */}
                        <Text
                          style={[
                            styles.amountText,
                            styles.colAmount,
                            {
                              color: isReceived ? Colors.primary : '#dc2626',
                            },
                          ]}
                        >
                          {isReceived ? '+' : '-'}
                          {formatMoney(rowAmount, rowCurrency)}
                        </Text>

                        {/* Status pill */}
                        <View style={styles.colStatus}>
                          <View
                            style={[
                              styles.statusPill,
                              { backgroundColor: visual.bg },
                            ]}
                          >
                            <Ionicons
                              name={visual.icon}
                              size={12}
                              color={visual.fg}
                            />
                            <Text
                              style={[styles.statusText, { color: visual.fg }]}
                            >
                              {visual.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  scrollContent: { paddingBottom: Spacing.xxl },

  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  summaryLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
    fontWeight: Typography.fontWeights.medium,
  },
  summaryValue: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    marginTop: 2,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.text.primary,
    height: '100%',
    outlineWidth: 0,
    outlineStyle: 'none' as any,
  },

  filterRow: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeights.medium,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: Typography.fontWeights.bold,
  },

  tableWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.darkGray,
  },

  dateGroup: { marginBottom: Spacing.lg },
  dateGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.lightGray,
  },
  dateGroupLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.navy,
  },
  dateGroupCount: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
    fontWeight: Typography.fontWeights.medium,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  colHeader: {
    fontSize: 11,
    color: Colors.darkGray,
    fontWeight: Typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableBody: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.lightGray,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },

  // Column widths
  colName: { flex: 2.5, minWidth: 0 },
  colType: { flex: 1.2 },
  colRef: { flex: 1.5 },
  colAmount: { flex: 1.2 },
  colStatus: { flex: 1.5 },

  cellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.bold,
    color: '#fff',
  },
  nameText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.navy,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: Colors.darkGray,
  },
  typeText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  refText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.text.secondary,
  },
  amountText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.semibold,
  },
});
