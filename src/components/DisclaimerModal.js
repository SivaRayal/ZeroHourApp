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
 * Generic themed disclaimer modal.
 *
 * Props:
 *  visible        – boolean
 *  title          – header string
 *  icon           – emoji / short string shown above title
 *  body           – disclaimer text (string)
 *  confirmLabel   – button label (default "UNDERSTOOD")
 *  onConfirm      – called when the user taps the confirm button
 *  accentColors   – [start, end] gradient colours for the button
 *                   (default green→cyan)
 */
export default function DisclaimerModal({
  visible,
  title,
  icon,
  body,
  confirmLabel = "UNDERSTOOD",
  onConfirm,
  accentColors = ["#00FF88", "#00CFFF"],
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Top accent bar */}
          <LinearGradient
            colors={accentColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topBar}
          />

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Body */}
            <Text style={styles.body}>{body}</Text>
          </ScrollView>

          {/* Confirm button */}
          <TouchableOpacity
            style={styles.btnWrap}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={accentColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>{confirmLabel}</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  topBar: {
    height: 3,
    width: "100%",
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  icon: {
    fontSize: 36,
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
  },
  btnWrap: {
    margin: SPACING.lg,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: "hidden",
  },
  btn: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#05070D",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 3,
  },
});
