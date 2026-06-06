import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, RADIUS } from "../theme";

/**
 * General-purpose themed confirmation modal.
 *
 * Props
 * ─────
 * visible        – boolean
 * icon           – emoji shown above the title
 * title          – bold header string
 * body           – message body (string, may contain \n)
 * confirmLabel   – primary-action button text        (default "CONFIRM")
 * confirmColors  – [start, end] gradient for confirm (default green→cyan)
 * onConfirm      – called when primary button is tapped
 * cancelLabel    – secondary-action text; omit to hide the cancel button
 * onCancel       – called when cancel button is tapped
 */
export default function ConfirmModal({
  visible,
  icon,
  title,
  body,
  confirmLabel = "CONFIRM",
  confirmColors = ["#00FF88", "#00CFFF"],
  onConfirm,
  cancelLabel,
  onCancel,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Gradient accent bar */}
          <LinearGradient
            colors={confirmColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topBar}
          />

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            <View style={styles.divider} />
            <Text style={styles.body}>{body}</Text>
          </ScrollView>

          {/* Button row */}
          <View style={styles.btnRow}>
            {cancelLabel ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.confirmWrap, !cancelLabel && { flex: 1 }]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={confirmColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0F1218",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "#1A2035",
    overflow: "hidden",
    maxHeight: "80%",
  },
  topBar: { height: 3, width: "100%" },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  icon: {
    fontSize: 38,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: "#1A2035",
    marginBottom: SPACING.md,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  btnRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#1A2035",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: COLORS.textDim,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 2,
  },
  confirmWrap: {
    flex: 2,
    borderRadius: RADIUS.md,
    overflow: "hidden",
  },
  confirmBtn: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#05070D",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 2,
  },
});
