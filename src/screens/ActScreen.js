import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, SPACING, FONTS, RADIUS } from "../theme";
import { Storage } from "../store/storage";
import FlipClock from "../components/FlipClock";
import NeonRing from "../components/NeonRing";
import SectionHeader from "../components/SectionHeader";
import ConfirmModal from "../components/ConfirmModal";
import { setTaskStatus } from "../utils/taskStatus";
import { format } from "date-fns";

const { width } = Dimensions.get("window");

export default function ActScreen() {
  // ─── Shared timer state ───────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds since last start/resume
  const [laps, setLaps] = useState([]);
  const [sessions, setSessions] = useState([]);

  // ─── Task session (countdown) ─────────────────────────────────────────────
  const [taskSession, setTaskSession] = useState(null); // null = free-form mode
  const [showLandConfirm, setShowLandConfirm] = useState(false);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const startRef = useRef(null);
  const lapStartRef = useRef(0);
  const intervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  // Mirror state into refs so useFocusEffect cleanup can read latest values
  // without stale closure.
  const taskSessionRef = useRef(null);
  const elapsedRef = useRef(0);
  const runningRef = useRef(false);

  useEffect(() => {
    taskSessionRef.current = taskSession;
  }, [taskSession]);
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // ─── Pulse animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (running && !paused) startPulse();
    else stopPulse();
  }, [running, paused]);

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

  // ─── Focus effect: load session, auto-start if needed ────────────────────
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        // Always reload sessions list
        loadSessions();

        // Check for an active task session
        const session = await Storage.getTaskSession();

        // Reset state for clean start each focus
        clearInterval(intervalRef.current);
        setElapsed(0);
        setRunning(false);
        setPaused(false);
        setLaps([]);
        lapStartRef.current = 0;

        if (session) {
          setTaskSession(session);
          if (session.status === "running") {
            // Auto-start the countdown/elapsed timer
            startRef.current = Date.now();
            setRunning(true);
            setPaused(false);
            intervalRef.current = setInterval(() => {
              const el = Math.floor((Date.now() - startRef.current) / 1000);
              setElapsed(el);
            }, 500);
          } else {
            // Paused — show paused state, wait for user action
            setPaused(true);
          }
        } else {
          setTaskSession(null);
        }
      };

      init();

      // Cleanup: when screen loses focus, save remaining time if running task
      return () => {
        clearInterval(intervalRef.current);
        const ts = taskSessionRef.current;
        const el = elapsedRef.current;
        const run = runningRef.current;

        if (ts && run) {
          // Save remaining/progress so TAKEOFF can resume from here
          const progressSeconds = ts.countdown
            ? Math.max(0, ts.progressSeconds - el)
            : ts.progressSeconds + el;
          Storage.saveTaskSession({ ...ts, progressSeconds, status: "paused" });

          // Revert today's status to automatic (scheduled/delayed)
          Storage.getTasks().then((allTasks) => {
            const updated = allTasks.map((t) =>
              t.id === ts.taskId
                ? { ...setTaskStatus(t, "delayed"), active: true }
                : t,
            );
            Storage.saveTasks(updated);
          });
        }
      };
    }, []),
  );

  // ─── Auto-land check: countdown hit 0 ────────────────────────────────────
  useEffect(() => {
    const ts = taskSession;
    if (ts && ts.countdown && running) {
      const remaining = ts.progressSeconds - elapsed;
      if (remaining <= 0) {
        // Time's up — stop timer and show celebration
        clearInterval(intervalRef.current);
        setElapsed(ts.progressSeconds); // cap display
        setRunning(false);
        setPaused(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowLandConfirm(true);
      }
    }
  }, [elapsed, taskSession, running]);

  // ─── Compute display seconds ──────────────────────────────────────────────
  const displaySeconds = taskSession
    ? taskSession.countdown
      ? Math.max(0, taskSession.progressSeconds - elapsed)
      : taskSession.progressSeconds + elapsed
    : elapsed;

  // ─── Progress ratio for task countdown bar ────────────────────────────────
  const progressRatio =
    taskSession && taskSession.countdown && taskSession.totalSeconds > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (taskSession.progressSeconds - elapsed) / taskSession.totalSeconds,
          ),
        )
      : null;

  // ─── Storage helpers ──────────────────────────────────────────────────────
  const loadSessions = async () => {
    const s = await Storage.getSessions();
    setSessions(s.slice(-10).reverse());
  };

  // ─── Free-form timer controls ─────────────────────────────────────────────
  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startRef.current = Date.now() - elapsed * 1000;
    lapStartRef.current = elapsed;
    setRunning(true);
    setPaused(false);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
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
    }, 500);
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
        laps: [...laps].reverse(),
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

  // ─── Task-mode: HOLD (pause + save remaining + revert task status) ────────
  const handleTaskHold = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(true);

    const ts = taskSession;
    if (!ts) return;
    const progressSeconds = ts.countdown
      ? Math.max(0, ts.progressSeconds - elapsed)
      : ts.progressSeconds + elapsed;

    // Save updated session with remaining time
    const updated = { ...ts, progressSeconds, status: "paused" };
    await Storage.saveTaskSession(updated);
    setTaskSession(updated);
    setElapsed(0); // reset elapsed so resume starts fresh from saved progress

    // Revert today's status to automatic (scheduled/delayed)
    const allTasks = await Storage.getTasks();
    const updatedTasks = allTasks.map((t) =>
      t.id === ts.taskId ? { ...setTaskStatus(t, "delayed"), active: true } : t,
    );
    await Storage.saveTasks(updatedTasks);
  };

  // ─── Task-mode: RESUME (restart interval from saved progress) ─────────────
  const handleTaskResume = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ts = taskSession;
    if (!ts) return;

    // Update session status to running
    const updated = { ...ts, status: "running" };
    await Storage.saveTaskSession(updated);
    setTaskSession(updated);

    setElapsed(0);
    startRef.current = Date.now();
    setRunning(true);
    setPaused(false);
    intervalRef.current = setInterval(() => {
      const el = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(el);
    }, 500);

    // Mark task as inflight again for today
    const allTasks = await Storage.getTasks();
    const updatedTasks = allTasks.map((t) =>
      t.id === ts.taskId ? { ...setTaskStatus(t, "inflight"), active: true } : t,
    );
    await Storage.saveTasks(updatedTasks);
  };

  // ─── Task-mode: LAND request (show confirmation) ──────────────────────────
  const handleTaskLandRequest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLandConfirm(true);
  };

  // ─── Task-mode: LAND confirmed ────────────────────────────────────────────
  const handleConfirmTaskLand = async () => {
    setShowLandConfirm(false);
    clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(false);
    setElapsed(0);

    const ts = taskSession;
    if (!ts) return;

    // Clear the task session
    await Storage.clearTaskSession();
    setTaskSession(null);

    // Mark task as landed for today
    const allTasks = await Storage.getTasks();
    const updatedTasks = allTasks.map((t) =>
      t.id === ts.taskId ? { ...setTaskStatus(t, "landed"), active: false } : t,
    );
    await Storage.saveTasks(updatedTasks);

    // Log to daily progress
    await Storage.markDayComplete(format(new Date(), "yyyy-MM-dd"));

    // Save a focus session for this task
    const focusDur = ts.countdown
      ? ts.totalSeconds - Math.max(0, ts.progressSeconds - elapsed)
      : ts.progressSeconds + elapsed;
    if (focusDur > 0) {
      const session = {
        id: Date.now().toString(),
        duration: focusDur,
        laps: [],
        date: format(new Date(), "yyyy-MM-dd HH:mm"),
        completedAt: Date.now(),
        taskName: ts.taskName,
      };
      const all = await Storage.getSessions();
      await Storage.saveSessions([...all, session]);
      setSessions((prev) => [session, ...prev].slice(0, 10));
    }
  };

  // ─── Task-mode: DISCARD (abandon without landing) ─────────────────────────
  const handleTaskDiscard = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(false);
    setElapsed(0);

    const ts = taskSession;
    if (!ts) return;

    // Clear session
    await Storage.clearTaskSession();
    setTaskSession(null);

    // Revert today's status to automatic (scheduled/delayed)
    const allTasks = await Storage.getTasks();
    const updatedTasks = allTasks.map((t) =>
      t.id === ts.taskId ? { ...setTaskStatus(t, "delayed"), active: true } : t,
    );
    await Storage.saveTasks(updatedTasks);
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const lapElapsed = elapsed - lapStartRef.current;
  const isTaskMode = !!taskSession;
  const ringColor = isTaskMode ? COLORS.neonBlue : COLORS.neonPurple;
  const clockColor = running
    ? isTaskMode
      ? COLORS.neonBlue
      : COLORS.neonPurple
    : COLORS.textSecondary;

  return (
    <LinearGradient
      colors={["#05070D", "#0A0C10", "#050A14"]}
      style={styles.bg}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTag}>TERMINAL A · ACT</Text>
          <Text style={styles.screenTitle}>FOCUS TIMER</Text>
        </View>

        {/* Session label */}
        <View style={styles.sectionBlock}>
          {isTaskMode ? (
            <SectionHeader
              title={taskSession.taskName}
              sub={
                taskSession.countdown
                  ? "COUNTDOWN · MISSION IN PROGRESS"
                  : "ELAPSED · MISSION IN PROGRESS"
              }
              color={COLORS.neonBlue}
            />
          ) : (
            <SectionHeader
              title="YOUR FOCUS SESSION"
              sub="ELAPSED · SESSION TIME"
              color={COLORS.neonPurple}
            />
          )}
        </View>

        {/* Task progress bar (countdown mode only) */}
        {isTaskMode &&
          taskSession.countdown &&
          taskSession.totalSeconds > 0 && (
            <View style={styles.progressBarWrap}>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={[COLORS.neonBlue, COLORS.neonCyan]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${(progressRatio * 100).toFixed(1)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabelLeft}>
                  {formatTime(
                    Math.max(0, taskSession.progressSeconds - elapsed),
                  )}{" "}
                  LEFT
                </Text>
                <Text style={styles.progressLabelRight}>
                  {formatTime(taskSession.totalSeconds)} TOTAL
                </Text>
              </View>
            </View>
          )}

        {/* Main clock area */}
        <View style={styles.clockArea}>
          {(running || paused) && (
            <>
              <NeonRing color={ringColor} size={300} delay={0} />
              <NeonRing color={COLORS.neonBlue} size={240} delay={600} />
              <NeonRing color={COLORS.neonCyan} size={180} delay={1200} />
            </>
          )}

          <Animated.View
            style={[styles.clockCenter, { transform: [{ scale: pulseAnim }] }]}
          />
          <FlipClock seconds={displaySeconds} size={66} color={clockColor} />

          {/* Lap time row — only in free-form mode */}
          {!isTaskMode && (running || paused) && (
            <View style={styles.lapTimeRow}>
              <Text style={styles.lapTimeLabel}>LAP {laps.length + 1} </Text>
              <Text style={styles.lapTimeVal}>{formatTime(lapElapsed)}</Text>
            </View>
          )}

          {/* Task mode status badge */}
          {isTaskMode && (running || paused) && (
            <View
              style={[
                styles.missionBadge,
                { borderColor: running ? COLORS.neonBlue : COLORS.neonAmber },
              ]}
            >
              <Text
                style={[
                  styles.missionBadgeText,
                  { color: running ? COLORS.neonBlue : COLORS.neonAmber },
                ]}
              >
                {running ? "✈ IN FLIGHT" : "⏸ HOLDING"}
              </Text>
            </View>
          )}
        </View>

        {/* ── Controls ── */}
        <View style={styles.controls}>
          {/* ─── FREE-FORM mode ─── */}
          {!isTaskMode && (
            <>
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
                    <Text
                      style={[styles.secBtnText, { color: COLORS.neonRed }]}
                    >
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
            </>
          )}

          {/* ─── TASK mode ─── */}
          {isTaskMode && (
            <>
              {/* Task mode: not yet started (session paused, first focus) */}
              {!running && !paused && (
                <TouchableOpacity
                  style={styles.mainBtn}
                  onPress={handleTaskResume}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.neonBlue, COLORS.neonCyan]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.mainBtnGrad}
                  >
                    <Text style={styles.mainBtnText}>▶ BEGIN MISSION</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {running && (
                <View style={styles.runControls}>
                  <TouchableOpacity
                    style={styles.pauseBtn}
                    onPress={handleTaskHold}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pauseBtnText}>⏸ HOLD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stopBtn}
                    onPress={handleTaskLandRequest}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.stopBtnText, { color: COLORS.neonGreen }]}
                    >
                      ✓ LAND
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {paused && (
                <View style={styles.runControls}>
                  <TouchableOpacity
                    style={styles.secBtn}
                    onPress={handleTaskDiscard}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.secBtnText, { color: COLORS.neonRed }]}
                    >
                      ✕ ABORT
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mainBtn}
                    onPress={handleTaskResume}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[COLORS.neonBlue, COLORS.neonCyan]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.mainBtnGrad}
                    >
                      <Text style={styles.mainBtnText}>▶ RESUME</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Laps (free-form only) */}
        {!isTaskMode && laps.length > 0 && (
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
                  {s.taskName && (
                    <Text style={styles.sessionTask}>{s.taskName}</Text>
                  )}
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

      {/* Task LAND celebration modal */}
      <ConfirmModal
        visible={showLandConfirm}
        icon="🎉"
        title="MISSION ACCOMPLISHED!"
        body={
          taskSession
            ? `"${taskSession.taskName}" has touched down successfully!\n\nGreat work — your mission is complete. The flight has been logged.`
            : "Your focus session has been logged."
        }
        confirmLabel="AWESOME! 🚀"
        confirmColors={["#00FF88", "#00CFFF"]}
        onConfirm={handleConfirmTaskLand}
      />
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
  sectionBlock: { paddingHorizontal: SPACING.lg },
  progressBarWrap: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#1A2035",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  progressLabelLeft: {
    color: COLORS.neonBlue,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
  },
  progressLabelRight: {
    color: COLORS.textDim,
    fontSize: 9,
    letterSpacing: 1,
  },
  clockArea: {
    alignItems: "center",
    justifyContent: "center",
    height: 340,
    marginVertical: 10,
  },
  clockCenter: { alignItems: "center", zIndex: 10 },
  missionBadge: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  missionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
  },
  lapTimeRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  lapTimeLabel: { color: COLORS.textDim, fontSize: 10, letterSpacing: 3 },
  lapTimeVal: {
    color: COLORS.neonCyan,
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
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
    borderColor: COLORS.neonGreen,
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
  sessionTask: {
    color: COLORS.neonBlue,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
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
