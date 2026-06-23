import { Stack } from 'expo-router';

export default function QRLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // When navigating inside the (qr) block natively, default to standard pushes
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="scan" />
      <Stack.Screen name="my-qr" />
    </Stack>
  );
}
