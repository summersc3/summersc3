import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { authAPI, type User } from '@/src/api/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const storedToken = Platform.OS === 'web'
          ? await AsyncStorage.getItem('auth_token')
          : await SecureStore.getItemAsync('auth_token');
          
        const userJson = await AsyncStorage.getItem('user');
        const storedUser  = userJson ? JSON.parse(userJson) : null;
        if (storedToken && storedUser) {
          setState({ user: storedUser, token: storedToken, isLoading: false, isAuthenticated: true });
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authAPI.login({ email, password });
    setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await authAPI.register(payload);
    const { user, token } = res.data;

    if (Platform.OS === 'web') {
      await AsyncStorage.setItem('auth_token', token);
    } else {
      await SecureStore.setItemAsync('auth_token', token);
    }
    
    await AsyncStorage.setItem('user', JSON.stringify(user));

    setState({ user, token, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    await authAPI.logout();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await authAPI.getMe();
    setState((s) => ({ ...s, user: data.user }));
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
  }, []);

  // Auto-logout after 5 min of no activity. Listens for clicks/keys/scroll/touches
  // on the window (web) and resets a 5-min timer on each. Only runs while logged in.
  useEffect(() => {
    if (!state.isAuthenticated) return;
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const IDLE_MS = 5 * 60 * 1000; // 5 minutes
    let timer: ReturnType<typeof setTimeout>;

    const triggerLogout = () => {
      logout().catch(() => {});
    };

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(triggerLogout, IDLE_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) =>
      window.addEventListener(e, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [state.isAuthenticated, logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
