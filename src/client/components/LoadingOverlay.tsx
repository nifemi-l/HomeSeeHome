/* PROLOGUE
File name: LoadingOverlay.tsx
Description: A full-screen loading overlay shared by screens that load in stages (session
  check, data fetch, renderer prep). It stays mounted as ONE instance across every stage -
  remounting a spinner between stages restarts its animation, which reads as a stutter.
  The parent passes `done` when the content underneath is ready (the overlay fades out for
  a clean reveal) and `text` describing the current stage.
Programmer: Nifemi Lawal
Creation date: 7/5/26
Preconditions: Rendered as the last child of a flex:1 container so it covers the screen.
Postconditions: Covers the screen until `done`, then fades out and unmounts itself.
Errors: None
Side effects: None
Invariants: The stage label must render the `text` prop directly - it must NOT be swapped
  inside an animation-completion callback, because those depend on animation frames that
  get starved while heavy work (e.g. shader compilation, model parsing) occupies the main
  thread, leaving the label stuck on a stale stage.
Known faults: None
*/

import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Platform, Text } from "react-native";

// Styling intentionally matches AuthLoadingScreen (utils/useAuthGuard.tsx) so the session
// check and the stages that follow it look like a single continuous loading screen
export default function LoadingOverlay({ done, text }: { done: boolean; text: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (done) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        // The native driver isn't available on web
        useNativeDriver: Platform.OS !== "web",
      }).start(() => setHidden(true));
    }
  }, [done, opacity]);

  if (hidden) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={done ? "none" : "auto"}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F0F2F5",
        opacity,
        zIndex: 20,
        gap: 14,
        paddingHorizontal: 24,
      }}
    >
      <ActivityIndicator size="large" color="#3B6DB5" />
      <Text style={{ fontSize: 16, color: "#5B6B7F", fontWeight: "600", textAlign: "center" }}>
        {text}
      </Text>
    </Animated.View>
  );
}
