import useMediaQuery from "./useMediaQuery";

/** Respect the user's operating-system motion preference for UI animations. */
export default function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}
