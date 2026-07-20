import { useEffect, useMemo, useRef, useState } from 'react';

const DIGIT_STRIP = Array.from({ length: 20 }, (_, i) => String(i % 10));

function formatAmount(value, decimals = 2) {
  const number = Number.parseFloat(value);
  const safe = Number.isFinite(number) ? Math.max(0, number) : 0;
  return safe.toFixed(decimals);
}

/**
 * Rolling money readout. Animates whenever `value` changes (e.g. after a deposit).
 */
function OdometerNumber({
  value,
  prefix = '',
  className = '',
  decimals = 2,
  durationMs = 1100,
}) {
  const displayValue = useMemo(
    () => formatAmount(value, decimals),
    [value, decimals]
  );

  const previousRef = useRef(displayValue);
  const [fromValue, setFromValue] = useState(displayValue);
  const [toValue, setToValue] = useState(displayValue);
  const [isRolling, setIsRolling] = useState(false);
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (displayValue === previousRef.current) {
      return undefined;
    }

    if (reduceMotion) {
      previousRef.current = displayValue;
      setFromValue(displayValue);
      setToValue(displayValue);
      setIsRolling(false);
      return undefined;
    }

    const from = previousRef.current;
    setFromValue(from);
    setToValue(displayValue);
    setIsRolling(false);

    let frameA;
    let frameB;
    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => setIsRolling(true));
    });

    const settleId = window.setTimeout(() => {
      previousRef.current = displayValue;
      setFromValue(displayValue);
      setIsRolling(false);
    }, durationMs + 120);

    return () => {
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
      window.clearTimeout(settleId);
    };
  }, [displayValue, durationMs, reduceMotion]);

  const width = Math.max(fromValue.length, toValue.length);
  const fromPadded = fromValue.padStart(width, '0');
  const toPadded = toValue.padStart(width, '0');
  const chars = toPadded.split('');

  return (
    <span
      className={`odometer-number ${isRolling ? 'is-rolling' : ''} ${className}`.trim()}
      aria-label={`${prefix}${displayValue}`}
    >
      {prefix ? <span className="odometer-symbol">{prefix}</span> : null}
      {chars.map((character, index) => {
        if (!/\d/.test(character)) {
          return (
            <span className="odometer-static" key={`s-${index}-${character}`}>
              {character}
            </span>
          );
        }

        const fromDigit = /\d/.test(fromPadded[index])
          ? Number(fromPadded[index])
          : 0;
        const toDigit = Number(character);
        const targetDigit = toDigit < fromDigit ? toDigit + 10 : toDigit;
        const activeDigit = isRolling ? targetDigit : fromDigit;
        const delayMs = Math.max(0, (width - 1 - index) * 36);

        return (
          <span className="odometer-digit" key={`d-${index}`}>
            <span
              className="odometer-digit-strip"
              style={{
                transform: `translate3d(0, -${activeDigit}em, 0)`,
                transitionDuration: `${durationMs}ms`,
                transitionDelay: isRolling ? `${delayMs}ms` : '0ms',
              }}
            >
              {DIGIT_STRIP.map((digit, digitIndex) => (
                <span key={`${digit}-${digitIndex}`}>{digit}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export default OdometerNumber;
