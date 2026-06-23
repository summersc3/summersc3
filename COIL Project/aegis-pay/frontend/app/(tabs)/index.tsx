import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MOCK_USER } from '@/constants/MockData';
import { useAuth } from '@/hooks/use-auth';
import { useBalance } from '@/hooks/use-balance';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/src/api/api';

const NOTIF_LAST_READ_KEY = 'notif_last_read_at';

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
};

const formatRelative = (iso: string) => {
  if (!iso) return '';
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

export default function HomeScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { balance, currency, transactions, isRefreshing, refresh } = useBalance();

  const [notifOpen, setNotifOpen] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);

  // Restore last-read timestamp on mount.
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_LAST_READ_KEY)
      .then((v) => setLastReadAt(v))
      .catch(() => {});
  }, []);

  // Quick Action: most recently transacted unique contacts. Captures email
  // (when the backend exposes it) so tapping can deep-link straight to the
  // transfer screen with the recipient looked up automatically.
  const recentContacts = useMemo(() => {
    const seen = new Set<string>();
    const list: {
      name: string;
      phone: string;
      email: string | null;
      direction: string;
    }[] = [];
    for (const tx of transactions) {
      const isReceived = tx.direction === 'received';
      const name = isReceived ? tx.sender?.name : tx.receiver?.name;
      const phone = isReceived ? tx.sender?.phone : tx.receiver?.phone;
      const email = isReceived
        ? (tx.sender as any)?.email
        : (tx.receiver as any)?.email;
      if (!name || name === 'Unknown' || seen.has(name)) continue;
      seen.add(name);
      list.push({
        name,
        phone: phone || '',
        email: email || null,
        direction: tx.direction || 'sent',
      });
      if (list.length >= 6) break;
    }
    return list;
  }, [transactions]);

  // Recent completed transactions (for the home preview list)
  const recentCompleted = useMemo(() => {
    return transactions
      .filter((t: any) => t.status === 'completed')
      .slice(0, 5);
  }, [transactions]);

  // Notifications: derived from completed transactions.
  const notifications = useMemo(() => {
    return transactions
      .filter((t: any) => t.status === 'completed')
      .slice(0, 20)
      .map((t: any) => {
        const isReceived = t.direction === 'received';
        const otherName = isReceived ? t.sender?.name : t.receiver?.name;
        return {
          id: t.transactionId,
          icon: isReceived
            ? 'arrow-down-circle'
            : ('arrow-up-circle' as any),
          color: isReceived ? Colors.primary : Colors.error,
          title: isReceived ? 'Money received' : 'Money sent',
          body: `${isReceived ? 'From' : 'To'} ${otherName || 'Unknown'} — $${Number(t.amount).toLocaleString('en-US')}`,
          date: t.createdAt,
        };
      });
  }, [transactions]);

  const unreadCount = useMemo(() => {
    if (!lastReadAt) return notifications.length;
    const cutoff = new Date(lastReadAt).getTime();
    return notifications.filter((n) => new Date(n.date).getTime() > cutoff)
      .length;
  }, [notifications, lastReadAt]);

  const handleMarkAllRead = () => {
    const now = new Date().toISOString();
    setLastReadAt(now);
    AsyncStorage.setItem(NOTIF_LAST_READ_KEY, now).catch(() => {});
  };

  const renderQuickAction = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.quickActionItem}
      activeOpacity={0.75}
      onPress={() =>
        router.push(
          item.email
            ? { pathname: '/transfer', params: { recipient: item.email } }
            : '/transfer',
        )
      }
    >
      <View style={styles.quickActionAvatar}>
        <Text style={styles.quickActionInitials}>
          {getInitials(item.name)}
        </Text>
      </View>
      <View style={styles.quickActionDetails}>
        <Text style={styles.quickActionName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.quickActionAccount} numberOfLines={1}>
          {item.phone || '—'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconCircle} onPress={logout}>
          <Ionicons
            name="log-out-outline"
            size={24}
            color={Colors.surface}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => setNotifOpen((v) => !v)}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={Colors.surface}
          />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={Colors.surface}
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingSub}>{MOCK_USER.greeting}</Text>
          <Text style={styles.greetingName}>
            {user?.first_name || MOCK_USER.name}
          </Text>
        </View>

        {/* Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Account Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceCurrency}>{currency} </Text>
            <Text style={styles.balanceAmount}>
              {balance !== null ? balance.toLocaleString('en-US') : '---'}
            </Text>
            <Ionicons
              name="eye-off-outline"
              size={20}
              color={Colors.surface}
              style={{ marginLeft: 8 }}
            />
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/transfer')}
            >
              <Ionicons
                name="swap-horizontal"
                size={22}
                color={Colors.surface}
              />
              <Text style={styles.actionText}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/international-transfer')}
            >
              <Ionicons
                name="globe-outline"
                size={22}
                color={Colors.surface}
              />
              <Text style={styles.actionText}>International</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/scan')}
            >
              <Ionicons
                name="qr-code-outline"
                size={22}
                color={Colors.surface}
              />
              <Text style={styles.actionText}>Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/history')}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color={Colors.surface}
              />
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/dashboard')}
            >
              <Ionicons
                name="pie-chart-outline"
                size={22}
                color={Colors.surface}
              />
              <Text style={styles.actionText}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Card */}
        <View style={styles.bottomCard}>
          <Text style={styles.sectionTitle}>Quick Action</Text>
          <Text style={styles.sectionSub}>
            People you&apos;ve recently sent or received money with
          </Text>

          {recentContacts.length === 0 ? (
            <View style={styles.emptyQuickAction}>
              <Ionicons
                name="people-outline"
                size={32}
                color={Colors.darkGray}
              />
              <Text style={styles.emptyText}>
                No contacts yet — your recent transfer recipients will show up
                here.
              </Text>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recentContacts}
              keyExtractor={(item) => item.name}
              renderItem={renderQuickAction}
              contentContainerStyle={styles.quickActionList}
            />
          )}

          {/* Recent Transaction */}
          <View style={styles.recentHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Transaction</Text>
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {recentCompleted.length === 0 ? (
            <View style={styles.emptyTxBlock}>
              <Text style={styles.emptyText}>No recent transactions</Text>
            </View>
          ) : (
            recentCompleted.map((item: any) => {
              const isIncome = item.direction === 'received';
              const otherName = isIncome
                ? item.sender?.name
                : item.receiver?.name;
              // Direction-aware: prefer the explicit per-side fields, fall back
              // to legacy `amount` only if the new columns are missing.
              const txAmount = isIncome
                ? Number(item.amountReceived ?? item.amount)
                : Number(item.amountSent ?? item.amount);
              const txCurrency = isIncome
                ? (item.currencyReceived ?? item.currency ?? currency)
                : (item.currencySent ?? item.currency ?? currency);
              return (
                <View key={item.transactionId} style={styles.txRow}>
                  <View style={styles.txAvatar}>
                    <Ionicons
                      name={isIncome ? 'arrow-down' : 'arrow-up'}
                      size={20}
                      color={isIncome ? Colors.primary : Colors.error}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txName} numberOfLines={1}>
                      {otherName || 'Unknown'}
                    </Text>
                    <Text style={styles.txDate}>
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isIncome ? Colors.primary : Colors.error },
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {formatMoney(txAmount, txCurrency)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Notification dropdown */}
      {notifOpen && (
        <>
          <Pressable
            style={styles.notifBackdrop}
            onPress={() => setNotifOpen(false)}
          />
          <View style={styles.notifDropdown}>
            <View style={styles.notifHeader}>
              <View>
                <Text style={styles.notifTitle}>Notifications</Text>
                <Text style={styles.notifSub}>
                  {unreadCount > 0
                    ? `${unreadCount} new`
                    : 'All caught up'}
                </Text>
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead}>
                  <Text style={styles.notifMarkRead}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              style={styles.notifScroll}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {notifications.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={36}
                    color={Colors.darkGray}
                  />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((n) => {
                  const isUnread =
                    !lastReadAt ||
                    new Date(n.date).getTime() >
                      new Date(lastReadAt).getTime();
                  return (
                    <View
                      key={n.id}
                      style={[
                        styles.notifItem,
                        isUnread && styles.notifItemUnread,
                      ]}
                    >
                      <Ionicons
                        name={n.icon}
                        size={28}
                        color={n.color}
                      />
                      <View style={styles.notifBody}>
                        <Text style={styles.notifItemTitle}>{n.title}</Text>
                        <Text
                          style={styles.notifItemDesc}
                          numberOfLines={2}
                        >
                          {n.body}
                        </Text>
                        <Text style={styles.notifItemTime}>
                          {formatRelative(n.date)}
                        </Text>
                      </View>
                      {isUnread && <View style={styles.notifDot} />}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    zIndex: 50,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.navy,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },
  greetingContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 30,
  },
  greetingSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.fontSizes.base,
    marginBottom: 4,
  },
  greetingName: {
    color: Colors.surface,
    fontSize: 28,
    fontWeight: Typography.fontWeights.bold,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: 20,
    zIndex: 10,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.fontSizes.sm,
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 30,
  },
  balanceCurrency: {
    color: Colors.surface,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
  },
  balanceAmount: {
    color: Colors.surface,
    fontSize: 32,
    fontWeight: Typography.fontWeights.bold,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: Colors.surface,
    fontSize: Typography.fontSizes.xs,
    marginTop: Spacing.sm,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: Colors.beige,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    marginTop: -40,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.navy,
  },
  sectionSub: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  emptyQuickAction: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.darkGray,
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  quickActionList: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.base,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    minWidth: 180,
  },
  quickActionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: Spacing.base,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionInitials: {
    color: '#fff',
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  quickActionDetails: {
    flex: 1,
    marginRight: 4,
  },
  quickActionName: {
    color: Colors.surface,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  quickActionAccount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },

  // Recent Transaction
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  emptyTxBlock: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.base,
  },
  txAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
    minWidth: 0,
  },
  txName: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.navy,
  },
  txDate: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.darkGray,
    marginTop: 2,
  },
  txAmount: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },

  // Notification dropdown
  notifBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 90,
  },
  notifDropdown: {
    position: 'absolute',
    top: 64,
    right: Spacing.lg,
    width: 360,
    maxWidth: '92%',
    maxHeight: 480,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 100,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    backgroundColor: '#f9fafb',
  },
  notifTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.navy,
  },
  notifSub: {
    fontSize: 11,
    color: Colors.darkGray,
    marginTop: 2,
  },
  notifMarkRead: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  notifScroll: {
    maxHeight: 420,
  },
  notifEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  notifItemUnread: {
    backgroundColor: '#f0fdf4',
  },
  notifBody: {
    flex: 1,
    minWidth: 0,
  },
  notifItemTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.navy,
  },
  notifItemDesc: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  notifItemTime: {
    fontSize: 10,
    color: Colors.darkGray,
    marginTop: 4,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
});
