import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import { COLORS, SPACING, FONTS, RADIUS } from "../theme";
import { Storage } from "../store/storage";
import AirportBoardRow from "../components/AirportBoardRow";
import { getCurrentStreak, getAchievedBadges } from "../utils/streakHelper";
import SectionHeader from "../components/SectionHeader";

const { width } = Dimensions.get("window");

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [fasting, setFasting] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [log, setLog] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [time, setTime] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const [u, f, t, l] = await Promise.all([
      Storage.getUser(),
      Storage.getFasting(),
      Storage.getTasks(),
      Storage.getDailyLog(),
    ]);
    setUser(u);
    setFasting(f);
    setTasks(t);
    setLog(l);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const streak = getCurrentStreak(log);
  const badges = getAchievedBadges(streak);

  // All tasks sorted by startDate, cap at 8 rows on the board
  const now = Date.now();
  const taskBoard = tasks
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 8)
    .map((t) => {
      let boardStatus;
      // Use explicit status field when present (new tasks)
      switch (t.status) {
        case "scheduled":
          boardStatus = "ON TIME";
          break;
        case "delayed":
          boardStatus = "DELAYED";
          break;
        case "inflight":
          boardStatus = "ACTIVE";
          break;
        case "landed":
          boardStatus = "LANDED";
          break;
        default:
          // Legacy tasks without status field
          if (!t.active) boardStatus = "LANDED";
          else if (new Date(t.startDate).getTime() <= now)
            boardStatus = "ACTIVE";
          else boardStatus = "ON TIME";
      }
      return { ...t, boardStatus };
    });

  const timeStr = format(time, "HH:mm");
  const dateStr = format(time, "EEE dd MMM yyyy").toUpperCase();

  return (
    <LinearGradient
      colors={["#05070D", "#0A0C10", "#050A14"]}
      style={styles.bg}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.neonGreen}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTag}>ZERO-HOUR</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                marginTop: 4,
              }}
            >
              <Text style={styles.tagline}>WELCOME, </Text>
              <Text style={styles.headerGreet}>
                {user ? `${user.name.toUpperCase()}` : "WELCOME ONBOARD"}
              </Text>
            </View>
          </View>
        </View>

        {/* Body-Mind-Soul Terminals */}
        <View style={styles.section}>
          <SectionHeader
            title="SELECT YOUR DESTINATION"
            sub="ZERO-HOUR's TERMINALS"
          />
          <View style={styles.terminalRow}>
            <TerminalCard
              icon="🧬"
              title="BODY"
              sub="FASTING"
              color={COLORS.neonBlue}
              active={fasting?.active}
              activeLabel={fasting?.active ? "IN FLIGHT" : null}
              onPress={() => navigation.navigate("Body")}
            />
            <TerminalCard
              icon="☮️"
              title="ACTION"
              sub="TO-DO LIST"
              color={COLORS.neonGreen}
              active={tasks.some((t) => t.active)}
              activeLabel={tasks.some((t) => t.active) ? "ACTIVE" : null}
              onPress={() => navigation.navigate("Mind")}
            />
            <TerminalCard
              icon="🎯"
              title="MIND"
              sub="FOCUS TIMER"
              color={COLORS.neonPurple}
              onPress={() => navigation.navigate("Soul")}
            />
          </View>
        </View>

        {/* Streak section */}
        {streak > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={
                user
                  ? `${user.name.toUpperCase()}'s · ACHIEVEMENTS`
                  : "YOUR · CONSISTENCY"
              }
              sub={`${streak} DAYS IN FLIGHT`}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.badgeScroll}
            >
              {badges.map((b) => (
                <View
                  key={b.days}
                  style={[styles.badge, { borderColor: b.color }]}
                >
                  <Text style={styles.badgeIcon}>{b.icon}</Text>
                  <Text style={[styles.badgeLabel, { color: b.color }]}>
                    {b.label}
                  </Text>
                </View>
              ))}
              <View style={[styles.badge, { borderColor: COLORS.border }]}>
                <Text style={styles.badgeIcon}>🔥</Text>
                <Text style={[styles.badgeLabel, { color: COLORS.neonAmber }]}>
                  {streak} DAY RUN
                </Text>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Arrivals Board */}
        <View style={styles.section}>
          <SectionHeader title="YOUR SCHEDULE" sub="ARRIVALS · DEPARTURES" />
          <View style={styles.boardHeader}>
            <Text style={styles.boardCol}>GATE</Text>
            <Text style={[styles.boardCol, { flex: 1 }]}>DESTINATION</Text>
            <Text style={styles.boardCol}>TIME</Text>
            <Text style={styles.boardCol}>STATUS</Text>
          </View>
          {fasting?.active && (
            <AirportBoardRow
              gate="B1"
              destination={`FASTING · ${fasting.window}`}
              time={format(
                new Date(fasting.startTime + fasting.targetHours * 3600000),
                "HH:mm",
              )}
              status="ACTIVE"
              index={0}
            />
          )}
          {taskBoard.length === 0 && !fasting?.active ? (
            <View style={styles.emptyBoard}>
              <Text style={styles.emptyText}>NO SCHEDULED FLIGHTS</Text>
              <Text style={styles.emptySub}>
                Schedule tasks in ACTION or BODY terminals.
              </Text>
            </View>
          ) : (
            taskBoard.map((t, i) => (
              <AirportBoardRow
                key={t.id}
                gate={`M${i + 1}`}
                destination={t.name}
                time={format(new Date(t.startDate), "HH:mm")}
                status={t.boardStatus}
                index={fasting?.active ? i + 1 : i}
              />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

export { default as SectionHeader } from "../components/SectionHeader";

function TerminalCard({
  icon,
  title,
  sub,
  color,
  active,
  activeLabel,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[styles.terminal, { borderColor: active ? color : "#1A2035" }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {active && (
        <View style={[styles.activeDot, { backgroundColor: color }]} />
      )}
      <Text style={styles.termIcon}>{icon}</Text>
      <Text style={[styles.termTitle, { color }]}>{title}</Text>
      <Text style={styles.termSub}>{sub}</Text>
      {activeLabel && (
        <View
          style={[
            styles.activeBadge,
            { backgroundColor: color + "22", borderColor: color },
          ]}
        >
          <Text style={[styles.activeBadgeText, { color }]}>{activeLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: SPACING.lg,
    paddingTop: 72,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    letterSpacing: 4,
  },
  headerTag: {
    color: COLORS.neonAmber,
    fontSize: 28,
    letterSpacing: 4,
    fontWeight: "700",
  },
  headerGreet: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
    maxWidth: 180,
  },
  clockBox: { alignItems: "flex-end" },
  clockTime: {
    color: COLORS.neonGreen,
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  clockDate: {
    color: COLORS.textSecondary,
    fontSize: 9,
    letterSpacing: 2,
    textAlign: "right",
    marginTop: 2,
  },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  badgeScroll: { paddingVertical: 4 },
  badge: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    alignItems: "center",
  },
  badgeIcon: { fontSize: 22 },
  badgeLabel: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "700",
    marginTop: 4,
  },
  terminalRow: { flexDirection: "row" },
  terminal: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    minHeight: 130,
    justifyContent: "center",
    position: "relative",
    marginHorizontal: 4,
  },
  activeDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  termIcon: { fontSize: 30, marginBottom: 8 },
  termTitle: { fontSize: FONTS.sizes.lg, fontWeight: "900", letterSpacing: 3 },
  termSub: {
    color: COLORS.textDim,
    fontSize: 8,
    letterSpacing: 2,
    marginTop: 3,
    textAlign: "center",
  },
  activeBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 8,
  },
  activeBadgeText: { fontSize: 8, fontWeight: "700", letterSpacing: 2 },
  boardHeader: {
    flexDirection: "row",
    backgroundColor: "#0F1218",
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  boardCol: {
    color: COLORS.textDim,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "700",
    width: 52,
  },
  emptyBoard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textDim,
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: "700",
  },
  emptySub: {
    color: COLORS.textDim,
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
});
