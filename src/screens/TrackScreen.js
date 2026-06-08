import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import { COLORS, SPACING, FONTS, RADIUS } from "../theme";
import { Storage } from "../store/storage";
import SectionHeader from "../components/SectionHeader";
import FastingTracker from "./FastingTracker";
import {
  recurringTasks,
  monthStates,
  monthSummary,
  yearSummaries,
  summarize,
  combineSummaries,
  firstWeekday,
  MONTHS_SHORT,
  MONTHS_LONG,
  WEEKDAYS,
} from "../utils/consistency";

// ─── Track hub ────────────────────────────────────────────────────────────────
export default function TrackScreen() {
  const [module, setModule] = useState("hub"); // 'hub' | 'fasting'
  const [view, setView] = useState("month"); // 'month' | 'year'
  const [tasks, setTasks] = useState([]);
  const [fasting, setFasting] = useState(null);
  const [now, setNow] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      load();
      setNow(new Date());
    }, []),
  );

  const load = async () => {
    const [t, f] = await Promise.all([
      Storage.getTasks(),
      Storage.getFasting(),
    ]);
    setTasks(recurringTasks(t));
    setFasting(f);
  };

  // The fasting module keeps the original flow untouched.
  if (module === "fasting") {
    return <FastingTracker onBack={() => setModule("hub")} />;
  }

  const year = now.getFullYear();
  const month = now.getMonth();

  // Combined totals for the header summary.
  const overall =
    view === "month"
      ? combineSummaries(tasks.map((t) => monthSummary(t, year, month, now)))
      : combineSummaries(
          tasks.map((t) =>
            combineSummaries(yearSummaries(t, year, now)),
          ),
        );

  return (
    <LinearGradient colors={["#05070D", "#0A0C10", "#050A14"]} style={styles.bg}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTag}>TERMINAL T · TRACK</Text>
          <Text style={styles.screenTitle}>TRACK CENTER</Text>
        </View>

        {/* ── FASTING TRACKER module link ── */}
        <View style={styles.section}>
          <SectionHeader title="MODULES" sub="TRACKING TERMINALS" />
          <TouchableOpacity
            style={styles.moduleCard}
            activeOpacity={0.85}
            onPress={() => setModule("fasting")}
          >
            <View style={styles.moduleIcon}>
              <Ionicons name="timer" size={26} color={COLORS.neonGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.moduleTitle}>FASTING TRACKER</Text>
              <Text style={styles.moduleSub}>
                Intermittent fasting timer · metabolic stages
              </Text>
            </View>
            {fasting?.active && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>IN FLIGHT</Text>
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textDim}
            />
          </TouchableOpacity>
        </View>

        {/* ── Consistency report ── */}
        <View style={styles.section}>
          <SectionHeader
            title="CONSISTENCY REPORT"
            sub={
              view === "month"
                ? `${MONTHS_LONG[month]} ${year} · RECURRING FLIGHTS`
                : `${year} · RECURRING FLIGHTS`
            }
            color={COLORS.neonBlue}
          />

          {/* Month / Year toggle */}
          <View style={styles.toggleRow}>
            {[
              { key: "month", label: "MONTHLY" },
              { key: "year", label: "YEARLY" },
            ].map((v) => {
              const active = view === v.key;
              return (
                <TouchableOpacity
                  key={v.key}
                  style={[styles.toggleBtn, active && styles.toggleBtnActive]}
                  onPress={() => setView(v.key)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      active && styles.toggleTextActive,
                    ]}
                  >
                    {v.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {tasks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔁</Text>
              <Text style={styles.emptyTitle}>NO RECURRING FLIGHTS</Text>
              <Text style={styles.emptySub}>
                Schedule a RECURRING flight in PLAN to start tracking your daily
                consistency here.
              </Text>
            </View>
          ) : (
            <>
              {/* Combined totals */}
              <SummaryBar summary={overall} />
              <Legend />

              {tasks.map((task) =>
                view === "month" ? (
                  <TaskMonthCard
                    key={task.id}
                    task={task}
                    year={year}
                    month={month}
                    now={now}
                  />
                ) : (
                  <TaskYearCard
                    key={task.id}
                    task={task}
                    year={year}
                    now={now}
                  />
                ),
              )}
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────────
function rateColor(rate) {
  if (rate === null || rate === undefined) return COLORS.textDim;
  if (rate >= 80) return COLORS.neonGreen;
  if (rate >= 50) return COLORS.neonAmber;
  return COLORS.neonRed;
}

function SummaryBar({ summary }) {
  const rc = rateColor(summary.rate);
  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryStat}>
        <Text style={[styles.summaryNum, { color: COLORS.neonGreen }]}>
          {summary.success}
        </Text>
        <Text style={styles.summaryLabel}>LANDED</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryStat}>
        <Text style={[styles.summaryNum, { color: COLORS.neonRed }]}>
          {summary.failed}
        </Text>
        <Text style={styles.summaryLabel}>MISSED</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryStat}>
        <Text style={[styles.summaryNum, { color: rc }]}>
          {summary.rate === null ? "–" : `${summary.rate}%`}
        </Text>
        <Text style={styles.summaryLabel}>ON-TIME</Text>
      </View>
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <Ionicons name="checkmark-circle" size={14} color={COLORS.neonGreen} />
        <Text style={styles.legendText}>LANDED</Text>
      </View>
      <View style={styles.legendItem}>
        <Ionicons name="close-circle" size={14} color={COLORS.neonRed} />
        <Text style={styles.legendText}>MISSED</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>PENDING</Text>
      </View>
    </View>
  );
}

// ─── Monthly: calendar per task ───────────────────────────────────────────────
function TaskMonthCard({ task, year, month, now }) {
  const states = monthStates(task, year, month, now);
  const summary = summarize(states);
  const lead = firstWeekday(year, month);

  // Build cells: leading blanks for weekday alignment, then each day.
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push({ key: `b${i}`, day: null });
  states.forEach((st, i) =>
    cells.push({ key: `d${i}`, day: i + 1, state: st }),
  );

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHead}>
        <Text style={styles.taskName} numberOfLines={1}>
          {task.name}
        </Text>
        <Text style={[styles.taskRate, { color: rateColor(summary.rate) }]}>
          {summary.rate === null ? "–" : `${summary.rate}%`}
        </Text>
      </View>
      <Text style={styles.taskMeta}>
        🛫 {task.startDate ? format(new Date(task.startDate.replace(" ", "T")), "dd MMM") : "—"}
        {"  →  "}
        🛬 {task.endDate ? format(new Date(task.endDate.replace(" ", "T")), "dd MMM") : "—"}
        {"   ·   "}
        {summary.success} ✓  {summary.failed} ✕
      </Text>

      {/* Weekday header */}
      <View style={styles.calRow}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={styles.calCell}>
            <Text style={styles.calWeekday}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.calGrid}>
        {cells.map((c) => (
          <DayCell key={c.key} day={c.day} state={c.state} />
        ))}
      </View>
    </View>
  );
}

function DayCell({ day, state }) {
  if (!day) return <View style={styles.calCell} />;
  const isSuccess = state === "success";
  const isFailed = state === "failed";
  return (
    <View style={styles.calCell}>
      <View
        style={[
          styles.dayInner,
          isSuccess && styles.daySuccess,
          isFailed && styles.dayFailed,
          state === "pending" && styles.dayPending,
        ]}
      >
        <Text
          style={[
            styles.dayNum,
            state === "na" && styles.dayNumNA,
            (isSuccess || isFailed) && styles.dayNumDone,
          ]}
        >
          {day}
        </Text>
        {isSuccess && (
          <Ionicons name="checkmark-circle" size={13} color={COLORS.neonGreen} />
        )}
        {isFailed && (
          <Ionicons name="close-circle" size={13} color={COLORS.neonRed} />
        )}
      </View>
    </View>
  );
}

// ─── Yearly: 12-month heat grid per task ──────────────────────────────────────
function TaskYearCard({ task, year, now }) {
  const summaries = yearSummaries(task, year, now);
  const overall = combineSummaries(summaries);

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHead}>
        <Text style={styles.taskName} numberOfLines={1}>
          {task.name}
        </Text>
        <Text style={[styles.taskRate, { color: rateColor(overall.rate) }]}>
          {overall.rate === null ? "–" : `${overall.rate}%`}
        </Text>
      </View>
      <Text style={styles.taskMeta}>
        {overall.success} ✓ LANDED   ·   {overall.failed} ✕ MISSED
      </Text>

      <View style={styles.yearGrid}>
        {summaries.map((s, m) => {
          const rc = rateColor(s.rate);
          const hasData = s.applicable > 0;
          return (
            <View
              key={m}
              style={[
                styles.monthCell,
                {
                  borderColor: hasData ? rc + "66" : "#1A2035",
                  backgroundColor: hasData ? rc + "14" : "transparent",
                },
              ]}
            >
              <Text style={styles.monthCellName}>{MONTHS_SHORT[m]}</Text>
              <Text
                style={[
                  styles.monthCellRate,
                  { color: hasData ? rc : COLORS.textDim },
                ]}
              >
                {s.rate === null ? "–" : `${s.rate}%`}
              </Text>
              <Text style={styles.monthCellCounts}>
                {hasData ? `${s.success}✓ ${s.failed}✕` : "—"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
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
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },

  // Module card
  moduleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.neonGreen + "44",
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  moduleIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.neonGreen + "18",
    borderWidth: 1,
    borderColor: COLORS.neonGreen + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },
  moduleSub: {
    color: COLORS.textDim,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 3,
  },
  activePill: {
    backgroundColor: COLORS.neonBlue + "22",
    borderWidth: 1,
    borderColor: COLORS.neonBlue,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activePillText: {
    color: COLORS.neonBlue,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#1A2035",
    alignItems: "center",
  },
  toggleBtnActive: {
    borderColor: COLORS.neonBlue,
    backgroundColor: COLORS.neonBlue + "22",
  },
  toggleText: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  toggleTextActive: { color: COLORS.neonBlue },

  // Summary bar
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#1A2035",
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  summaryStat: { flex: 1, alignItems: "center" },
  summaryNum: {
    fontSize: 22,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  summaryLabel: {
    color: COLORS.textDim,
    fontSize: 8,
    letterSpacing: 2,
    marginTop: 2,
    fontWeight: "700",
  },
  summaryDivider: { width: 1, height: 30, backgroundColor: "#1A2035" },

  // Legend
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: {
    color: COLORS.textDim,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "700",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.textDim,
  },

  // Task card
  taskCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#1A2035",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  taskHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    flex: 1,
    marginRight: 8,
  },
  taskRate: {
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  taskMeta: {
    color: COLORS.textDim,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: SPACING.sm,
  },

  // Calendar
  calRow: { flexDirection: "row" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  calWeekday: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  dayInner: {
    flex: 1,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  daySuccess: {
    backgroundColor: COLORS.neonGreen + "18",
    borderColor: COLORS.neonGreen + "55",
  },
  dayFailed: {
    backgroundColor: COLORS.neonRed + "18",
    borderColor: COLORS.neonRed + "55",
  },
  dayPending: {
    borderColor: "#1A2035",
  },
  dayNum: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  dayNumDone: { fontSize: 9, marginBottom: 1 },
  dayNumNA: { color: COLORS.textDim, opacity: 0.4 },

  // Year grid
  yearGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: {
    width: "23%",
    margin: "1%",
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  monthCellName: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  monthCellRate: {
    fontSize: 15,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  monthCellCounts: {
    color: COLORS.textDim,
    fontSize: 9,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },

  // Empty
  empty: { alignItems: "center", paddingVertical: SPACING.xl },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    color: COLORS.textDim,
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: "700",
  },
  emptySub: {
    color: COLORS.textDim,
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 16,
  },
});
