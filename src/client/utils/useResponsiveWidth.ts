import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";

const SSR_FALLBACK_WIDTH = 1024;

// Returns a width that is safe for hydration: the first render always matches
// the SSR fallback so React doesn't see a tree mismatch, then an effect swaps
// in the real client width once hydration is complete.
export function useResponsiveWidth(): number {
  const [width, setWidth] = useState(SSR_FALLBACK_WIDTH);
  const liveWidth = useWindowDimensions().width;

  useEffect(() => {
    setWidth(
      liveWidth || (typeof document !== "undefined" ? document.documentElement.clientWidth : SSR_FALLBACK_WIDTH)
    );
  }, [liveWidth]);

  return width;
}
