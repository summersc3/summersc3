import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { AIChatBubble } from '@/components/ai-chat-bubble';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.lightGray,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <Ionicons name="pie-chart" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transfer"
          options={{
            title: 'Transfer',
            tabBarIcon: ({ color }) => (
              <Ionicons name="swap-horizontal" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="international-transfer"
          options={{
            title: 'International',
            tabBarLabel: 'International',
            tabBarIcon: ({ color }) => (
              <Ionicons name="globe-outline" size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Floating AI assistant — visible across every tab */}
      <AIChatBubble />
    </View>
  );
}
