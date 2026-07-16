import { useEffect, useMemo, useRef, useState } from 'react';

const digitStrip = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function formatAmount(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number.toFixed(2) : '0.00';
}

function OdometerNumber({ value, prefix = '', className = 'font-money' }) {
  const displayValue = useMemo(() => formatAmount(value), [value]);
  const previousValue = useRef(displayValue);
  const [fromValue, setFromValue] = useState(displayValue);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    let frameId;
    const timeoutId = setTimeout(() => {
      previousValue.current = displayValue;
    }, 680);

    setFromValue(previousValue.current);
    setIsRolling(false);
    frameId = requestAnimationFrame(() => setIsRolling(true));

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
  }, [displayValue]);

  const fromCharacters = fromValue.padStart(displayValue.length, '0').split('');

  return (
    <span className={`odometer-number ${className}`} aria-label={`${prefix}${displayValue}`}>
      {prefix && <span className="odometer-symbol">{prefix}</span>}
      {displayValue.split('').map((character, index) => {
        if (!/\d/.test(character)) {
          return (
            <span className="odometer-static" key={`${character}-${index}`}>
              {character}
            </span>
          );
        }

        const fromDigit = /\d/.test(fromCharacters[index]) ? Number(fromCharacters[index]) : 0;
        const toDigit = Number(character);
        const targetDigit = toDigit < fromDigit ? toDigit + 10 : toDigit;
        const activeDigit = isRolling ? targetDigit : fromDigit;

        return (
          <span className="odometer-digit" key={`digit-${index}`}>
            <span
              className="odometer-digit-strip"
              style={{ transform: `translateY(-${activeDigit}em)` }}
            >
              {digitStrip.map((digit, digitIndex) => (
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
