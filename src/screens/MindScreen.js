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
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import { COLORS, SPACING, FONTS, RADIUS } from "../theme";
import { Storage } from "../store/storage";
import { scheduleReminder, cancelNotification } from "../utils/notifications";
import SectionHeader from "../components/SectionHeader";

const FREQ_OPTIONS = [1, 2, 3, 4, 5, 6];

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
export default function MindScreen() {
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
  });
  const [filter, setFilter] = useState("active");

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, []),
  );

  const loadTasks = async () => {
    const t = await Storage.getTasks();
    setTasks(t);
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
    const task = {
      id: genId(),
      name: form.name.trim(),
      desc: form.desc.trim(),
      startDate: form.startDate,
      endDate: form.hasEndDate ? form.endDate : "",
      freq: form.freq,
      slots: form.slots.filter(Boolean),
      active: true,
      createdAt: Date.now(),
      type: "task",
    };
    const updated = [task, ...tasks];
    await Storage.saveTasks(updated);
    await scheduleReminder(task);
    setTasks(updated);
    setShowForm(false);
  };

  const toggleTask = async (id) => {
    const task = tasks.find((t) => t.id === id);
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, active: !t.active } : t,
    );
    await Storage.saveTasks(updated);
    if (task?.active) {
      await Storage.markDayComplete(format(new Date(), "yyyy-MM-dd"));
    }
    setTasks(updated);
  };

  const deleteTask = async (id) => {
    Alert.alert("CANCEL FLIGHT?", "Remove this task?", [
      { text: "KEEP", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          const updated = tasks.filter((t) => t.id !== id);
          await Storage.saveTasks(updated);
          await cancelNotification(`reminder_pre_${id}`);
          await cancelNotification(`reminder_start_${id}`);
          await cancelNotification(`reminder_missed_${id}`);
          setTasks(updated);
        },
      },
    ]);
  };

  const filtered = tasks.filter((t) =>
    filter === "active" ? t.active : !t.active,
  );

  return (
    <LinearGradient
      colors={["#05070D", "#0A0C10", "#050A14"]}
      style={styles.bg}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTag}>TERMINAL M · MIND</Text>
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
          title="MANAGE YOUR ACTIVE & COMPLETED TASKS"
          sub="SCHEDULED FLIGHTS"
          color={COLORS.neonBlue}
        />
        <View style={styles.filterRow}>
          {["active", "completed"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f === "active" ? "IN FLIGHT" : "LANDED"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
      >
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>NO SCHEDULED FLIGHTS</Text>
            <Text style={styles.emptySub}>Tap + SCHEDULE to create a task</Text>
          </View>
        )}
        {filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onDelete={deleteTask}
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

              {/* DEPARTURE TIME — drum picker */}
              <Field label="DEPARTURE TIME" required>
                <InlineDateTimePicker
                  key={`dep-${formKey}`}
                  value={form.startDate}
                  onChange={(v) => setForm({ ...form, startDate: v })}
                />
              </Field>

              {/* ARRIVAL TIME — optional */}
              <Field label="ARRIVAL TIME">
                {form.hasEndDate ? (
                  <View>
                    <InlineDateTimePicker
                      key={`arr-${formKey}`}
                      value={form.endDate || form.startDate}
                      onChange={(v) => setForm({ ...form, endDate: v })}
                    />
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

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle, onDelete }) {
  const statusColor = task.active ? COLORS.neonBlue : COLORS.textDim;
  return (
    <View
      style={[
        tcs.card,
        { borderColor: task.active ? COLORS.neonBlue + "44" : "#1A2035" },
      ]}
    >
      <View style={tcs.top}>
        <View style={tcs.nameRow}>
          <View style={[tcs.dot, { backgroundColor: statusColor }]} />
          <Text style={tcs.name}>{task.name}</Text>
        </View>
        <View style={tcs.actions}>
          <TouchableOpacity
            onPress={() => onToggle(task.id)}
            style={tcs.actionBtn}
          >
            <Text
              style={{
                color: task.active ? COLORS.neonAmber : COLORS.neonGreen,
                fontSize: 10,
                letterSpacing: 1,
              }}
            >
              {task.active ? "LAND" : "RESUME"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(task.id)}
            style={tcs.actionBtn}
          >
            <Text
              style={{ color: COLORS.neonRed, fontSize: 10, letterSpacing: 1 }}
            >
              DEL
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {task.desc ? <Text style={tcs.desc}>{task.desc}</Text> : null}
      <View style={tcs.metaRow}>
        <MetaTag icon="🛫" label={task.startDate} />
        {task.endDate ? <MetaTag icon="🛬" label={task.endDate} /> : null}
        <MetaTag icon="🔁" label={`${task.freq}x/day`} />
      </View>
      {task.slots?.length > 0 && (
        <View style={tcs.slotsRow}>
          {task.slots.map((s, i) => (
            <View key={i} style={tcs.slotChip}>
              <Text style={tcs.slotText}>{s}</Text>
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
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  nameRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  name: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    flex: 1,
  },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: "#141820",
    alignItems: "center",
    justifyContent: "center",
  },
  desc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 18,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  slotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  slotChip: {
    backgroundColor: COLORS.neonBlue + "22",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.neonBlue + "44",
  },
  slotText: { color: COLORS.neonBlue, fontSize: 10, fontWeight: "700" },
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
  filterRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#1A2035",
    alignItems: "center",
  },
  filterTabActive: {
    borderColor: COLORS.neonBlue,
    backgroundColor: COLORS.neonBlue + "18",
  },
  filterText: {
    color: COLORS.textDim,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "700",
  },
  filterTextActive: { color: COLORS.neonBlue },
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
