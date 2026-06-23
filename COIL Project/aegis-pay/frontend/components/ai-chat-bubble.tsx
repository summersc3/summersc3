import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { aiAPI } from '@/src/api/api';

type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
};

const WELCOME: Message = {
  id: 'welcome',
  role: 'ai',
  text:
    "Hi, I'm your Aegis Pay assistant 👋  Ask me anything about transfers, fees, or how to use the app.",
};

export function AIChatBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Auto-scroll to the newest message whenever the list grows.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.ask(text);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'ai',
          text: res.summary?.trim() || '(no response)',
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'ai',
          text: `⚠️ ${err?.message || 'Something went wrong'}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => setOpen(true)}
        >
          <Ionicons name="chatbubbles" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Chat panel */}
      {open && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.panelWrap}
          >
            <View style={styles.panel}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerAvatar}>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Aegis Assistant</Text>
                    <Text style={styles.headerSub}>Online</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={Colors.darkGray} />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <ScrollView
                ref={scrollRef}
                style={styles.msgList}
                contentContainerStyle={{ padding: Spacing.base, gap: 8 }}
              >
                {messages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.bubbleRow,
                      m.role === 'user' && styles.bubbleRowRight,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        m.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          m.role === 'user' && styles.bubbleTextUser,
                        ]}
                      >
                        {m.text}
                      </Text>
                    </View>
                  </View>
                ))}
                {loading && (
                  <View style={styles.bubbleRow}>
                    <View style={[styles.bubble, styles.bubbleAI]}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Input */}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Ask about Aegis Pay..."
                  placeholderTextColor={Colors.text.placeholder}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!input.trim() || loading) && styles.sendBtnDisabled,
                  ]}
                  onPress={sendMessage}
                  disabled={!input.trim() || loading}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 80, // sits above the bottom tab bar
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
  },

  // Backdrop
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 1000,
  },

  // Panel container
  panelWrap: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 80,
    zIndex: 1001,
  },
  panel: {
    width: 360,
    maxWidth: 360,
    height: 480,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: '#fff',
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },

  // Messages
  msgList: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleAI: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.navy,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#fff',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 14,
    fontSize: Typography.fontSizes.sm,
    color: Colors.navy,
    outlineWidth: 0,
    outlineStyle: 'none' as any,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.primaryLight,
    opacity: 0.6,
  },
});
