import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";

/**
 * Sensible desktop-ish default used when there's no real window to measure yet
 * (Expo Router's static web output server-renders the first paint with no DOM,
 * so react-native-web's Dimensions module has nothing to read).
 */
const SSR_FALLBACK_WIDTH = 1024;

/**
 * Like `useWindowDimensions().width`, but reads the DOM synchronously on the
 * client's very first render instead of waiting for react-native-web's
 * Dimensions module to settle through an effect after hydration. Without this,
 * server-rendered HTML paints with a width-less fallback (forcing the narrow/
 * mobile layout), then visibly pops to the correct layout once the client
 * bundle finishes loading - this collapses that into a single correct paint.
 */
export function useResponsiveWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.clientWidth : SSR_FALLBACK_WIDTH
  );
  const liveWidth = useWindowDimensions().width;

  useEffect(() => {
    if (liveWidth) {
      setWidth(liveWidth);
    }
  }, [liveWidth]);

  return width;
}
