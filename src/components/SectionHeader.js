import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../theme';

/**
 * Shared section header used across every screen.
 * accent color defaults to neonGreen; pass `color` to match each terminal.
 */
export default function SectionHeader({ title, sub, color = COLORS.neonGreen }) {
  return (
    <View style={styles.container}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  accent: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  textBlock: { flex: 1 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 2,
  },
});
