import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  // Animation refs
  const logoAnim = useRef(new Animated.Value(0)).current;
  const piggyAnim = useRef(new Animated.Value(0)).current;
  const piggyFloat = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.stagger(150, [
      Animated.spring(logoAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(piggyAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(piggyFloat, {
          toValue: -12,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(piggyFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [logoAnim, piggyAnim, piggyFloat, buttonAnim, textAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a8a4a" />

      {/* Decorative background circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      {/* Header / Logo */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: logoAnim,
            transform: [
              {
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Starbucks-like icon placeholder — replace with your SVG/asset */}
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>✦</Text>
        </View>
        <Text style={styles.logoText}>Aegis Pay</Text>
      </Animated.View>

      {/* Piggy Bank Illustration */}
      <Animated.View
        style={[
          styles.illustrationWrapper,
          {
            opacity: piggyAnim,
            transform: [
              {
                scale: piggyAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
              },
              { translateY: piggyFloat },
            ],
          },
        ]}
      >
        <PiggyBankIllustration />
      </Animated.View>

      {/* Bottom CTAs */}
      <View style={styles.bottomSection}>
        <Animated.View
          style={{
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
            width: '100%',
          }}
        >
          <TouchableOpacity
            style={styles.getStartedBtn}
            activeOpacity={0.88}
            onPress={() => router.push('/(auth)/sign-up')}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ opacity: textAnim }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

/** SVG-style piggy bank built from React Native Views */
function PiggyBankIllustration() {
  return (
    <View style={pig.scene}>
      {/* Floating money bills */}
      <Animated.View style={[pig.bill, pig.billTopLeft]}>
        <View style={pig.billInner}>
          <Text style={pig.billText}>$</Text>
        </View>
      </Animated.View>
      <Animated.View style={[pig.bill, pig.billTopRight]}>
        <View style={[pig.billInner, { backgroundColor: '#5bc87a' }]}>
          <Text style={pig.billText}>$</Text>
        </View>
      </Animated.View>
      <Animated.View style={[pig.bill, pig.billMid]}>
        <View style={[pig.billInner, { backgroundColor: '#3aad60', transform: [{ rotate: '-15deg' }] }]}>
          <Text style={pig.billText}>$</Text>
        </View>
      </Animated.View>

      {/* Coin */}
      <View style={pig.coin}>
        <Text style={pig.coinText}>$</Text>
      </View>

      {/* Main piggy body */}
      <View style={pig.body}>
        {/* Shine */}
        <View style={pig.bodyShine} />

        {/* Eye */}
        <View style={pig.eye}>
          <View style={pig.eyePupil} />
        </View>

        {/* Snout */}
        <View style={pig.snout}>
          <View style={pig.nostrilLeft} />
          <View style={pig.nostrilRight} />
        </View>

        {/* Ear */}
        <View style={pig.ear} />

        {/* Coin slot on top */}
        <View style={pig.slot} />

        {/* Legs */}
        <View style={pig.legs}>
          <View style={pig.leg} />
          <View style={pig.leg} />
          <View style={pig.leg} />
          <View style={pig.leg} />
        </View>

        {/* Tail */}
        <View style={pig.tail} />

        {/* Dollar sign on body */}
        <Text style={pig.dollarBody}>$</Text>
      </View>
    </View>
  );
}

const pig = StyleSheet.create({
  scene: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bill: {
    position: 'absolute',
    width: 70,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
  },
  billInner: {
    flex: 1,
    backgroundColor: '#4dc470',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '15deg' }],
  },
  billTopLeft: { top: 10, left: 10, transform: [{ rotate: '-20deg' }] },
  billTopRight: { top: 5, right: 15, transform: [{ rotate: '20deg' }] },
  billMid: { top: 55, right: 5 },
  billText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  coin: {
    position: 'absolute',
    top: 20,
    right: 55,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0c040',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d4a010',
    elevation: 4,
  },
  coinText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#a07800',
  },
  body: {
    width: 170,
    height: 130,
    backgroundColor: '#2d9e54',
    borderRadius: 80,
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    position: 'relative',
    overflow: 'visible',
  },
  bodyShine: {
    position: 'absolute',
    top: 16,
    left: 30,
    width: 60,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    transform: [{ rotate: '-20deg' }],
  },
  eye: {
    position: 'absolute',
    top: 28,
    right: 42,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1a7a3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePupil: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0d4d26',
  },
  snout: {
    position: 'absolute',
    bottom: 24,
    right: 22,
    width: 44,
    height: 30,
    borderRadius: 22,
    backgroundColor: '#1f7a42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
  },
  nostrilLeft: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#145c30',
  },
  nostrilRight: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#145c30',
  },
  ear: {
    position: 'absolute',
    top: -18,
    right: 40,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2d9e54',
    borderWidth: 3,
    borderColor: '#1f7a42',
  },
  slot: {
    position: 'absolute',
    top: -6,
    left: 60,
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1f7a42',
  },
  legs: {
    position: 'absolute',
    bottom: -22,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'center',
  },
  leg: {
    width: 28,
    height: 24,
    backgroundColor: '#2d9e54',
    borderRadius: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 2,
    borderColor: '#1f7a42',
  },
  tail: {
    position: 'absolute',
    right: -12,
    top: 30,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#1f7a42',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  dollarBody: {
    position: 'absolute',
    left: 30,
    fontSize: 28,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.25)',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f9152',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  // Subtle depth circles
  bgCircle1: {
    position: 'absolute',
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -width * 0.5,
    left: -width * 0.2,
  },
  bgCircle2: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    bottom: -width * 0.3,
    right: -width * 0.3,
  },
  bgCircle3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: height * 0.3,
    left: -40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  illustrationWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  getStartedBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    elevation: 6,
  },
  getStartedText: {
    color: '#1a7a3e',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loginText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  loginLink: {
    color: '#ffffff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
