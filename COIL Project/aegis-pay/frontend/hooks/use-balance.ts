import { useState, useEffect, useCallback } from 'react';
import { transferAPI, type TransactionInfo } from '@/src/api/api';

export function useBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBalanceData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const [balanceRes, historyRes] = await Promise.all([
        transferAPI.getBalance(),
        transferAPI.getHistory(20, 0)
      ]);

      if (balanceRes.success) {
        setBalance(balanceRes.balance);
        setCurrency(balanceRes.currency);
      }
      if (historyRes.success) {
        setTransactions(historyRes.transactions);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch balance data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    return fetchBalanceData(true);
  }, [fetchBalanceData]);

  useEffect(() => {
    fetchBalanceData();
  }, [fetchBalanceData]);

  // Calculate stats for the dashboard
  const stats = {
    totalIncome: transactions
      .filter(tx => tx.direction === 'received' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount, 0),
    totalOutcome: transactions
      .filter(tx => tx.direction === 'sent' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount, 0),
  };

  return {
    balance,
    currency,
    transactions,
    isLoading,
    isRefreshing,
    error,
    refresh,
    stats
  };
}
