import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import {
  COLORS,
  SPACING,
  FONTS,
  RADIUS,
  FASTING_STAGES,
  FASTING_WINDOWS,
} from "../theme";
import { Storage } from "../store/storage";
import FlipClock from "../components/FlipClock";
import NeonRing from "../components/NeonRing";
import SectionHeader from "../components/SectionHeader";
import DisclaimerModal from "../components/DisclaimerModal";
import {
  scheduleFastingReminder,
  cancelNotification,
} from "../utils/notifications";

const FASTING_DISCLAIMER_BODY =
  'Fasting may not be suitable for everyone. Consult a healthcare professional before starting a fasting routine, especially if you have a medical condition, are pregnant, nursing, or taking medications.\n\n' +
  'This app provides tracking tools only and does not offer medical advice. The app is not responsible for any medical illness caused due to excess fasting.\n\n' +
  'Use at your own risk.';

const { width, height } = Dimensions.get("window");

const FAST_IMAGES = [
  require("../../assets/fast-screen-1.png"),
  require("../../assets/fast-screen-2.png"),
  require("../../assets/fast-screen-3.png"),
  require("../../assets/fast-screen-4.png"),
  require("../../assets/fast-screen-5.png"),
  require("../../assets/fast-screen-6.png"),
];

export default function BodyScreen() {
  const [fasting, setFasting] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [showFastDisclaimer, setShowFastDisclaimer] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const stageAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadFasting();
    }, []),
  );

  useEffect(() => {
    let interval;
    if (fasting?.active) {
      interval = setInterval(() => {
        const e = Math.floor((Date.now() - fasting.startTime) / 1000);
        setElapsed(e);
        // FASTING_STAGES[i].hour is the UPPER bound of that stage.
        // Find the first stage whose bound > elapsed → that is the current stage.
        // Default to last stage when elapsed exceeds all bounds.
        const elapsedHours = e / 3600;
        let si = FASTING_STAGES.length - 1;
        for (let i = 0; i < FASTING_STAGES.length; i++) {
          if (elapsedHours < FASTING_STAGES[i].hour) {
            si = i;
            break;
          }
        }
        if (si !== currentStage) {
          animateStageChange(si);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [fasting, currentStage]);

  const loadFasting = async () => {
    const f = await Storage.getFasting();
    if (f?.active) {
      setFasting(f);
      const e = Math.floor((Date.now() - f.startTime) / 1000);
      setElapsed(e);
      const elapsedHours = e / 3600;
      let si = FASTING_STAGES.length - 1;
      for (let i = 0; i < FASTING_STAGES.length; i++) {
        if (elapsedHours < FASTING_STAGES[i].hour) {
          si = i;
          break;
        }
      }
      setCurrentStage(si);
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  const animateStageChange = (newStage) => {
    Animated.sequence([
      Animated.timing(stageAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(stageAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setCurrentStage(newStage);
    Animated.spring(imageScale, {
      toValue: 1.05,
      useNativeDriver: true,
      friction: 4,
    }).start(() => {
      Animated.spring(imageScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }).start();
    });
  };

  const startFasting = async (window) => {
    const data = {
      active: true,
      window: window.label,
      targetHours: window.hours,
      startTime: Date.now(),
      completed: false,
    };
    await Storage.saveFasting(data);
    await scheduleFastingReminder(data);
    setFasting(data);
    setElapsed(0);
    setCurrentStage(0);
    setShowPicker(false);
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const stopFasting = async () => {
    Alert.alert("ABORT FLIGHT?", "End your current fasting window early?", [
      { text: "CONTINUE FLIGHT", style: "cancel" },
      {
        text: "LAND NOW",
        style: "destructive",
        onPress: async () => {
          await cancelNotification("fasting_pre_end");
          await cancelNotification("fasting_end");
          await Storage.clearFasting();
          setFasting(null);
          setElapsed(0);
          Animated.timing(bgOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }).start();
        },
      },
    ]);
  };

  const completeFasting = async () => {
    await Storage.markDayComplete(new Date().toISOString().split("T")[0]);
    const updated = {
      ...fasting,
      completed: true,
      active: false,
      endTime: Date.now(),
    };
    await Storage.saveFasting(updated);
    setFasting(null);
    setElapsed(0);
    Animated.timing(bgOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
    Alert.alert("🏁 LANDED", "Fasting window complete! Streak updated.");
  };

  const stage = FASTING_STAGES[currentStage];
  const progress = fasting
    ? Math.min(elapsed / (fasting.targetHours * 3600), 1)
    : 0;
  const isComplete = progress >= 1;

  return (
    <View style={styles.bg}>
      {/* Background image with neon overlay */}
      {fasting?.active && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}
        >
          <Animated.Image
            source={FAST_IMAGES[Math.min(currentStage, FAST_IMAGES.length - 1)]}
            style={[
              StyleSheet.absoluteFill,
              { width, height, transform: [{ scale: imageScale }] },
            ]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(5,7,13,0.5)", "rgba(5,7,13,0.85)", "#05070D"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {!fasting?.active && (
        <LinearGradient
          colors={["#05070D", "#0A0C10", "#050A14"]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTag}>TERMINAL - F · FASTING</Text>
          <Text style={styles.screenTitle}>FASTING TRACKER</Text>
        </View>

        {fasting?.active ? (
          <ActiveFasting
            fasting={fasting}
            elapsed={elapsed}
            stage={stage}
            progress={progress}
            isComplete={isComplete}
            onStop={stopFasting}
            onComplete={completeFasting}
            stageAnim={stageAnim}
          />
        ) : (
          <IdleState onStart={() => setShowFastDisclaimer(true)} />
        )}
      </ScrollView>

      {/* Window Picker Modal */}
      {/* Fasting disclaimer — shown before the window picker */}
      <DisclaimerModal
        visible={showFastDisclaimer}
        icon="⚠️"
        title="HEALTH NOTICE"
        body={FASTING_DISCLAIMER_BODY}
        confirmLabel="I UNDERSTAND · PROCEED"
        accentColors={["#FFB800", "#FF6D00"]}
        onConfirm={() => {
          setShowFastDisclaimer(false);
          setShowPicker(true);
        }}
      />

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>CHOOSE YOUR FASTING WINDOW</Text>
            <Text style={styles.modalSub}>Select Flight Route</Text>
            <ScrollView>
              {FASTING_WINDOWS.map((w) => (
                <TouchableOpacity
                  key={w.label}
                  style={styles.windowRow}
                  onPress={() => startFasting(w)}
                  activeOpacity={0.7}
                >
                  <View style={styles.windowLabel}>
                    <Text style={styles.windowName}>{w.label}</Text>
                    <Text style={styles.windowDesc}>{w.desc}</Text>
                    <Text style={styles.windowDesc}>{w.subdesc}</Text>
                  </View>
                  <Text style={styles.windowHours}>{w.hours}H</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowPicker(false)}
            >
              <Text style={styles.cancelText}>CLOSE GATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BulletPoint({ text, color, delay }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.bulletRow}>
      <Animated.View
        style={[
          styles.bulletDot,
          { backgroundColor: color, opacity: pulseAnim },
        ]}
      />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function BulletPoints({ text, color }) {
  const points = text
    .split(/\.\s+/)
    .map((p) => p.replace(/\.$/, "").trim())
    .filter((p) => p.length > 0);
  return (
    <View style={styles.bulletContainer}>
      {points.map((pt, i) => (
        <BulletPoint key={i} text={pt} color={color} delay={i * 280} />
      ))}
    </View>
  );
}

function ActiveFasting({
  fasting,
  elapsed,
  stage,
  progress,
  isComplete,
  onStop,
  onComplete,
  stageAnim,
}) {
  const stageOpacity = stageAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.activeContainer}>
      {/* Stage info — directly below screen header */}
      <Animated.View style={[styles.stageBox, { opacity: stageOpacity }]}>
        <Text style={[styles.stageTitle, { color: stage.color }]}>
          {stage.title}
        </Text>
        <Text style={styles.stageSubtitle}>{stage.subtitle}</Text>
      </Animated.View>

      {/* Rings wrapper with clock overlaid at center */}
      <View style={styles.ringsClockWrapper}>
        <NeonRing color={stage.color} size={280} delay={0} />
        <NeonRing color={stage.color} size={220} delay={400} />
        <NeonRing color={stage.color} size={160} delay={800} />
        <View style={styles.clockOverlay}>
          <FlipClock seconds={elapsed} size={60} color={stage.color} />
          <Text style={styles.clockLabel}>ELAPSED FLIGHT TIME</Text>
        </View>
      </View>

      {/* Window info */}
      <View style={[styles.infoCard, { borderColor: stage.color + "44" }]}>
        <SectionHeader
          title={`FLIGHT ROUTE · ${fasting.window}`}
          sub={`TARGET: ${fasting.targetHours}H FAST`}
          color={stage.color}
        />

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: stage.color },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>DEPARTURE</Text>
            <Text style={[styles.progressLabel, { color: stage.color }]}>
              {Math.round(progress * 100)}%
            </Text>
            <Text style={styles.progressLabel}>ARRIVAL</Text>
          </View>
        </View>

        {/* Stage description as glowing bullet points */}
        <BulletPoints text={stage.desc} color={stage.color} />
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        {isComplete ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: stage.color }]}
            onPress={onComplete}
          >
            <Text style={styles.actionBtnText}>🏁 COMPLETE LANDING</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={onStop}>
            <Text style={styles.stopBtnText}>ABORT FLIGHT</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 120 }} />
    </View>
  );
}

function IdleState({ onStart }) {
  return (
    <View style={styles.idleContainer}>
      <View style={styles.idleIcon}>
        <Text style={{ fontSize: 64 }}>✈️</Text>
      </View>
      <Text style={styles.idleTitle}>NO ACTIVE FLIGHT</Text>
      <Text style={styles.idleSub}>
        Start a fasting window to begin your journey
      </Text>

      <View style={styles.stageSectionHeader}>
        <SectionHeader
          title="FASTING STAGES"
          sub="METABOLIC MILESTONES DURING YOUR FAST"
          color={COLORS.neonGreen}
        />
      </View>
      <View style={styles.stagesPreview}>
        {FASTING_STAGES.map((s, i) => (
          <View key={i} style={styles.stagePreviewRow}>
            <View
              style={[styles.stagePreviewDot, { backgroundColor: s.color }]}
            />
            <Text style={styles.stagePreviewHour}>{s.hour}H</Text>
            <Text style={styles.stagePreviewTitle}>{s.title}</Text>
            <Text style={styles.stagePreviewSub}>{s.subtitle}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.startBtn}
        onPress={onStart}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#00FF88", "#00CFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startBtnGrad}
        >
          <Text style={styles.startBtnText}>OPEN GATE · START FAST ✈</Text>
        </LinearGradient>
      </TouchableOpacity>
      <View style={{ height: 120 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#05070D" },
  header: { padding: SPACING.lg, paddingTop: 72 },
  screenTag: {
    color: COLORS.neonGreen,
    fontSize: 9,
    letterSpacing: 4,
    fontWeight: "700",
  },
  screenTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 6,
    marginTop: 4,
  },
  activeContainer: { alignItems: "center", paddingHorizontal: SPACING.lg },
  stageBox: { alignItems: "center", marginBottom: 8 },
  stageTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: "900",
    letterSpacing: 8,
  },
  stageSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    letterSpacing: 4,
    marginTop: 4,
  },
  ringsClockWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 300,
    height: 280,
    marginBottom: SPACING.lg,
  },
  clockOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  clockLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    letterSpacing: 4,
    marginTop: 10,
  },
  progressContainer: {
    width: "100%",
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#1A2035",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressLabel: { color: COLORS.textDim, fontSize: 9, letterSpacing: 2 },
  infoCard: {
    width: "100%",
    backgroundColor: "rgba(15,18,24,0.9)",
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  bulletContainer: { marginTop: SPACING.md },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 6,
  },
  bulletText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  btnRow: { width: "100%" },
  actionBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 2,
  },
  stopBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.neonRed,
  },
  stopBtnText: {
    color: COLORS.neonRed,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 3,
  },
  idleContainer: {
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  idleIcon: { marginBottom: SPACING.md },
  idleTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: "900",
    letterSpacing: 6,
  },
  idleSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  stageSectionHeader: { width: "100%", marginTop: SPACING.xl },
  stagesPreview: {
    width: "100%",
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  stagePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2035",
  },
  stagePreviewDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  stagePreviewHour: {
    color: COLORS.textDim,
    fontSize: 11,
    width: 32,
    fontVariant: ["tabular-nums"],
  },
  stagePreviewTitle: {
    color: COLORS.neonAmber,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700",
    width: 100,
  },
  stagePreviewSub: { color: COLORS.textSecondary, fontSize: 11, flex: 1 },
  startBtn: { width: "100%", borderRadius: RADIUS.md, overflow: "hidden" },
  startBtnGrad: { paddingVertical: 16, alignItems: "center" },
  startBtnText: {
    color: "#0A0C10",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.bgElevated,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: "80%",
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: "900",
    letterSpacing: 4,
    textAlign: "center",
  },
  modalSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  windowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "#1A2035",
  },
  windowLabel: { flex: 1 },
  windowName: {
    color: COLORS.neonAmber,
    fontSize: FONTS.sizes.lg,
    fontWeight: "900",
    letterSpacing: 4,
  },
  windowDesc: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  windowHours: {
    color: COLORS.neonGreen,
    fontSize: FONTS.sizes.xl,
    fontWeight: "900",
  },
  cancelBtn: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    alignItems: "center",
  },
  cancelText: {
    color: COLORS.neonRed,
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: "700",
  },
});
