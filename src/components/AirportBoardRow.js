import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../theme';

// Arrival/Departure board row with flip animation
export default function AirportBoardRow({ gate, destination, status, time, color, index = 0 }) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(opAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const statusColor =
    status === 'ON TIME' ? COLORS.neonGreen :
    status === 'BOARDING' ? COLORS.neonAmber :
    status === 'DELAYED' ? COLORS.neonRed :
    status === 'ACTIVE' ? COLORS.neonCyan :
    status === 'LANDED' ? COLORS.textDim : COLORS.textSecondary;

  return (
    <Animated.View style={[styles.row, { opacity: opAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.gate}>
        <Text style={styles.gateText}>{gate}</Text>
      </View>
      <View style={styles.dest}>
        <Text style={styles.destText} numberOfLines={1}>{destination}</Text>
      </View>
      <View style={styles.time}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
      <View style={[styles.statusBadge, { borderColor: statusColor }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2035',
    backgroundColor: '#0F1218',
    marginBottom: 2,
    borderRadius: 6,
  },
  gate: { width: 44 },
  gateText: { color: COLORS.neonAmber, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  dest: { flex: 1, paddingHorizontal: 8 },
  destText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '500', letterSpacing: 0.5 },
  time: { width: 52, alignItems: 'flex-end', marginRight: 10 },
  timeText: { color: COLORS.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] },
  statusBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
});
