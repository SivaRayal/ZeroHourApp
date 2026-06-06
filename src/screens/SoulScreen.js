import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Vibration,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { COLORS, SPACING, FONTS, RADIUS } from "../theme";
import { Storage } from "../store/storage";
import FlipClock from "../components/FlipClock";
import NeonRing from "../components/NeonRing";
import SectionHeader from "../components/SectionHeader";
import { format } from "date-fns";

const { width } = Dimensions.get("window");

export default function SoulScreen() {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState([]);
  const [sessions, setSessions] = useState([]);

  const startRef = useRef(null);
  const lapStartRef = useRef(0);
  const intervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    loadSessions();
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (running && !paused) {
      startPulse();
    } else {
      stopPulse();
    }
  }, [running, paused]);

  const loadSessions = async () => {
    const s = await Storage.getSessions();
    setSessions(s.slice(-10).reverse());
  };

  const startPulse = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.8,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    glowOpacity.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(glowOpacity, {
      toValue: 0.3,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startRef.current = Date.now() - elapsed * 1000;
    lapStartRef.current = elapsed;
    setRunning(true);
    setPaused(false);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearInterval(intervalRef.current);
    setPaused(true);
    setRunning(false);
  };

  const handleResume = () => {
    startRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
    setPaused(false);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  };

  const handleLap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    const lapTime = elapsed - lapStartRef.current;
    const lap = { n: laps.length + 1, time: lapTime, total: elapsed };
    setLaps((prev) => [lap, ...prev]);
    lapStartRef.current = elapsed;
  };

  const handleStop = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearInterval(intervalRef.current);
    if (elapsed > 0) {
      const session = {
        id: Date.now().toString(),
        duration: elapsed,
        laps: laps.reverse(),
        date: format(new Date(), "yyyy-MM-dd HH:mm"),
        completedAt: Date.now(),
      };
      const all = await Storage.getSessions();
      await Storage.saveSessions([...all, session]);
      await Storage.markDayComplete(format(new Date(), "yyyy-MM-dd"));
      setSessions((prev) => [session, ...prev].slice(0, 10));
    }
    setRunning(false);
    setPaused(false);
    setElapsed(0);
    setLaps([]);
    lapStartRef.current = 0;
  };

  const handleClearSessions = async () => {
    await Storage.saveSessions([]);
    setSessions([]);
  };

  const lapElapsed = elapsed - lapStartRef.current;

  return (
    <LinearGradient
      colors={["#05070D", "#0A0C10", "#050A14"]}
      style={styles.bg}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>FOCUS TIMER</Text>
          <Text style={styles.screenTag}>TERMINAL S · SOUL</Text>
        </View>
        <View style={styles.sectionBlock}>
          <SectionHeader
            title="YOUR FOCUS SESSION"
            sub="ELAPSED · SESSION TIME"
            color={COLORS.neonPurple}
          />
        </View>

        {/* Main clock area */}
        <View style={styles.clockArea}>
          {(running || paused) && (
            <>
              <NeonRing color={COLORS.neonPurple} size={300} delay={0} />
              <NeonRing color={COLORS.neonBlue} size={240} delay={600} />
              <NeonRing color={COLORS.neonCyan} size={180} delay={1200} />
            </>
          )}

          <Animated.View
            style={[styles.clockCenter, { transform: [{ scale: pulseAnim }] }]}
          ></Animated.View>
          <FlipClock
            seconds={elapsed}
            size={66}
            color={running ? COLORS.neonPurple : COLORS.textSecondary}
          />
          {(running || paused) && (
            <View style={styles.lapTimeRow}>
              <Text style={styles.lapTimeLabel}>LAP {laps.length + 1}</Text>
              <Text style={styles.lapTimeVal}>{formatTime(lapElapsed)}</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {!running && !paused && (
            <TouchableOpacity
              style={styles.mainBtn}
              onPress={handleStart}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#9B5DE5", "#00CFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mainBtnGrad}
              >
                <Text style={styles.mainBtnText}>▶ DEPARTURE</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {running && (
            <View style={styles.runControls}>
              <TouchableOpacity
                style={styles.secBtn}
                onPress={handleLap}
                activeOpacity={0.8}
              >
                <Text style={styles.secBtnText}>LAP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pauseBtn}
                onPress={handlePause}
                activeOpacity={0.8}
              >
                <Text style={styles.pauseBtnText}>⏸ HOLD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopBtn}
                onPress={handleStop}
                activeOpacity={0.8}
              >
                <Text style={styles.stopBtnText}>■ LAND</Text>
              </TouchableOpacity>
            </View>
          )}

          {paused && (
            <View style={styles.runControls}>
              <TouchableOpacity
                style={styles.secBtn}
                onPress={handleStop}
                activeOpacity={0.8}
              >
                <Text style={[styles.secBtnText, { color: COLORS.neonRed }]}>
                  ■ DISCARD
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mainBtn}
                onPress={handleResume}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#9B5DE5", "#00CFFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.mainBtnGrad}
                >
                  <Text style={styles.mainBtnText}>▶ RESUME</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Laps */}
        {laps.length > 0 && (
          <View style={styles.lapsSection}>
            <SectionHeader
              title="LAP MANIFEST"
              sub={`${laps.length} LAPS RECORDED`}
              color={COLORS.neonPurple}
            />
            {laps.map((lap) => (
              <View key={lap.n} style={styles.lapRow}>
                <Text style={styles.lapN}>LAP {lap.n}</Text>
                <Text style={styles.lapTime}>{formatTime(lap.time)}</Text>
                <Text style={styles.lapTotal}>{formatTime(lap.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Past Sessions */}
        {sessions.length > 0 && !running && !paused && (
          <View style={styles.sessionsSection}>
            <View style={styles.logHeaderRow}>
              <SectionHeader
                title="FLIGHT LOG"
                sub="RECENT FOCUS SESSIONS"
                color={COLORS.neonPurple}
              />
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearSessions}
                activeOpacity={0.7}
              >
                <Text style={styles.clearBtnText}>CLEAR</Text>
              </TouchableOpacity>
            </View>
            {sessions.slice(0, 5).map((s) => (
              <View key={s.id} style={styles.sessionRow}>
                <View style={styles.sessionLeft}>
                  <Text style={styles.sessionDate}>{s.date}</Text>
                  <Text style={styles.sessionDur}>
                    {formatTime(s.duration)}
                  </Text>
                </View>
                <Text style={styles.sessionLaps}>
                  {s.laps?.length || 0} LAPS
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: { padding: SPACING.lg, paddingTop: 72 },
  screenTag: {
    color: COLORS.neonPurple,
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
  clockArea: {
    alignItems: "center",
    justifyContent: "center",
    height: 360,
    marginVertical: 10,
  },
  clockCenter: { alignItems: "center", zIndex: 10 },
  clockLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    letterSpacing: 4,
    marginBottom: 20,
  },
  lapTimeRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  lapTimeLabel: { color: COLORS.textDim, fontSize: 10, letterSpacing: 3 },
  lapTimeVal: {
    color: COLORS.neonCyan,
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  sectionBlock: { paddingHorizontal: SPACING.lg },
  controls: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  mainBtn: { borderRadius: RADIUS.md, overflow: "hidden" },
  mainBtnGrad: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  mainBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 4,
  },
  runControls: { flexDirection: "row", gap: SPACING.sm },
  pauseBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neonAmber,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBtnText: {
    color: COLORS.neonAmber,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 3,
  },
  stopBtn: {
    flex: 1.5,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtnText: {
    color: COLORS.neonRed,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 2,
  },
  secBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#1A2035",
    alignItems: "center",
    justifyContent: "center",
  },
  secBtnText: {
    color: COLORS.textSecondary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 2,
  },
  lapsSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  lapRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#1A2035",
  },
  lapN: {
    color: COLORS.neonPurple,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    width: 60,
  },
  lapTime: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    flex: 1,
    textAlign: "center",
  },
  lapTotal: {
    color: COLORS.textDim,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    width: 80,
    textAlign: "right",
  },
  sessionsSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  logHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
  },
  clearBtnText: {
    color: COLORS.neonRed,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#1A2035",
  },
  sessionLeft: {},
  sessionDate: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1 },
  sessionDur: {
    color: COLORS.neonPurple,
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  sessionLaps: { color: COLORS.textSecondary, fontSize: 11, letterSpacing: 2 },
});
