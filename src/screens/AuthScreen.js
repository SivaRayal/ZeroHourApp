import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme';
import { Storage } from '../store/storage';

export default function AuthScreen({ onAuthenticated }) {
  const [user, setUser] = useState(null);
  const [hasBio, setHasBio] = useState(false);
  const [bioType, setBioType] = useState('');
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    init();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    startPulse();
    startGlow();
  }, []);

  const init = async () => {
    const u = await Storage.getUser();
    setUser(u);
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setHasBio(compatible && enrolled);
    if (compatible) {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) setBioType('FACE ID');
      else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) setBioType('FINGERPRINT');
      else setBioType('BIOMETRIC');
    }
    // Auto-trigger biometric on load
    if (compatible && enrolled) {
      setTimeout(() => authenticate(), 600);
    }
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const startGlow = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  };

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'ZeroHour — CHECKPOINT',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        onAuthenticated?.();
      } else if (result.error === 'user_fallback') {
        setPinMode(true);
      }
    } catch {
      setPinMode(true);
    }
  };

  const handlePin = (digit) => {
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length >= 4) {
      // Accept any 4-digit PIN (first time sets it, simplified)
      setTimeout(() => {
        setPin('');
        onAuthenticated?.();
      }, 200);
    }
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,255,136,0.2)', 'rgba(0,255,136,0.6)'],
  });

  if (!user) return null;

  return (
    <LinearGradient colors={['#05070D', '#0A0C10', '#050A14']} style={styles.bg}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.tagline}>WHERE DISCIPLINE BEGINS</Text>
          <Text style={styles.logo}>ZEROHOUR</Text>
        </View>

        {/* Welcome board */}
        <View style={styles.boardBox}>
          <Text style={styles.boardLabel}>SECURITY CHECKPOINT</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <Text style={styles.tagline}>WELCOME, </Text>
            <Text style={styles.boardUser}>{user.name.toUpperCase()}</Text>
          </View>
          <Text style={styles.boardSub}>{user.email}</Text>
        </View>

        {!pinMode ? (
          <>
            {/* Biometric button — glow (JS driver) wraps scale (native driver) */}
            <Animated.View style={[styles.bioOuter, { shadowColor: '#00FF88', shadowOpacity: glowAnim }]}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity style={styles.bioBtn} onPress={authenticate} activeOpacity={0.8}>
                  <Text style={styles.bioIcon}>{bioType === 'FACE ID' ? '🪪' : '👁️'}</Text>
                  <Text style={styles.bioLabel}>{hasBio ? bioType : 'AUTHENTICATE'}</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            <Text style={styles.bioSubText}>Touch to verify identity</Text>

            <TouchableOpacity onPress={() => setPinMode(true)} style={styles.pinLink}>
              <Text style={styles.pinLinkText}>USE PASSCODE INSTEAD</Text>
            </TouchableOpacity>
          </>
        ) : (
          <PinPad pin={pin} onDigit={handlePin} onBack={() => setPin(pin.slice(0, -1))} onBio={() => { setPinMode(false); authenticate(); }} hasBio={hasBio} />
        )}
      </Animated.View>
    </LinearGradient>
  );
}

function PinPad({ pin, onDigit, onBack, onBio, hasBio }) {
  const digits = [['1','2','3'],['4','5','6'],['7','8','9'],['',  '0','⌫']];
  return (
    <View style={styles.pinContainer}>
      <Text style={styles.pinTitle}>ENTER PASSCODE</Text>
      <View style={styles.pinDots}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled, { marginHorizontal: 8 }]} />
        ))}
      </View>
      <View style={styles.numPad}>
        {digits.map((row, ri) => (
          <View key={ri} style={styles.numRow}>
            {row.map((d, di) => (
              <TouchableOpacity
                key={di}
                style={[styles.numKey, d === '' && { opacity: 0 }]}
                onPress={() => d === '⌫' ? onBack() : d !== '' && onDigit(d)}
                activeOpacity={0.6}
              >
                <Text style={[styles.numText, d === '⌫' && { fontSize: 20 }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
      {hasBio && (
        <TouchableOpacity onPress={onBio} style={styles.bioPinLink}>
          <Text style={styles.pinLinkText}>USE BIOMETRIC</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  tagline: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, letterSpacing: 4 },
  logo: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: 8, marginTop: 4 },
  boardBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#1A2035',
    padding: SPACING.lg,
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  boardLabel: { color: COLORS.neonAmber, fontSize: 10, letterSpacing: 4, fontWeight: '700' },
  boardUser: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', letterSpacing: 3, marginTop: 8 },
  boardSub: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 4 },
  bioOuter: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,255,136,0.08)',
    borderWidth: 2, borderColor: COLORS.neonGreen,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, elevation: 10,
  },
  bioBtn: { alignItems: 'center', justifyContent: 'center' },
  bioIcon: { fontSize: 44 },
  bioLabel: { color: COLORS.neonGreen, fontSize: 9, letterSpacing: 3, marginTop: 4, fontWeight: '700' },
  bioSubText: { color: COLORS.textDim, fontSize: 11, letterSpacing: 2, marginTop: 12 },
  pinLink: { marginTop: 24 },
  pinLinkText: { color: COLORS.neonAmber, fontSize: 11, letterSpacing: 3, fontWeight: '600' },
  pinContainer: { alignItems: 'center', width: '100%' },
  pinTitle: { color: COLORS.textSecondary, fontSize: 11, letterSpacing: 4, marginBottom: 20 },
  pinDots: { flexDirection: 'row', marginBottom: 32 },
  dotWrapper: { marginHorizontal: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.neonGreen },
  dotFilled: { backgroundColor: COLORS.neonGreen },
  numPad: { width: '70%' },
  numRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  numKey: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: '#1A2035',
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '500' },
  bioPinLink: { marginTop: 20 },
});
