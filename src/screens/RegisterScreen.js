import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme';
import { Storage } from '../store/storage';

export default function RegisterScreen({ onRegistered }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('BOARDING DENIED', 'Name and email are required to board.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('INVALID PASSPORT', 'Please enter a valid email address.');
      return;
    }
    const user = {
      name: name.trim(),
      email: email.trim(),
      phone: phone ? `+91-${phone.trim()}` : '',
      createdAt: Date.now(),
    };
    await Storage.saveUser(user);
    onRegistered?.();
  };

  return (
    <LinearGradient colors={['#05070D', '#0A0C10', '#050A14']} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.tagline}>WHERE DISCIPLINE BEGINS</Text>
              <Text style={styles.logo}>ZEROHOUR</Text>
              <Text style={styles.subtitle}>PASSENGER REGISTRATION</Text>
              <View style={styles.divider} />
            </View>

            {/* Board-style instruction */}
            <View style={styles.boardBox}>
              <Text style={styles.boardLabel}>TERMINAL A · NEW PASSENGER</Text>
              <Text style={styles.boardDesc}>Issue your boarding pass to access all terminals</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <FieldLabel label="PASSENGER NAME" required />
              <TextInput
                style={[styles.input, focused === 'name' && styles.inputFocused]}
                placeholder="Full Name"
                placeholderTextColor={COLORS.textDim}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                autoCapitalize="words"
              />

              <FieldLabel label="CONTACT EMAIL" required />
              <TextInput
                style={[styles.input, focused === 'email' && styles.inputFocused]}
                placeholder="email@domain.com"
                placeholderTextColor={COLORS.textDim}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <FieldLabel label="MOBILE · INDIA (+91)" />
              <View style={[styles.phoneRow, focused === 'phone' && styles.inputFocused]}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="10-digit number"
                  placeholderTextColor={COLORS.textDim}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                  onFocus={() => setFocused('phone')}
                  onBlur={() => setFocused(null)}
                  keyboardType="phone-pad"
                />
              </View>
              <Text style={styles.optionalText}>OPTIONAL — For SMS alerts</Text>

              <TouchableOpacity style={styles.btn} onPress={handleRegister} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#00FF88', '#00CFFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGrad}
                >
                  <Text style={styles.btnText}>ISSUE BOARDING PASS ✈</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function FieldLabel({ label, required }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <Text style={styles.required}>REQUIRED</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.lg, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  tagline: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, letterSpacing: 4, marginBottom: 8 },
  logo: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: FONTS.weights.heavy,
    letterSpacing: 8,
    textAlign: 'center',
  },
  subtitle: { color: COLORS.neonAmber, fontSize: FONTS.sizes.sm, letterSpacing: 6, marginTop: 4 },
  divider: { width: 60, height: 2, backgroundColor: COLORS.neonGreen, marginTop: 16 },
  boardBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#1A2035',
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  boardLabel: { color: COLORS.neonAmber, fontSize: FONTS.sizes.xs, letterSpacing: 3, fontWeight: '700' },
  boardDesc: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 4 },
  form: {},
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, letterSpacing: 2, fontWeight: '600' },
  required: { color: COLORS.neonGreen, fontSize: 9, letterSpacing: 2 },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONTS.sizes.md,
    letterSpacing: 0.5,
  },
  inputFocused: { borderColor: COLORS.neonGreen },
  phoneRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  phonePrefix: {
    backgroundColor: '#141820',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  phonePrefixText: { color: COLORS.neonAmber, fontWeight: '700', fontSize: 14 },
  phoneInput: { flex: 1, color: COLORS.textPrimary, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15 },
  optionalText: { color: COLORS.textDim, fontSize: 10, letterSpacing: 2, marginTop: 4, marginBottom: 8 },
  btn: { marginTop: SPACING.xl, borderRadius: RADIUS.md, overflow: 'hidden' },
  btnGrad: { paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#0A0C10', fontWeight: '900', fontSize: 15, letterSpacing: 3 },
});
