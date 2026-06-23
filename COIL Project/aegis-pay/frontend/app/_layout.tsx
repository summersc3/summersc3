import 'react-native-reanimated';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

/**
 * Inner component — has access to useAuth() because it sits inside <AuthProvider>.
 * Watches isAuthenticated + isLoading and redirects accordingly:
 *
 *   Not authenticated  →  /(auth)/login
 *   Authenticated      →  /(tabs)
 */
function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // wait until AsyncStorage restore is done

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    // Welcome screen lives at app/index.tsx so segments is empty there.
    const onWelcome = segments.length === 0;

    if (isAuthenticated && (inAuthGroup || onWelcome)) {
      // Logged in but landed on welcome/auth — send them to the app.
      router.replace('/(tabs)');
    } else if (!isAuthenticated && inTabsGroup) {
      // Not logged in but trying to access a protected tab → sign-in.
      router.replace('/(auth)/sign-in');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"  options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"  options={{ headerShown: false }} />
        <Stack.Screen name="(qr)"    options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="transfer-confirm" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="transfer-result" options={{ headerShown: false, presentation: 'card', gestureEnabled: false }} />
      </Stack>
    </>
  );
}

/**
 * Root layout — wraps everything in AuthProvider so every screen
 * can call useAuth().
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
