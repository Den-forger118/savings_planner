import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMoney, getCurrencyByCode } from '../utils/currency';
import {
  CONVERTER_CURRENCIES,
  convertCurrency,
  resolveDefaultFrom,
  resolveDefaultTo,
} from '../utils/frankfurter';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const formatOption = (item) => `${item.symbol} — ${item.code} — ${item.name}`;

function CurrencySelect({ id, label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = useMemo(
    () => options.find((item) => item.code === value) || options[0],
    [options, value]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-20">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="field flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="min-w-0 truncate">{formatOption(selected)}</span>
        <Icon
          name={open ? 'expand_less' : 'expand_more'}
          className="shrink-0 text-xl text-taupe"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-primary-dark/12 bg-white py-1 shadow-lift"
        >
          {options.map((item) => {
            const active = item.code === value;
            return (
              <li key={item.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                  className={`flex w-full px-3.5 py-2.5 text-left font-sans text-sm transition-colors ${
                    active
                      ? 'bg-primary-dark text-cream'
                      : 'text-primary-dark hover:bg-cream/70'
                  }`}
                >
                  {formatOption(item)}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CurrencyConverter({ currencyCode = 'USD' }) {
  const defaultFrom = resolveDefaultFrom(currencyCode);
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(resolveDefaultTo(defaultFrom));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const nextFrom = resolveDefaultFrom(currencyCode);
    setFrom(nextFrom);
    setTo((prev) => (prev === nextFrom ? resolveDefaultTo(nextFrom) : prev));
  }, [currencyCode]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const parsed = Number.parseFloat(amount);
      if (!Number.isFinite(parsed) || parsed < 0 || !amount.trim()) {
        setResult(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const conversion = await convertCurrency(parsed, from, to);
        if (!cancelled) setResult(conversion);
      } catch (err) {
        if (!cancelled) {
          setResult(null);
          setError(err.message || 'We couldn’t convert that amount.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = window.setTimeout(run, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [amount, from, to]);

  const fromMeta = useMemo(() => getCurrencyByCode(from), [from]);
  const toMeta = useMemo(() => getCurrencyByCode(to), [to]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <section className="surface overflow-visible">
      <div className="border-b border-primary-dark/[0.06] px-5 py-4">
        <p className="eyebrow">Ledger tools</p>
        <h3 className="mt-1 card-title">Currency check</h3>
        <p className="mt-1.5 max-w-xl font-sans text-sm font-light text-taupe">
          See how an amount translates between currencies — for planning, not bank settlement.
        </p>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div>
          <label className="field-label" htmlFor="fx-amount">
            Amount
          </label>
          <input
            id="fx-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field font-money"
            placeholder="100.00"
          />
        </div>

        <div className="relative z-30 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <CurrencySelect
            id="fx-from"
            label="From"
            value={from}
            options={CONVERTER_CURRENCIES}
            onChange={(next) => {
              setFrom(next);
              if (next === to) setTo(resolveDefaultTo(next));
            }}
          />

          <button
            type="button"
            onClick={swap}
            aria-label="Swap currencies"
            className="mb-0.5 flex h-11 w-11 items-center justify-center self-end rounded-lg border border-primary-dark/12 text-taupe transition-colors hover:border-gold/50 hover:text-primary-dark"
          >
            <Icon name="swap_horiz" className="text-xl" />
          </button>

          <CurrencySelect
            id="fx-to"
            label="To"
            value={to}
            options={CONVERTER_CURRENCIES}
            onChange={(next) => {
              setTo(next);
              if (next === from) setFrom(resolveDefaultTo(next));
            }}
          />
        </div>

        <div className="rounded-lg border border-primary-dark/[0.08] bg-cream/40 px-4 py-4">
          {loading ? (
            <p className="font-sans text-sm text-taupe">Fetching rate…</p>
          ) : error ? (
            <p className="font-sans text-sm text-red-800/80" role="alert">{error}</p>
          ) : result ? (
            <>
              <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
                Converted
              </p>
              <p className="mt-2 font-money text-2xl font-light tracking-[0.02em] text-primary-dark">
                {formatMoney(result.result, toMeta.code, toMeta.symbol)}
              </p>
              <p className="mt-2 font-sans text-xs font-light text-taupe">
                1 {fromMeta.code} ={' '}
                <span className="font-money">
                  {formatMoney(result.rate, toMeta.code, toMeta.symbol)}
                </span>
                {result.date ? ` · ECB ${result.date}` : ''}
              </p>
            </>
          ) : (
            <p className="font-sans text-sm text-taupe">Enter an amount to convert.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default CurrencyConverter;
