import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FlipDigit from './FlipDigit';
import { COLORS } from '../theme';

export default function FlipClock({ seconds, size = 56, color = COLORS.boardText }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  return (
    // overflow: 'visible' prevents Android from clipping 3D-animated FlipDigit children
    <View style={styles.row}>
      <FlipDigit value={hh[0]} size={size} color={color} />
      <FlipDigit value={hh[1]} size={size} color={color} />
      <Text style={[styles.sep, { fontSize: size * 0.55, color }]}>:</Text>
      <FlipDigit value={mm[0]} size={size} color={color} />
      <FlipDigit value={mm[1]} size={size} color={color} />
      <Text style={[styles.sep, { fontSize: size * 0.55, color }]}>:</Text>
      <FlipDigit value={ss[0]} size={size} color={color} />
      <FlipDigit value={ss[1]} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible', // Must be visible so 3D-rotated FlipDigit flaps aren't clipped
  },
  sep: {
    fontWeight: '700',
    marginHorizontal: 2,
    marginBottom: 2,
  },
});
