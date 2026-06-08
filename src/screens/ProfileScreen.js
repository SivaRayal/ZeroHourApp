import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import {
  format,
  startOfMonth,
  getDaysInMonth,
  getMonth,
  getYear,
} from "date-fns";
import { COLORS, SPACING, FONTS, RADIUS } from "../theme";
import { Storage } from "../store/storage";
import {
  getCurrentStreak,
  getAchievedBadges,
  STREAK_BADGES,
} from "../utils/streakHelper";
import SectionHeader from "../components/SectionHeader";

const { width } = Dimensions.get("window");

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null);
  const [log, setLog] = useState({});
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, []),
  );

  const loadData = async () => {
    const [u, l] = await Promise.all([
      Storage.getUser(),
      Storage.getDailyLog(),
    ]);
    setUser(u);
    setLog(l);
    if (u) {
      setEditName(u.name);
      setEditPhone(u.phone?.replace("+91-", "") || "");
    }
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Invalid", "Name required");
      return;
    }
    const updated = {
      ...user,
      name: editName.trim(),
      phone: editPhone ? `+91-${editPhone}` : "",
    };
    await Storage.saveUser(updated);
    setUser(updated);
    setEditing(false);
  };

  const handleShare = async (badge) => {
    try {
      await Share.share({
        message: `🏆 ${badge.icon} I earned the "${badge.label}" badge on ZeroHour!\n${streak} day streak — Where Discipline Begins.\n#ZeroHour #Discipline #Streak`,
        title: `ZeroHour — ${badge.label}`,
      });
    } catch {}
  };

  if (!user) return null;

  const streak = getCurrentStreak(log);
  const achieved = getAchievedBadges(streak);
  const now = new Date();
  const year = getYear(now);
  const month = getMonth(now);

  return (
    <LinearGradient
      colors={["#05070D", "#0A0C10", "#050A14"]}
      style={styles.bg}
    >
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTag}>TERMINAL P · PROFILE</Text>
          <Text style={styles.screenTitle}>PASSENGER FILE</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          {!editing ? (
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name.toUpperCase()}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              {user.phone ? (
                <Text style={styles.profilePhone}>{user.phone}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editBtnText}>EDIT PASSPORT</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.editForm}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Display name"
                placeholderTextColor={COLORS.textDim}
              />
              <View style={styles.phoneRow}>
                <Text style={styles.phonePrefix}>+91</Text>
                <TextInput
                  style={styles.phoneEditInput}
                  value={editPhone}
                  onChangeText={(t) =>
                    setEditPhone(t.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="Mobile number"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.editBtnRow}>
                <TouchableOpacity
                  style={styles.cancelEdit}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.cancelEditText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveEdit} onPress={saveProfile}>
                  <Text style={styles.saveEditText}>SAVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Streak stats */}
        <View style={styles.section}>
          <SectionHeader
            title="CONSISTENCY TRACKER"
            sub="COMPLETED DAYS & STREAK"
            color={COLORS.neonAmber}
          />
          <View style={styles.streakStats}>
            <StatBox
              label="CURRENT STREAK"
              value={`${streak}d`}
              color={COLORS.neonGreen}
            />
            <StatBox
              label="DAYS LOGGED"
              value={`${Object.keys(log).length}`}
              color={COLORS.neonBlue}
            />
            <StatBox
              label="COMPLETED"
              value={`${Object.values(log).filter((v) => v === "complete").length}`}
              color={COLORS.neonAmber}
            />
          </View>
        </View>

        {/* Monthly calendar heatmap */}
        <View style={styles.section}>
          <SectionHeader
            title={`${format(now, "MMMM yyyy").toUpperCase()} · FLIGHT LOG`}
            sub="GREEN = COMPLETE · RED = MISSED"
            color={COLORS.neonAmber}
          />
          <MonthHeatmap year={year} month={month} log={log} />
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <SectionHeader
            title="ACHIEVEMENTS · BADGES"
            sub={`${achieved.length} OF ${STREAK_BADGES.length} EARNED — STREAK MILESTONES ONLY`}
            color={COLORS.neonAmber}
          />
          <View style={styles.badgeGrid}>
            {STREAK_BADGES.map((b) => {
              const earned = streak >= b.days;
              return (
                <View
                  key={b.days}
                  style={[
                    styles.badgeCard,
                    {
                      borderColor: earned ? b.color : "#1A2035",
                      opacity: earned ? 1 : 0.35,
                    },
                  ]}
                >
                  <Text style={styles.badgeIcon}>{b.icon}</Text>
                  <Text
                    style={[
                      styles.badgeLabel,
                      { color: earned ? b.color : COLORS.textDim },
                    ]}
                  >
                    {b.label}
                  </Text>
                  <Text style={styles.badgeDays}>{b.days}d</Text>
                  {earned && (
                    <TouchableOpacity
                      style={[styles.shareBtn, { borderColor: b.color }]}
                      onPress={() => handleShare(b)}
                    >
                      <Text style={[styles.shareText, { color: b.color }]}>
                        SHARE
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert(
              "LOG OUT?",
              "This will sign you out and clear local auth.",
              [
                { text: "STAY", style: "cancel" },
                {
                  text: "LOG OUT",
                  style: "destructive",
                  onPress: () => onLogout?.(),
                },
              ],
            );
          }}
        >
          <Text style={styles.logoutText}>DEPLANE — LOG OUT</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </LinearGradient>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: color + "33",
        padding: SPACING.md,
        alignItems: "center",
        marginHorizontal: 4,
      }}
    >
      <Text
        style={{ color, fontSize: 24, fontWeight: "900", letterSpacing: 2 }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: COLORS.textDim,
          fontSize: 8,
          letterSpacing: 2,
          marginTop: 4,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function MonthHeatmap({ year, month, log }) {
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const firstDay = new Date(year, month, 1).getDay();
  const cells = Array(firstDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <View style={styles.heatmap}>
      <View style={styles.heatmapHeader}>
        {dayLabels.map((d, i) => (
          <Text key={i} style={styles.heatmapDay}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.heatmapRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.heatmapCell} />;
            const key = format(new Date(year, month, day), "yyyy-MM-dd");
            const status = log[key];
            const today = format(new Date(), "yyyy-MM-dd") === key;
            return (
              <View
                key={di}
                style={[
                  styles.heatmapCell,
                  styles.heatmapCellFilled,
                  status === "complete" && styles.heatmapComplete,
                  status === "failed" && styles.heatmapFailed,
                  today && styles.heatmapToday,
                ]}
              >
                <Text
                  style={[
                    styles.heatmapCellText,
                    status === "complete" && { color: "#000" },
                  ]}
                >
                  {day}
                </Text>
              </View>
            );
          })}
          {week.length < 7 &&
            Array(7 - week.length)
              .fill(null)
              .map((_, i) => <View key={`e${i}`} style={styles.heatmapCell} />)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: { padding: SPACING.lg, paddingTop: 72 },
  screenTag: {
    color: COLORS.neonAmber,
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
  profileCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "#1A2035",
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.neonGreen + "22",
    borderWidth: 2,
    borderColor: COLORS.neonGreen,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md, // gap between avatar and info
  },
  avatarText: { color: COLORS.neonGreen, fontSize: 28, fontWeight: "900" },
  profileInfo: { flex: 1, justifyContent: "center" },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: "900",
    letterSpacing: 3,
  },
  profileEmail: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
  profilePhone: { color: COLORS.textDim, fontSize: 11, marginTop: 4 },
  editBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.neonAmber,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  editBtnText: {
    color: COLORS.neonAmber,
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: "700",
  },
  editForm: { flex: 1 },
  editInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    color: COLORS.textPrimary,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
  },
  phonePrefix: {
    color: COLORS.neonAmber,
    fontWeight: "700",
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#141820",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  phoneEditInput: {
    flex: 1,
    color: COLORS.textPrimary,
    padding: 10,
    fontSize: 14,
  },
  editBtnRow: {
    flexDirection: "row",
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  cancelEdit: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1A2035",
  },
  cancelEditText: {
    color: COLORS.textDim,
    fontSize: 11,
    letterSpacing: 2,
  },
  saveEdit: {
    flex: 1,
    backgroundColor: COLORS.neonGreen + "22",
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.neonGreen,
  },
  saveEditText: {
    color: COLORS.neonGreen,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  section: { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg },
  streakStats: { flexDirection: "row" },
  heatmap: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#1A2035",
    padding: SPACING.md,
  },
  heatmapHeader: { flexDirection: "row", marginBottom: 4 },
  heatmapDay: {
    width: (width - SPACING.lg * 2 - SPACING.md * 2) / 7,
    textAlign: "center",
    color: COLORS.textDim,
    fontSize: 9,
    letterSpacing: 1,
  },
  heatmapRow: { flexDirection: "row", marginBottom: 3 },
  heatmapCell: {
    width: (width - SPACING.lg * 2 - SPACING.md * 2) / 7,
    height: 28,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  heatmapCellFilled: {
    backgroundColor: "#141820",
    borderWidth: 1,
    borderColor: "#1A2035",
  },
  heatmapComplete: {
    backgroundColor: COLORS.neonGreen,
    borderColor: COLORS.neonGreen,
  },
  heatmapFailed: {
    backgroundColor: COLORS.neonRed + "66",
    borderColor: COLORS.neonRed,
  },
  heatmapToday: { borderColor: COLORS.neonAmber },
  heatmapCellText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: "600",
  },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap" },
  badgeCard: {
    width: (width - SPACING.lg * 2 - 20) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: "center",
    margin: 5,
  },
  badgeIcon: { fontSize: 32, marginBottom: 8 },
  badgeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },
  badgeDays: {
    color: COLORS.textDim,
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 2,
  },
  shareBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  shareText: { fontSize: 9, fontWeight: "700", letterSpacing: 2 },
  logoutBtn: {
    margin: SPACING.lg,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    alignItems: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neonRed + "44",
  },
  logoutText: {
    color: COLORS.neonRed,
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: "700",
  },
});
