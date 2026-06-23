import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBalance } from '@/hooks/use-balance';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { stats, currency, isRefreshing, refresh } = useBalance();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage my wallet</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        
        {/* Income/Outcome section */}
        <Text style={styles.sectionTitle}>Income/Outcome</Text>
        <View style={styles.cardsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Total Income</Text>
            <Ionicons name="wallet-outline" size={24} color={Colors.surface} style={styles.statIcon} />
            <Text style={styles.statCurrency}>{currency}</Text>
            <Text style={styles.statAmount}>{stats.totalIncome.toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Total Outcome</Text>
            <Ionicons name="cash-outline" size={24} color={Colors.surface} style={styles.statIcon} />
            <Text style={styles.statCurrency}>{currency}</Text>
            <Text style={styles.statAmount}>{stats.totalOutcome.toLocaleString()}</Text>
          </View>
        </View>

        {/* Chart section */}
        <Text style={styles.sectionTitle}>Analytics</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartBars}>
            {/* Mocking the bars as seen in design */}
            <View style={styles.barColumn}>
              <View style={[styles.bar, { height: 100, backgroundColor: Colors.primary }]} />
              <Text style={styles.barLabel}>Jan</Text>
            </View>
            <View style={styles.barColumn}>
              <View style={[styles.bar, { height: 60, backgroundColor: Colors.warning }]} />
              <Text style={styles.barLabel}>Feb</Text>
            </View>
            <View style={styles.barColumn}>
              <View style={[styles.bar, { height: 120, backgroundColor: Colors.primary }]} />
              <Text style={styles.barLabel}>Mar</Text>
            </View>
            <View style={styles.barColumn}>
              <View style={[styles.bar, { height: 80, backgroundColor: Colors.primary }]} />
              <Text style={styles.barLabel}>Apr</Text>
            </View>
            <View style={styles.barColumn}>
              <View style={[styles.bar, { height: 50, backgroundColor: Colors.warning }]} />
              <Text style={styles.barLabel}>May</Text>
            </View>
            <View style={styles.barColumn}>
              <View style={[styles.bar, { height: 90, backgroundColor: Colors.primary }]} />
              <Text style={styles.barLabel}>Jun</Text>
            </View>
            <View style={styles.barColumn}>
              <View style={[styles.bar, { height: 75, backgroundColor: Colors.warning }]} />
              <Text style={styles.barLabel}>Jul</Text>
            </View>
          </View>
        </View>

        {/* Budget Planning section */}
        <Text style={styles.sectionTitle}>Budget Planning</Text>
        <View style={styles.budgetCard}>
          <Ionicons name="podium-outline" size={64} color="rgba(255,255,255,0.1)" style={styles.budgetBgIcon} />
          <TouchableOpacity style={styles.createPlanButton}>
            <Text style={styles.createPlanText}>Create Plan</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.navy,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.navy,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  statTitle: {
    color: Colors.surface,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.xl,
  },
  statIcon: {
    position: 'absolute',
    right: Spacing.md,
    top: 36,
    opacity: 0.8,
  },
  statCurrency: {
    color: Colors.surface,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  statAmount: {
    color: Colors.surface,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
  },
  chartCard: {
    backgroundColor: Colors.beige, 
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  barColumn: {
    alignItems: 'center',
  },
  bar: {
    width: 14,
    borderRadius: BorderRadius.base,
    marginBottom: Spacing.sm,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.darkGray,
  },
  budgetCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  budgetBgIcon: {
    position: 'absolute',
    right: 0,
    bottom: -10,
    transform: [{ scale: 1.5 }],
  },
  createPlanButton: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  createPlanText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
    fontSize: Typography.fontSizes.sm,
  },
});
