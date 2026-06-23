import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

// ── Types ─────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string>;
  status: number;
}

// ── Transfer Types ────────────────────────────────────────────

export type PhoneCountry = 'US' | 'VN' | 'OTHER';

export interface RecipientLookup {
  success: boolean;
  user: {
    name: string;
    maskedPhone: string;
    maskedEmail: string;
    phoneCountry?: PhoneCountry;
  };
}

export interface InitiateTransferResponse {
  success: boolean;
  transactionId: string;
  referenceCode: string;
  amount: number;
  receiver: {
    name: string;
    maskedPhone: string;
  };
  otpSent: boolean;
  _dev_otp?: string;
}

export interface TransactionInfo {
  transactionId: string;
  /** Direction-aware: what the logged-in user actually saw move on their wallet. */
  amount: number;
  /** Direction-aware currency that pairs with `amount`. */
  currency?: string;
  // Both sides — useful for cross-currency rendering.
  amountSent?: number;
  amountReceived?: number;
  currencySent?: string;
  currencyReceived?: string;
  type: string;
  status: string;
  referenceCode: string;
  description: string | null;
  sender: { name: string; phone?: string; email?: string | null };
  receiver: { name: string; phone?: string; email?: string | null };
  createdAt: string;
  completedAt: string | null;
  direction?: 'sent' | 'received';
}

export interface VerifyOTPResponse {
  success: boolean;
  status: string;
  transaction: TransactionInfo;
}

export interface TransactionHistoryResponse {
  success: boolean;
  transactions: TransactionInfo[];
}

export interface BalanceResponse {
  success: boolean;
  balance: number;
  currency: string;
}

// ── Core fetch wrapper ────────────────────────────────────────
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = Platform.OS === 'web' 
    ? await AsyncStorage.getItem('auth_token')
    : await SecureStore.getItemAsync('auth_token');

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type') ?? '';
  let data: unknown = null;

  if (res.status !== 204 && res.status !== 205) {
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = text.length > 0 ? text : null;
    }
  }

  if (!res.ok) {
    const dataObj = data as Record<string, unknown> | null;
    const isObject = typeof dataObj === 'object' && dataObj !== null;
    const err: ApiError = {
      message: isObject && 'error' in dataObj && typeof dataObj.error === 'string'
        ? dataObj.error
        : isObject && 'message' in dataObj && typeof dataObj.message === 'string'
          ? dataObj.message
          : typeof data === 'string' && (data as string).length > 0
            ? (data as string)
            : 'Something went wrong',
      errors: isObject && 'errors' in dataObj && typeof dataObj.errors === 'object' && dataObj.errors !== null
        ? dataObj.errors as Record<string, string>
        : undefined,
      status: res.status,
    };
    throw err;
  }

  return data as T;
}

// ── Auth API ──────────────────────────────────────────────────
export const authAPI = {
  login: async ({ email, password }: { email: string; password: string }) => {
    const data = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem('auth_token', data.token);
    } else {
      await SecureStore.setItemAsync('auth_token', data.token);
    }
    
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  register: async ({
    firstName, lastName, phone, email, password,
  }: {
    firstName: string; lastName: string; phone: string; email: string; password: string;
  }) =>
    request<{ success: boolean; data: { user: User; wallet: any; token: string } }>('/users/register', {
      method: 'POST',
      body: JSON.stringify({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim().replace(/[\s\-]/g, ''),
        email: email.trim().toLowerCase(),
        password,
      }),
    }),

  logout: async () => {
    try { await request('/auth/logout', { method: 'POST' }); } catch {}
    
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem('auth_token');
    } else {
      await SecureStore.deleteItemAsync('auth_token');
    }
    
    await AsyncStorage.removeItem('user');
  },

  getMe: async () => request<{ user: User }>('/auth/me'),
};

// ── Transfer API ──────────────────────────────────────────────
export const transferAPI = {
  lookupRecipient: async (identifier: string): Promise<RecipientLookup> => {
    return request<RecipientLookup>('/transfer/lookup', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  initiateTransfer: async (
    receiverIdentifier: string,
    amount: number,
    description?: string
  ): Promise<InitiateTransferResponse> => {
    return request<InitiateTransferResponse>('/transfer/initiate', {
      method: 'POST',
      body: JSON.stringify({ receiverIdentifier, amount, description }),
    });
  },

  verifyOTP: async (
    transactionId: string,
    otpCode: string
  ): Promise<VerifyOTPResponse> => {
    return request<VerifyOTPResponse>('/transfer/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ transactionId, otpCode }),
    });
  },

  getHistory: async (
    limit = 20,
    offset = 0
  ): Promise<TransactionHistoryResponse> => {
    return request<TransactionHistoryResponse>(
      `/transfer/history?limit=${limit}&offset=${offset}`
    );
  },

  getBalance: async (): Promise<BalanceResponse> => {
    return request<BalanceResponse>('/transfer/balance');
  },

  /** Convert `amount` from one currency to another via aegis-pay backend
   *  (FX brought in-house from the team microservice). */
  convertCurrency: async (
    senderCur: string,
    targetCur: string,
    amount: number,
  ): Promise<{ success: boolean; result: number }> => {
    return request<{ success: boolean; result: number }>('/transfer/convert', {
      method: 'POST',
      body: JSON.stringify({ senderCur, targetCur, amount }),
    });
  },
};

// ── AI Assistant (also brought in-house from the microservice) ──
export const aiAPI = {
  ask: async (text: string): Promise<{ summary: string }> => {
    const res = await request<{ success: boolean; summary: string; error?: string }>(
      `/ai/ask/${encodeURIComponent(text)}`,
    );
    return { summary: res.summary };
  },
};

// ── Microservice (AI chat + currency conversion) ──────────────
//const MICROSERVICE_URL = (
//  process.env.EXPO_PUBLIC_MICROSERVICE_URL ?? ''
//).replace(/\/$/, '');

const MICROSERVICE_URL = "https://coilmicroservice-docker.azurewebsites.net";

export const microserviceAPI = {
  /** Ask the AI assistant a question. Returns the model's text answer. */
  askAI: async (text: string): Promise<{ summary: string }> => {
    if (!MICROSERVICE_URL) {
      throw new Error('Microservice URL is not configured');
    }
    const res = await fetch(
      `${MICROSERVICE_URL}/summarize/${encodeURIComponent(text)}`,
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as any).error || `AI request failed (${res.status})`);
    }
    return res.json();
  },

  /** Convert `amount` from `senderCur` to `targetCur` using live FX rates. */
  convertCurrency: async (
    senderCur: string,
    targetCur: string,
    amount: number,
  ): Promise<{ result: number }> => {
    if (!MICROSERVICE_URL) {
      throw new Error('Microservice URL is not configured');
    }
    const res = await fetch(`${MICROSERVICE_URL}/convert-currency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderCur, targetCur, amount }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        (data as any).error || `Currency conversion failed (${res.status})`,
      );
    }
    return res.json();
  },
};

// Currency helper used across screens.
export function currencyFor(country?: PhoneCountry | string | null): string {
  if (country === 'US') return 'USD';
  if (country === 'VN') return 'VND';
  return 'USD';
}

/**
 * Format a numeric amount with the right symbol/decimals for a currency code.
 *   formatMoney(1234.5, 'USD') → '$1,234.50'
 *   formatMoney(1234567, 'VND') → '1,234,567 VND'
 *   formatMoney(99, 'EUR')      → '99.00 EUR'
 */
export function formatMoney(amount: number, currency: string = 'USD'): string {
  if (amount == null || isNaN(amount)) return '—';
  const isVND = currency === 'VND';
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isVND ? 0 : 2,
    maximumFractionDigits: isVND ? 0 : 2,
  });
  if (currency === 'USD') return '$' + formatter.format(amount);
  return formatter.format(amount) + ' ' + currency;
}
