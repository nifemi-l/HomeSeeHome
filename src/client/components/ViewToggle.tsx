/* PROLOGUE
File name: ViewToggle.tsx
Description: Unified household header: navy bar with back, divider, 3D/List pill, spacer,
             avatar and Logout.
Programmer: Nifemi Lawal
Creation date: 2/6/26
Revision date:
  - 2/14/26: Add sensor badges and improve layout
  - 4/12/26: Household header bar rework for small screens
  - 4/13/26: Logout cluster matches home web hover (shared theme tokens)
    ---> Web hover on back button (pill + chevron scale/tint)
  - 7/5/26: Remove sensor badges (no environment sensor); collapse to a single-row layout
    ---> Fixed-size skeleton and native reads real width immediately, so phones no
         longer flash the wide logout placeholder while loading
Preconditions: Must receive the currently active view mode as a prop
Postconditions: Renders the household chrome bar and can navigate between views
Errors: None. Will always render successfully
Side effects: Navigates to a different route when the user switches views or logs out
Invariants: None
Known faults: None
*/

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import SkeletonBox from "./SkeletonBox";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { clearToken, getToken } from "../utils/authStorage";
import {
  brand,
  navy,
  navLogoutHover,
  navLogoutWebShell,
  navLogoutWebShellCompact,
  navLogoutWebShellHover,
} from "../theme/colors";

/** Below this width, use short segment labels and icon-only logout. */
const COMPACT_CHROME_BREAKPOINT = 640;

// useLayoutEffect so the real width lands before first paint; plain useEffect on the
// web SSR pass, where useLayoutEffect warns.
const isWebServer = Platform.OS === "web" && typeof window === "undefined";
const useMountEffect = isWebServer ? useEffect : useLayoutEffect;

type ViewMode = "3d" | "list";

interface ViewToggleProps {
  active: ViewMode;
  onChange: (mode: ViewMode) => void;
  /** Show skeleton placeholders while the session check is in flight. */
  loading?: boolean;
}

function initialFromToken(token: string): string {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return "?";
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4 !== 0) payload += "=";
    const decoded =
      Platform.OS === "web" ? atob(payload) : global.atob?.(payload) ?? atob(payload);
    const parsed = JSON.parse(decoded);
    const u = parsed.username;
    if (typeof u === "string" && u.length > 0) return u.charAt(0).toUpperCase();
    return "?";
  } catch {
    return "?";
  }
}

export default function ViewToggle({ active, onChange, loading }: ViewToggleProps) {
  const { width: windowWidth } = useWindowDimensions();

  // Web static rendering has no window (width 0), so the first web render assumes the wide
  // layout to match the server HTML, then picks up the real width on mount. Native has no
  // server render and uses the real width right away.
  const [hasMounted, setHasMounted] = useState(false);
  useMountEffect(() => {
    setHasMounted(true);
  }, []);
  const effectiveWidth =
    Platform.OS !== "web" || hasMounted ? windowWidth : COMPACT_CHROME_BREAKPOINT + 1;
  const compactChrome = effectiveWidth < COMPACT_CHROME_BREAKPOINT;

  // Crossfade the real controls in when the skeleton phase ends. The real controls are
  // always mounted so they, not the skeleton, set the bar's height.
  const contentOpacity = useRef(new Animated.Value(loading ? 0 : 1)).current;
  const [skeletonHidden, setSkeletonHidden] = useState(!loading);
  useEffect(() => {
    if (!loading) {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 220,
        // The native driver isn't available on web
        useNativeDriver: Platform.OS !== "web",
      }).start();
      // Timer instead of the animation callback, which doesn't fire reliably on web.
      const t = setTimeout(() => setSkeletonHidden(true), 240);
      return () => clearTimeout(t);
    }
    contentOpacity.setValue(0);
    setSkeletonHidden(false);
  }, [loading, contentOpacity]);
  const skeletonOpacity = contentOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const [avatarLetter, setAvatarLetter] = useState("?");

  const [hoverLogout, setHoverLogout] = useState(false);
  const [hoverBack, setHoverBack] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (cancelled || !token) return;
      setAvatarLetter(initialFromToken(token));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navigate = (mode: ViewMode) => {
    if (mode === active) return;
    onChange(mode);
  };

  async function handleLogout() {
    await clearToken();
    router.replace("/login");
  }

  const backButton = (
    <Pressable
      onPress={() => router.replace("/home")}
      style={({ pressed }) => [
        styles.backBtn,
        Platform.OS === "web" && hoverBack && styles.backBtnHover,
        pressed && styles.backBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Back to home"
      hitSlop={8}
      // @ts-ignore web-only pointer hover
      onMouseEnter={() => Platform.OS === "web" && setHoverBack(true)}
      // @ts-ignore web-only pointer hover
      onMouseLeave={() => Platform.OS === "web" && setHoverBack(false)}
    >
      <View
        style={{
          transform: [{ scale: Platform.OS === "web" && hoverBack ? 1.08 : 1 }],
        }}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={22}
          color={Platform.OS === "web" && hoverBack ? navLogoutHover.label : "#FFFFFF"}
        />
      </View>
    </Pressable>
  );

  const divider = <View style={styles.divider} />;

  const segmentPad = compactChrome ? styles.segmentCompact : undefined;

  const pill = (
    <View style={styles.pill}>
      <Pressable
        onPress={() => navigate("3d")}
        style={[styles.segment, segmentPad, active === "3d" && styles.segmentActive]}
      >
        <MaterialCommunityIcons
          name="rotate-3d-variant"
          size={17}
          color={active === "3d" ? "#fff" : "rgba(255,255,255,0.65)"}
        />
        <Text
          style={[styles.segmentText, active === "3d" && styles.segmentTextActive]}
          numberOfLines={1}
        >
          {compactChrome ? "3D" : "3D View"}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => navigate("list")}
        style={[styles.segment, segmentPad, active === "list" && styles.segmentActive]}
      >
        <MaterialCommunityIcons
          name="format-list-bulleted"
          size={17}
          color={active === "list" ? "#fff" : "rgba(255,255,255,0.65)"}
        />
        <Text
          style={[styles.segmentText, active === "list" && styles.segmentTextActive]}
          numberOfLines={1}
        >
          List
        </Text>
      </Pressable>
    </View>
  );

  const userCluster = (
    <Pressable
      onPress={() => setLogoutConfirmOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Log out"
      style={({ pressed }) => [
        styles.userClusterPressable,
        Platform.OS === "web" && navLogoutWebShell,
        Platform.OS === "web" && compactChrome && navLogoutWebShellCompact,
        Platform.OS === "web" && hoverLogout && navLogoutWebShellHover,
        pressed && styles.userClusterPressed,
      ]}
      // @ts-ignore web-only pointer hover
      onMouseEnter={() => Platform.OS === "web" && setHoverLogout(true)}
      // @ts-ignore web-only pointer hover
      onMouseLeave={() => Platform.OS === "web" && setHoverLogout(false)}
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{avatarLetter}</Text>
      </View>
      {compactChrome ? (
        <MaterialCommunityIcons
          name="logout"
          size={20}
          color={Platform.OS === "web" && hoverLogout ? navLogoutHover.label : "#FFFFFF"}
        />
      ) : (
        <Text
          style={[
            styles.logoutText,
            Platform.OS === "web" && hoverLogout && { color: navLogoutHover.label },
          ]}
        >
          Logout
        </Text>
      )}
    </Pressable>
  );

  // Skeleton placeholders. Fixed sizes on purpose - no compactChrome branches. The web build
  // is statically pre-rendered, so the skeleton paints before any JS runs; width-dependent
  // sizes would bake the wide variant into the HTML and phones would flash it until hydration.
  // Sizes are cosmetic anyway since the skeleton is an absolute overlay that adds no layout.
  const skeletonRow = (
    <View style={styles.row}>
      <SkeletonBox width={36} height={36} borderRadius={8} style={{ marginRight: 10 }} />
      {divider}
      <View style={styles.pill}>
        <View style={styles.segment}>
          <SkeletonBox width={44} height={16} borderRadius={5} />
        </View>
        <View style={styles.segment}>
          <SkeletonBox width={40} height={16} borderRadius={5} />
        </View>
      </View>
      <View style={styles.spacer} />
      <View style={styles.userClusterPressable}>
        <View style={styles.avatarCircle}>
          <SkeletonBox width={32} height={32} borderRadius={16} />
        </View>
        <SkeletonBox width={16} height={16} borderRadius={4} />
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {/* Real controls: hidden but mounted during the session check, then faded in. */}
      <Animated.View
        style={{ opacity: contentOpacity }}
        pointerEvents={skeletonHidden ? "auto" : "none"}
      >
        <View style={styles.row}>
          {backButton}
          {divider}
          {pill}
          <View style={styles.spacer} />
          {userCluster}
        </View>
      </Animated.View>

      {/* Skeleton overlay: absolute so it adds no height; fades out as the controls fade in. */}
      {!skeletonHidden && (
        <Animated.View pointerEvents="none" style={[styles.skeletonOverlay, { opacity: skeletonOpacity }]}>
          {skeletonRow}
        </Animated.View>
      )}

      <Modal animationType="fade" transparent visible={logoutConfirmOpen} onRequestClose={() => setLogoutConfirmOpen(false)}>
        <View style={styles.logoutModalBackdrop}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutModalIconRow}>
              <View style={styles.logoutModalIconCircle}>
                <MaterialCommunityIcons name="logout" size={26} color="#D9534F" />
              </View>
            </View>
            <Text style={styles.logoutModalTitle}>Log Out?</Text>
            <Text style={styles.logoutModalSubtitle}>Are you sure you want to log out?</Text>
            <View style={styles.logoutModalActions}>
              <Pressable style={styles.logoutModalCancelButton} onPress={() => setLogoutConfirmOpen(false)}>
                <Text style={styles.logoutModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.logoutModalConfirmButton}
                onPress={() => {
                  setLogoutConfirmOpen(false);
                  void handleLogout();
                }}
              >
                <Text style={styles.logoutModalConfirmText}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches the wrapper's padding so the placeholders sit over the real controls.
  skeletonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  wrapper: {
    backgroundColor: navy,
    paddingVertical: 10,
    paddingHorizontal: 14,
    position: "relative",
    zIndex: 50,
    minHeight: 68,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: `${brand}55`,
    width: "100%",
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
    minWidth: 0,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 10,
  },
  backBtnHover: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.42)",
  },
  backBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginRight: 12,
  },
  pill: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 22,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    flexShrink: 1,
    minWidth: 0,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  segmentCompact: {
    paddingHorizontal: 8,
  },
  segmentActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  segmentText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    flexShrink: 1,
  },
  segmentTextActive: {
    color: "#fff",
  },
  spacer: {
    flex: 1,
    minWidth: 8,
  },
  userClusterPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 8,
    flexShrink: 0,
  },
  userClusterPressed: {
    opacity: 0.92,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5B8AD4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  logoutModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(27, 39, 56, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoutModalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
    alignSelf: "center",
  },
  logoutModalIconRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  logoutModalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a2a3d",
    marginBottom: 8,
    textAlign: "center",
  },
  logoutModalSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5a6d82",
    marginBottom: 18,
    textAlign: "center",
  },
  logoutModalActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
  },
  logoutModalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EEF2F7",
  },
  logoutModalCancelText: {
    color: "#64748B",
    fontWeight: "600",
  },
  logoutModalConfirmButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#D9534F",
  },
  logoutModalConfirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
