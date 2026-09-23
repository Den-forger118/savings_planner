import { useState } from 'react';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

/**
 * Password input with show/hide toggle.
 * variant: "underline" (auth pages) | "field" (settings / forms)
 */
function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled = false,
  required = false,
  minLength,
  className = '',
  variant = 'underline',
  ...rest
}) {
  const [visible, setVisible] = useState(false);

  const inputClass =
    variant === 'field'
      ? `field pr-11 ${className}`.trim()
      : `auth-field-underline pr-10 ${className}`.trim();

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClass}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        minLength={minLength}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className={`absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-taupe transition-colors hover:text-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 ${
          variant === 'field' ? 'right-1' : 'right-0'
        }`}
      >
        <Icon name={visible ? 'visibility_off' : 'visibility'} className="text-xl" />
      </button>
    </div>
  );
}

export default PasswordInput;
