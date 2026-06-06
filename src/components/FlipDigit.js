import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../theme';

export default function FlipDigit({ value, size = 56, color = COLORS.boardText }) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      // Reset to 0 synchronously, then animate to 1
      flipAnim.setValue(0);
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Update prevValue only AFTER animation completes
        prevValue.current = value;
      });
    }
  }, [value]);

  const cardW = Math.round(size * 0.75);
  const cardH = Math.round(size);
  const halfH = Math.round(cardH / 2);
  const fontSize = size * 0.7;
  const radius = size * 0.1;

  // Top flap: 0deg → -90deg (folds upward, pivot at BOTTOM edge of top half)
  const topRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-90deg', '-90deg'],
  });
  const topOpacity = flipAnim.interpolate({
    inputRange: [0, 0.38, 0.5],
    outputRange: [1, 0, 0],
  });

  // Bottom flap: 90deg → 0deg (unfolds downward, pivot at TOP edge of bottom half)
  const bottomRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['90deg', '90deg', '0deg'],
  });
  const bottomOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.55, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    // overflow: 'visible' is critical — prevents Android from clipping 3D-rotated children
    <View style={[styles.outer, { width: cardW, height: cardH }]}>

      {/* ── Static card (always visible, shows current value) ── */}
      <View style={[styles.staticCard, { width: cardW, height: cardH, borderRadius: radius }]}>
        <Text style={[styles.digit, { fontSize, color, lineHeight: cardH }]} numberOfLines={1}>
          {value}
        </Text>
      </View>

      {/* ── Top flap: shows PREVIOUS value, top half only, folds upward ── */}
      {/*   Pivot trick: translateY +halfH/2 moves rotation axis to bottom edge */}
      <Animated.View
        style={[
          styles.flapBase,
          {
            top: 0,
            width: cardW,
            height: halfH,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
            opacity: topOpacity,
            transform: [
              { perspective: 800 },
              { translateY: halfH / 2 },
              { rotateX: topRotate },
              { translateY: -(halfH / 2) },
            ],
          },
        ]}
      >
        {/*
          Inner View does the text clipping (overflow:hidden here is safe —
          it's on a plain View, not on the 3D-transformed Animated.View).
          lineHeight: cardH makes the text occupy the full card height;
          the halfH clip window shows only the top half of the glyph.
        */}
        <View style={{ width: cardW, height: halfH, overflow: 'hidden' }}>
          <Text
            style={[styles.digit, { fontSize, color, lineHeight: cardH }]}
            numberOfLines={1}
          >
            {prevValue.current}
          </Text>
        </View>
      </Animated.View>

      {/* ── Bottom flap: shows NEW value, bottom half only, unfolds downward ── */}
      {/*   Pivot trick: translateY -halfH/2 moves rotation axis to top edge */}
      <Animated.View
        style={[
          styles.flapBase,
          {
            bottom: 0,
            width: cardW,
            height: halfH,
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
            opacity: bottomOpacity,
            transform: [
              { perspective: 800 },
              { translateY: -(halfH / 2) },
              { rotateX: bottomRotate },
              { translateY: halfH / 2 },
            ],
          },
        ]}
      >
        {/*
          marginTop: -halfH shifts the text UP so only the bottom half of the
          glyph falls inside the halfH clip window.
        */}
        <View style={{ width: cardW, height: halfH, overflow: 'hidden' }}>
          <Text
            style={[styles.digit, { fontSize, color, lineHeight: cardH, marginTop: -halfH }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
      </Animated.View>

      {/* ── Center fold line ── */}
      <View style={[styles.divider, { width: cardW }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
    marginHorizontal: 3,
    overflow: 'visible', // Allow 3D-rotated flaps to render outside layout bounds on Android
  },
  staticCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#0C0E14',
    borderWidth: 1,
    borderColor: '#1A2035',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  flapBase: {
    position: 'absolute',
    left: 0,
    backgroundColor: '#0F1218',
    borderWidth: 1,
    borderColor: '#1A2035',
    alignItems: 'center',
    zIndex: 2,
    // NO overflow: 'hidden' here — having it on the 3D-transformed Animated.View
    // causes Android to clip the bottom half during rotateX animation.
    // Text clipping is handled by the inner plain View instead.
  },
  digit: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    letterSpacing: 1,
    includeFontPadding: false,   // Remove Android's extra glyph padding
    textAlignVertical: 'center',
  },
  divider: {
    position: 'absolute',
    top: '50%',
    height: 2,
    backgroundColor: '#000',
    zIndex: 3,
  },
});
