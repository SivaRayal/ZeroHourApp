import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { COLORS, SPACING, FONTS, RADIUS } from "../theme";
import { Storage } from "../store/storage";
import { scheduleReminder, cancelNotification } from "../utils/notifications";
import {
  getTaskStatus,
  setTaskStatus,
  migrateTask,
  departureDateTime,
  arrivalDateTime,
  timeOfDay,
} from "../utils/taskStatus";
import SectionHeader from "../components/SectionHeader";
import ConfirmModal from "../components/ConfirmModal";

const FREQ_OPTIONS = [1, 2, 3, 4, 5, 6];

// ─── Status definitions ───────────────────────────────────────────────────────
// Every task repeats daily. Each day it cycles through:
// 'scheduled' – before today's departure time
// 'delayed'   – departure time has passed, not yet TAKEOFF'd
// 'inflight'  – user tapped TAKEOFF (per-day)
// 'landed'    – user tapped LAND     (per-day)
// SCHEDULED/DELAYED are computed live; INFLIGHT/LANDED are stored per-day.
// See ../utils/taskStatus.js

const FILTERS = [
  { key: "scheduled", label: "SCHEDULED", color: COLORS.neonGreen },
  { key: "delayed",   label: "DELAYED",   color: COLORS.neonAmber },
  { key: "inflight",  label: "IN FLIGHT", color: COLORS.neonBlue  },
  { key: "landed",    label: "LANDED",    color: COLORS.textSecondary },
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Drum Roll ────────────────────────────────────────────────────────────────
const DRUM_ITEM_H = 40;

function DrumRoll({ items, selectedIndex, onChange, width = 48 }) {
  const scrollRef = useRef(null);
  // Capture selectedIndex at mount time so the effect closure is stable
  const initIdx = useRef(selectedIndex);

  // Scroll to initial position once the Modal layout is ready.
  // 350 ms comfortably outlasts the default Modal slide animation (~300 ms).
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: initIdx.current * DRUM_ITEM_H,
        animated: false,
      });
    }, 350);
    return () => clearTimeout(t);
  }, []); // mount only — intentional

  const handleScrollEnd = (e) => {
    const raw = e.nativeEvent.contentOffset.y / DRUM_ITEM_H;
    const idx = Math.max(0, Math.min(Math.round(raw), items.length - 1));
    onChange(idx);
  };

  return (
    <View style={[drum.outer, { width }]}>
      {/* Highlight band — pointerEvents="none" so touches pass through */}
      <View style={drum.band} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={DRUM_ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled={true}
        contentContainerStyle={{ paddingVertical: DRUM_ITEM_H }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <View key={i} style={drum.item}>
              <Text
                style={[
                  drum.text,
                  isSelected ? drum.textSelected : drum.textDim,
                ]}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const drum = StyleSheet.create({
  outer: {
    height: DRUM_ITEM_H * 3,
    overflow: "hidden",
  },
  band: {
    position: "absolute",
    top: DRUM_ITEM_H,
    left: 0,
    right: 0,
    height: DRUM_ITEM_H,
    backgroundColor: "rgba(0,207,255,0.08)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(0,207,255,0.25)",
    zIndex: 1,
  },
  item: {
    height: DRUM_ITEM_H,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  textSelected: { color: COLORS.neonBlue, fontSize: 17 },
  textDim: { color: COLORS.textDim, fontSize: 13 },
});

// ─── Inline Date+Time Picker ─────────────────────────────────────────────────
const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const DAYS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const YEARS = Array.from({ length: 6 }, (_, i) => String(2024 + i));
const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const MINS = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);
const AMPM = ["AM", "PM"];

function parseToIndices(dateStr) {
  // dateStr: "yyyy-MM-dd HH:mm" or falsy
  const d = dateStr ? new Date(dateStr.replace(" ", "T")) : new Date();
  const mo = d.getMonth(); // 0-11
  const dy = d.getDate() - 1; // 0-30
  const yr = Math.max(0, Math.min(d.getFullYear() - 2024, YEARS.length - 1));
  const rawH = d.getHours();
  const ap = rawH >= 12 ? 1 : 0;
  const h12 = rawH % 12 === 0 ? 12 : rawH % 12; // 1-12
  const hi = h12 - 1; // 0-11
  const mi = Math.min(Math.round(d.getMinutes() / 5), 11); // 0-11
  return { mo, dy, yr, hi, mi, ap };
}

function buildDateStr(mo, dy, yr, hi, mi, ap) {
  const h12 = hi + 1; // 1-12
  const h24 = ap === 0 ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
  const date = new Date(
    parseInt(YEARS[yr]),
    mo,
    parseInt(DAYS[dy]),
    h24,
    mi * 5,
  );
  return format(date, "yyyy-MM-dd HH:mm");
}

function InlineDateTimePicker({ value, onChange }) {
  const init = parseToIndices(value);
  const [mo, setMo] = useState(init.mo);
  const [dy, setDy] = useState(init.dy);
  const [yr, setYr] = useState(init.yr);
  const [hi, setHi] = useState(init.hi);
  const [mi, setMi] = useState(init.mi);
  const [ap, setAp] = useState(init.ap);

  // Keep current state in ref to avoid stale closures
  const cur = useRef({ mo, dy, yr, hi, mi, ap });
  cur.current = { mo, dy, yr, hi, mi, ap };

  const fire = (overrides) => {
    const s = { ...cur.current, ...overrides };
    onChange(buildDateStr(s.mo, s.dy, s.yr, s.hi, s.mi, s.ap));
  };

  return (
    <View style={pk.container}>
      <View style={pk.block}>
        <Text style={pk.blockLabel}>DATE</Text>
        <View style={pk.row}>
          <DrumRoll
            items={MONTHS}
            selectedIndex={mo}
            onChange={(i) => {
              setMo(i);
              fire({ mo: i });
            }}
            width={52}
          />
          <View style={pk.divider} />
          <DrumRoll
            items={DAYS}
            selectedIndex={dy}
            onChange={(i) => {
              setDy(i);
              fire({ dy: i });
            }}
            width={42}
          />
          <View style={pk.divider} />
          <DrumRoll
            items={YEARS}
            selectedIndex={yr}
            onChange={(i) => {
              setYr(i);
              fire({ yr: i });
            }}
            width={58}
          />
        </View>
      </View>
      <View style={pk.block}>
        <Text style={pk.blockLabel}>TIME</Text>
        <View style={pk.row}>
          <DrumRoll
            items={HOURS}
            selectedIndex={hi}
            onChange={(i) => {
              setHi(i);
              fire({ hi: i });
            }}
            width={46}
          />
          <Text style={pk.colon}>:</Text>
          <DrumRoll
            items={MINS}
            selectedIndex={mi}
            onChange={(i) => {
              setMi(i);
              fire({ mi: i });
            }}
            width={46}
          />
          <View style={pk.divider} />
          <DrumRoll
            items={AMPM}
            selectedIndex={ap}
            onChange={(i) => {
              setAp(i);
              fire({ ap: i });
            }}
            width={44}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Time Slot Picker ─────────────────────────────────────────────────────────
function TimeSlotPicker({ count, slots, onChange, formKey = 0 }) {
  const arr = Array.from({ length: count });

  const handleSlotChange = (i, val24) => {
    const updated = [...slots];
    updated[i] = val24;
    onChange(updated);
  };

  return (
    <View style={{ marginTop: 8 }}>
      {arr.map((_, i) => (
        <View key={i} style={ts.slotRow}>
          <Text style={ts.slotLabel}>SLOT {i + 1}</Text>
          <TimeScrollPicker
            key={`slot-${formKey}-${i}`}
            value={slots[i] || "09:00"}
            onChange={(v) => handleSlotChange(i, v)}
          />
        </View>
      ))}
    </View>
  );
}

function TimeScrollPicker({ value, onChange }) {
  const parseSlot = (v) => {
    if (!v) return { hi: 7, mi: 0, ap: 0 }; // default 08:00 AM
    const [hh, mm] = v.split(":").map(Number);
    const ap = hh >= 12 ? 1 : 0;
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    const hi = h12 - 1;
    const mi = Math.min(Math.round(mm / 5), 11);
    return { hi, mi, ap };
  };

  const init = parseSlot(value);
  const [hi, setHi] = useState(init.hi);
  const [mi, setMi] = useState(init.mi);
  const [ap, setAp] = useState(init.ap);

  const cur = useRef({ hi, mi, ap });
  cur.current = { hi, mi, ap };

  const fireSlot = (overrides) => {
    const s = { ...cur.current, ...overrides };
    const h12 = s.hi + 1;
    const h24 =
      s.ap === 0 ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
    onChange(
      `${String(h24).padStart(2, "0")}:${String(s.mi * 5).padStart(2, "0")}`,
    );
  };

  return (
    <View style={pk.row}>
      <DrumRoll
        items={HOURS}
        selectedIndex={hi}
        onChange={(i) => {
          setHi(i);
          fireSlot({ hi: i });
        }}
        width={46}
      />
      <Text style={pk.colon}>:</Text>
      <DrumRoll
        items={MINS}
        selectedIndex={mi}
        onChange={(i) => {
          setMi(i);
          fireSlot({ mi: i });
        }}
        width={46}
      />
      <View style={pk.divider} />
      <DrumRoll
        items={AMPM}
        selectedIndex={ap}
        onChange={(i) => {
          setAp(i);
          fireSlot({ ap: i });
        }}
        width={44}
      />
    </View>
  );
}

const ts = StyleSheet.create({
  slotRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  slotLabel: {
    color: COLORS.textDim,
    fontSize: 10,
    letterSpacing: 2,
    width: 60,
  },
});

const pk = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  block: { marginBottom: 8 },
  blockLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "center" },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
  },
  colon: {
    color: COLORS.neonBlue,
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 4,
    lineHeight: DRUM_ITEM_H * 3,
    textAlignVertical: "center",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PlanScreen() {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  // Incrementing key forces picker sub-trees to fully remount each time the
  // form opens, so DrumRoll's useEffect fires while the Modal is actually visible.
  const [formKey, setFormKey] = useState(0);
  const [form, setForm] = useState({
    name: "",
    desc: "",
    startDate: format(new Date(), "yyyy-MM-dd HH:mm"),
    endDate: "",
    freq: 1,
    slots: ["09:00"],
    hasEndDate: false,
    recurring: false, // false = single flight, true = repeats daily over window
  });
  const [filter, setFilter] = useState("scheduled");
  // Live clock — recompute scheduled→delayed transitions as time passes.
  const [now, setNow] = useState(new Date());
  // Pending modal confirmations: { id, name } or null
  const [pendingLand, setPendingLand] = useState(null);
  const [pendingDel, setPendingDel]   = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
      setNow(new Date());
      // Tick every 30 s so the live SCHEDULED→DELAYED transition shows up
      const interval = setInterval(() => setNow(new Date()), 30000);
      return () => clearInterval(interval);
    }, []),
  );

  /** Load tasks and migrate any legacy (non-recurring) tasks. */
  const loadTasks = async () => {
    const raw = await Storage.getTasks();
    let dirty = false;
    const migrated = raw.map((t) => {
      const { task, changed } = migrateTask(t);
      if (changed) dirty = true;
      return task;
    });
    if (dirty) await Storage.saveTasks(migrated);
    setTasks(migrated);
  };

  const openForm = () => {
    setForm({
      name: "",
      desc: "",
      startDate: format(new Date(), "yyyy-MM-dd HH:mm"),
      endDate: "",
      freq: 1,
      slots: ["09:00"],
      hasEndDate: false,
    });
    setFormKey((k) => k + 1); // remount all picker sub-trees
    setShowForm(true);
  };

  const saveTask = async () => {
    if (!form.name.trim()) {
      Alert.alert("BOARDING DENIED", "Task name is required");
      return;
    }
    // A recurring flight needs an arrival date to bound its daily window.
    if (form.recurring && !form.hasEndDate) {
      Alert.alert(
        "ARRIVAL REQUIRED",
        "A recurring flight repeats from its departure date to its arrival date — set an arrival time to define the window.",
      );
      return;
    }
    const recurring = form.recurring;
    const base = {
      id: genId(),
      name: form.name.trim(),
      desc: form.desc.trim(),
      startDate: form.startDate,
      endDate: form.hasEndDate ? form.endDate : "",
      freq: form.freq,
      slots: form.slots.filter(Boolean),
      recurring,
      active: true,
      createdAt: Date.now(),
      type: "task",
    };
    const task = recurring
      ? { ...base, dayStatus: {} } // per-day inflight/landed overrides
      : {
          ...base,
          // single instance: initial one-time status
          status:
            new Date(form.startDate).getTime() > Date.now()
              ? "scheduled"
              : "delayed",
        };
    const updated = [task, ...tasks];
    await Storage.saveTasks(updated);
    await scheduleReminder(task);
    setTasks(updated);
    setShowForm(false);
    setFilter(getTaskStatus(task)); // jump to the tab where the new task landed
  };

  /** TAKEOFF: scheduled / delayed → inflight; save session, navigate to Soul. */
  const takeoffTask = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // Calculate today's countdown duration when an arrival time is set
    let countdown = false;
    let totalSeconds = 0;
    let progressSeconds = 0;

    const depTime = departureDateTime(task);
    const arrTime = arrivalDateTime(task);
    if (arrTime) {
      const dur = Math.floor((arrTime.getTime() - depTime.getTime()) / 1000);
      if (dur > 0) {
        countdown = true;
        totalSeconds = dur;
        progressSeconds = dur;
      }
    }

    // Resume a previously-paused session for this task (restore remaining time)
    const existingSession = await Storage.getTaskSession();
    if (existingSession && existingSession.taskId === id) {
      countdown = existingSession.countdown;
      totalSeconds = existingSession.totalSeconds;
      progressSeconds = existingSession.progressSeconds;
    }

    // Persist session — status:'running' tells ActScreen to auto-start.
    // taskStartDate is today's departure so ActScreen can revert correctly.
    await Storage.saveTaskSession({
      taskId: id,
      taskName: task.name,
      taskStartDate: format(depTime, "yyyy-MM-dd HH:mm"),
      countdown,
      totalSeconds,
      progressSeconds,
      status: "running",
    });

    // Mark task as in-flight (per-day for recurring, one-time for single)
    const updated = tasks.map((t) =>
      t.id === id ? { ...setTaskStatus(t, "inflight"), active: true } : t,
    );
    await Storage.saveTasks(updated);
    setTasks(updated);

    // Navigate to Act tab so the countdown starts immediately
    navigation.navigate("Act");
  };

  /** LAND button tapped — show celebration modal first */
  const requestLand = (id, name) => setPendingLand({ id, name });

  /** Confirmed via modal — execute the land */
  const confirmLand = async () => {
    if (!pendingLand) return;
    const { id } = pendingLand;
    setPendingLand(null);
    const updated = tasks.map((t) =>
      t.id === id ? { ...setTaskStatus(t, "landed"), active: false } : t,
    );
    await Storage.saveTasks(updated);
    await Storage.markDayComplete(format(new Date(), "yyyy-MM-dd"));
    setTasks(updated);
  };

  /** DEL button tapped — show confirmation modal first */
  const requestDelete = (id, name) => setPendingDel({ id, name });

  /** Confirmed via modal — execute the delete */
  const confirmDelete = async () => {
    if (!pendingDel) return;
    const { id } = pendingDel;
    setPendingDel(null);
    const updated = tasks.filter((t) => t.id !== id);
    await Storage.saveTasks(updated);
    await cancelNotification(`reminder_pre_${id}`);
    await cancelNotification(`reminder_start_${id}`);
    await cancelNotification(`reminder_missed_${id}`);
    setTasks(updated);
  };

  // Compute today's live status for every task, then filter / count.
  const withStatus = tasks.map((t) => ({ task: t, st: getTaskStatus(t, now) }));
  const filtered = withStatus.filter((x) => x.st === filter).map((x) => x.task);

  // Live counts for tab badges
  const counts = FILTERS.reduce((acc, f) => {
    acc[f.key] = withStatus.filter((x) => x.st === f.key).length;
    return acc;
  }, {});

  return (
    <LinearGradient
      colors={["#05070D", "#0A0C10", "#050A14"]}
      style={styles.bg}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTag}>TERMINAL P · PLAN</Text>
          <Text style={styles.screenTitle}>COMMAND CONTROL</Text>
        </View>
      </View>

      {/* Section 1: Schedule */}
      <View style={styles.sectionBlock}>
        <SectionHeader
          title="CREATE YOUR TO-DO TASK LIST"
          sub="SCHEDULE YOUR FLIGHTS"
          color={COLORS.neonBlue}
        />
        <TouchableOpacity style={styles.addBtn} onPress={openForm}>
          <Text style={styles.addBtnText}>+ SCHEDULE</Text>
        </TouchableOpacity>
      </View>

      {/* Section 2: Task list — extra top spacing */}
      <View style={[styles.sectionBlock, { marginTop: SPACING.lg }]}>
        <SectionHeader
          title="MANAGE YOUR FLIGHTS"
          sub="TRACK YOUR SCHEDULED FLIGHTS"
          color={COLORS.neonBlue}
        />
      </View>
      {/* Filter tabs — horizontally scrollable, one per status */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const cnt = counts[f.key] || 0;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                active && {
                  borderColor: f.color,
                  backgroundColor: f.color + "18",
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  active && { color: f.color },
                ]}
              >
                {f.label}
              </Text>
              {cnt > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    { backgroundColor: active ? f.color : COLORS.textDim },
                  ]}
                >
                  <Text style={styles.filterBadgeText}>{cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
      >
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {filter === "scheduled" ? "🗓️"
               : filter === "delayed" ? "⏰"
               : filter === "inflight" ? "✈️"
               : "🛬"}
            </Text>
            <Text style={styles.emptyText}>
              {filter === "scheduled" ? "NO UPCOMING FLIGHTS"
               : filter === "delayed" ? "NO DELAYED FLIGHTS"
               : filter === "inflight" ? "NO FLIGHTS IN PROGRESS"
               : "NO LANDED FLIGHTS"}
            </Text>
            <Text style={styles.emptySub}>
              {filter === "scheduled" || filter === "delayed"
                ? "Tap + SCHEDULE to plan a new task"
                : "Tap TAKEOFF on a scheduled task to start"}
            </Text>
          </View>
        )}
        {filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            status={getTaskStatus(task, now)}
            onTakeoff={takeoffTask}
            onLandRequest={requestLand}
            onDeleteRequest={requestDelete}
          />
        ))}
      </ScrollView>

      {/* Task Form Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>SCHEDULE FLIGHT</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <Field label="FLIGHT NAME" required>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  placeholder="Task name"
                  placeholderTextColor={COLORS.textDim}
                />
              </Field>

              <Field label="MISSION BRIEF">
                <TextInput
                  style={[
                    styles.input,
                    { minHeight: 70, textAlignVertical: "top" },
                  ]}
                  value={form.desc}
                  onChangeText={(v) => setForm({ ...form, desc: v })}
                  placeholder="Description (optional)"
                  placeholderTextColor={COLORS.textDim}
                  multiline
                />
              </Field>

              {/* FLIGHT TYPE — single vs recurring */}
              <Field label="FLIGHT TYPE">
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      !form.recurring && styles.typeBtnActive,
                    ]}
                    onPress={() => setForm({ ...form, recurring: false })}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        !form.recurring && styles.typeTextActive,
                      ]}
                    >
                      🎫 SINGLE FLIGHT
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      form.recurring && styles.typeBtnActive,
                    ]}
                    onPress={() =>
                      setForm({
                        ...form,
                        recurring: true,
                        // recurring needs an arrival date to bound the window
                        hasEndDate: true,
                        endDate: form.endDate || form.startDate,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.typeText,
                        form.recurring && styles.typeTextActive,
                      ]}
                    >
                      🔁 RECURRING DAILY
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.typeHint}>
                  {form.recurring
                    ? "Repeats every day from the Departure date to the Arrival date, at the times below."
                    : "Happens once at the departure time."}
                </Text>
              </Field>

              {/* DEPARTURE — drum picker */}
              <Field
                label={form.recurring ? "DEPARTURE (START DATE & TIME)" : "DEPARTURE TIME"}
                required
              >
                <InlineDateTimePicker
                  key={`dep-${formKey}`}
                  value={form.startDate}
                  onChange={(v) => setForm({ ...form, startDate: v })}
                />
              </Field>

              {/* ARRIVAL — optional for single, required for recurring */}
              <Field
                label={
                  form.recurring
                    ? "ARRIVAL (END DATE & TIME)"
                    : "ARRIVAL TIME"
                }
                required={form.recurring}
              >
                {form.hasEndDate ? (
                  <View>
                    <InlineDateTimePicker
                      key={`arr-${formKey}`}
                      value={form.endDate || form.startDate}
                      onChange={(v) => setForm({ ...form, endDate: v })}
                    />
                    {!form.recurring && (
                      <TouchableOpacity
                        style={styles.clearArrivalBtn}
                        onPress={() =>
                          setForm({ ...form, hasEndDate: false, endDate: "" })
                        }
                      >
                        <Text style={styles.clearArrivalText}>
                          ✕ CLEAR ARRIVAL
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.setArrivalBtn}
                    onPress={() =>
                      setForm({
                        ...form,
                        hasEndDate: true,
                        endDate: form.startDate,
                      })
                    }
                  >
                    <Text style={styles.setArrivalText}>
                      + SET ARRIVAL TIME
                    </Text>
                  </TouchableOpacity>
                )}
              </Field>

              <Field label="FREQUENCY PER DAY">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {FREQ_OPTIONS.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.freqBtn,
                        form.freq === n && styles.freqBtnActive,
                      ]}
                      onPress={() =>
                        setForm({
                          ...form,
                          freq: n,
                          slots: Array(n)
                            .fill("")
                            .map((_, i) => form.slots[i] || "09:00"),
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.freqText,
                          form.freq === n && styles.freqTextActive,
                        ]}
                      >
                        {n}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Field>

              <Field label={`TIME SLOTS (${form.freq} PER DAY)`}>
                <TimeSlotPicker
                  count={form.freq}
                  slots={form.slots}
                  onChange={(slots) => setForm({ ...form, slots })}
                  formKey={formKey}
                />
              </Field>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.cancelText}>CLOSE GATE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveTask}>
                <LinearGradient
                  colors={["#00CFFF", "#00FF88"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtnGrad}
                >
                  <Text style={styles.saveText}>CLEAR FOR TAKEOFF ✈</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── LAND celebration modal ─────────────────────────────────── */}
      <ConfirmModal
        visible={!!pendingLand}
        icon="🎉"
        title="MISSION ACCOMPLISHED!"
        body={
          `"${pendingLand?.name}" has touched down successfully!\n\n` +
          `Outstanding execution — your discipline is at cruising altitude. ` +
          `Every completed mission brings you closer to your destination.\n\n` +
          `The skies are yours. Keep flying! 🌟`
        }
        confirmLabel="AWESOME! 🚀"
        confirmColors={["#00FF88", "#00CFFF"]}
        onConfirm={confirmLand}
      />

      {/* ── DEL confirmation modal ─────────────────────────────────── */}
      <ConfirmModal
        visible={!!pendingDel}
        icon="🗑️"
        title="DELETE FLIGHT?"
        body={
          `"${pendingDel?.name}" will be permanently removed from your flight log.\n\n` +
          `Once deleted, this mission cannot be tracked or recovered. ` +
          `All progress data will be lost forever.`
        }
        confirmLabel="DELETE FLIGHT"
        confirmColors={["#FF3B5C", "#FF6D00"]}
        cancelLabel="KEEP MISSION"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDel(null)}
      />
    </LinearGradient>
  );
}

// ─── Field Wrapper ────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            color: COLORS.textDim,
            fontSize: 9,
            letterSpacing: 2,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
        {required && (
          <Text
            style={{ color: COLORS.neonGreen, fontSize: 9, letterSpacing: 2 }}
          >
            REQUIRED
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── Task Card helpers ────────────────────────────────────────────────────────
const STATUS_META = {
  scheduled: { color: COLORS.neonGreen,     label: "SCHEDULED" },
  delayed:   { color: COLORS.neonAmber,     label: "DELAYED"   },
  inflight:  { color: COLORS.neonBlue,      label: "IN FLIGHT" },
  landed:    { color: COLORS.textSecondary, label: "LANDED"    },
};

/** "10 Jun – 20 Jun" window label for a recurring task (open-ended → "+"). */
function recurringWindowLabel(task) {
  const start = format(new Date(task.startDate.replace(" ", "T")), "dd MMM");
  if (!task.endDate) return `${start}+`;
  const end = format(new Date(task.endDate.replace(" ", "T")), "dd MMM");
  return `${start} – ${end}`;
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, status, onTakeoff, onLandRequest, onDeleteRequest }) {
  const s    = status || "scheduled";
  const meta = STATUS_META[s] || STATUS_META.scheduled;

  // Recurring tasks can always be deleted (removes the whole daily flight).
  const showDel = true;

  return (
    <View style={[tcs.card, { borderColor: meta.color + "44" }]}>
      {/* Status pill */}
      <View
        style={[
          tcs.statusPill,
          { backgroundColor: meta.color + "22", borderColor: meta.color + "55" },
        ]}
      >
        <View style={[tcs.statusDot, { backgroundColor: meta.color }]} />
        <Text style={[tcs.statusLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>

      <View style={tcs.top}>
        <Text style={tcs.name} numberOfLines={2}>{task.name}</Text>

        <View style={tcs.actions}>
          {/* TAKEOFF — scheduled or delayed */}
          {(s === "scheduled" || s === "delayed") && (
            <TouchableOpacity
              onPress={() => onTakeoff(task.id)}
              style={[tcs.actionBtn, { borderColor: meta.color }]}
            >
              <Text style={[tcs.actionBtnText, { color: meta.color }]}>
                ✈ TAKEOFF
              </Text>
            </TouchableOpacity>
          )}

          {/* LAND — inflight only; triggers celebration modal */}
          {s === "inflight" && (
            <TouchableOpacity
              onPress={() => onLandRequest(task.id, task.name)}
              style={[tcs.actionBtn, { borderColor: COLORS.neonGreen }]}
            >
              <Text style={[tcs.actionBtnText, { color: COLORS.neonGreen }]}>
                ✓ LAND
              </Text>
            </TouchableOpacity>
          )}

          {/* DEL — visible for non-landed tasks always; for landed only when
               endDate is within the current month/year */}
          {showDel && (
            <TouchableOpacity
              onPress={() => onDeleteRequest(task.id, task.name)}
              style={tcs.delBtn}
            >
              <Text style={tcs.delBtnText}>DEL</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {task.desc ? <Text style={tcs.desc}>{task.desc}</Text> : null}

      <View style={tcs.metaRow}>
        {task.recurring ? (
          <>
            <MetaTag icon="🛫" label={timeOfDay(task.startDate)} />
            {task.endDate ? (
              <MetaTag icon="🛬" label={timeOfDay(task.endDate)} />
            ) : null}
            <MetaTag icon="🔁" label="DAILY" />
            <MetaTag icon="📅" label={recurringWindowLabel(task)} />
          </>
        ) : (
          <>
            <MetaTag icon="🛫" label={task.startDate} />
            {task.endDate ? <MetaTag icon="🛬" label={task.endDate} /> : null}
            <MetaTag icon="🎫" label="ONE-TIME" />
          </>
        )}
        <MetaTag icon="🔢" label={`${task.freq}x/day`} />
      </View>

      {task.slots?.length > 0 && (
        <View style={tcs.slotsRow}>
          {task.slots.map((slot, i) => (
            <View
              key={i}
              style={[tcs.slotChip, { borderColor: meta.color + "44" }]}
            >
              <Text style={[tcs.slotText, { color: meta.color }]}>{slot}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function MetaTag({ icon, label }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}
    >
      <Text style={{ fontSize: 10, marginRight: 4 }}>{icon}</Text>
      <Text style={{ color: COLORS.textDim, fontSize: 10, letterSpacing: 1 }}>
        {label}
      </Text>
    </View>
  );
}

const tcs = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    gap: 5,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 2 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    flex: 1,
    marginTop: 2,
  },
  actions: { flexDirection: "row", gap: 6, flexShrink: 0 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    backgroundColor: "#141820",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  delBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.neonRed + "55",
    backgroundColor: "#141820",
    alignItems: "center",
    justifyContent: "center",
  },
  delBtnText: { color: COLORS.neonRed, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  desc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 18,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  slotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  slotChip: {
    backgroundColor: "#141820",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  slotText: { fontSize: 10, fontWeight: "700" },
});

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: SPACING.lg,
    paddingTop: 72,
  },
  screenTag: {
    color: COLORS.neonBlue,
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
  addBtn: {
    backgroundColor: COLORS.neonBlue + "22",
    borderWidth: 1,
    borderColor: COLORS.neonBlue,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: {
    color: COLORS.neonBlue,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  filterScroll: { marginBottom: SPACING.sm },
  filterScrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#1A2035",
  },
  filterText: {
    color: COLORS.textDim,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#05070D",
    fontSize: 9,
    fontWeight: "900",
  },
  empty: { alignItems: "center", marginTop: 80 },
  emptyIcon: { fontSize: 44, marginBottom: 16 },
  emptyText: {
    color: COLORS.textDim,
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: "700",
  },
  emptySub: { color: COLORS.textDim, fontSize: 12, marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.bgElevated,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: "92%",
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: "900",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    color: COLORS.textPrimary,
    padding: 12,
    fontSize: 14,
  },
  freqBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#1A2035",
    marginRight: 8,
  },
  freqBtnActive: {
    borderColor: COLORS.neonBlue,
    backgroundColor: COLORS.neonBlue + "22",
  },
  freqText: { color: COLORS.textDim, fontWeight: "700", fontSize: 14 },
  freqTextActive: { color: COLORS.neonBlue },
  typeRow: { flexDirection: "row", gap: SPACING.sm },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#1A2035",
    alignItems: "center",
    justifyContent: "center",
  },
  typeBtnActive: {
    borderColor: COLORS.neonBlue,
    backgroundColor: COLORS.neonBlue + "22",
  },
  typeText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  typeTextActive: { color: COLORS.neonBlue },
  typeHint: {
    color: COLORS.textDim,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 6,
  },
  sectionBlock: { paddingHorizontal: SPACING.md, marginBottom: 2 },
  modalBtns: { flexDirection: "row", marginTop: SPACING.md, gap: SPACING.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#1A2035",
  },
  cancelText: {
    color: COLORS.textDim,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 2,
  },
  saveBtn: { flex: 2, borderRadius: RADIUS.md, overflow: "hidden" },
  saveBtnGrad: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#0A0C10",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  setArrivalBtn: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    alignItems: "center",
  },
  setArrivalText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },
  clearArrivalBtn: {
    marginTop: 6,
    alignItems: "flex-end",
  },
  clearArrivalText: {
    color: COLORS.neonRed,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },
});
