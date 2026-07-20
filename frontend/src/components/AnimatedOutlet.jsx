import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const EASE_LUXURY = [0.22, 1, 0.36, 1];

/**
 * Soft crossfade + rise for routed page content.
 * Keeps the app shell (sidebar / bottom nav) still.
 */
function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return outlet;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname + location.search}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.38, ease: EASE_LUXURY }}
        className="w-full min-w-0"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Full-screen auth / onboarding fade (same language, slightly slower).
 */
export function ScreenTransition({ children, screenKey }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return children;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screenKey}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.42, ease: EASE_LUXURY }}
        className="min-h-screen w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default AnimatedOutlet;
