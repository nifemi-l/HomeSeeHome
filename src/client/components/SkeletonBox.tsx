/* PROLOGUE
File name: SkeletonBox.tsx
Description: Flat, subtle placeholder block with a gentle opacity pulse. Rendered in place
             of a control that hasn't resolved yet, sized to match it exactly so swapping
             the real control in causes no layout shift. Intentionally a solid low-opacity
             fill (no gradient sheen) to read as a quiet placeholder, not a glossy element.
Programmer: Nifemi Lawal
Creation date: 7/5/26
Revision date:
  - 7/5/26: Drop gradient sheen for a flat subtle fill
Preconditions: Given the width/height of the control it stands in for
Postconditions: Renders a softly pulsing block of that size
Errors: None
Side effects: Runs a looping opacity animation while mounted
Invariants: None
Known faults: None
*/

import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleProp, ViewStyle } from "react-native";

interface SkeletonBoxProps {
  width: number;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function SkeletonBox({ width, height, borderRadius = 8, style }: SkeletonBoxProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.75,
          duration: 800,
          // The native driver isn't available on web
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "rgba(255,255,255,0.13)",
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}
