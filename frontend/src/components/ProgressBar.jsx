import { useEffect, useState } from 'react';

/**
 * Luxury fill bar — grows from the left on mount and eases when `value` changes.
 * `value` is 0–100.
 */
function ProgressBar({
  value = 0,
  className = '',
  trackClassName = 'bg-gold/25',
  fillClassName = 'bg-gold',
  fillStyle,
  size = 'md',
  rounded = 'rounded',
}) {
  const [ready, setReady] = useState(false);
  const pct = Math.min(100, Math.max(0, Number.parseFloat(value) || 0));

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setReady(true);
      return undefined;
    }

    let frameA;
    let frameB;
    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => setReady(true));
    });

    return () => {
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
    };
  }, []);

  const heightClass =
    size === 'sm' ? 'h-1' : size === 'lg' ? 'h-2' : 'h-1.5';

  return (
    <div
      className={`progress-track w-full overflow-hidden ${heightClass} ${rounded} ${trackClassName} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`progress-fill h-full w-full origin-left ${rounded} ${fillClassName}`}
        style={{
          ...fillStyle,
          transform: `scaleX(${ready ? pct / 100 : 0})`,
        }}
      />
    </div>
  );
}

export default ProgressBar;
