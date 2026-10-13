
import React, { useRef } from 'react';
import './DocumentPremium.css';

export default function DocumentSearch({
  value = '',
  onChange,
  placeholder = 'Search documents...',
  disabled = false,
  loading = false,
  className = '',
  onClear,
}) {
  const inputRef = useRef(null);

  const safeValue =
    typeof value === 'string'
      ? value
      : String(value ?? '');

  const hasValue = safeValue.length > 0;

  const handleChange = event => {
    if (typeof onChange === 'function') {
      onChange(event.target.value);
    }
  };

  const handleClear = () => {
    if (typeof onClear === 'function') {
      onClear();
    } else if (typeof onChange === 'function') {
      onChange('');
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = event => {
    if (
      event.key === 'Escape' &&
      hasValue
    ) {
      event.preventDefault();
      handleClear();
    }
  };

  const classes = [
    'document-search',
    loading ? 'document-search-loading' : '',
    disabled ? 'document-search-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label
      className={classes}
      htmlFor="document-search-input"
    >
      <span
        className="document-search-icon"
        aria-hidden="true"
      >
        ⌕
      </span>

      <span className="sr-only">
        Search documents
      </span>

      <input
        ref={inputRef}
        id="document-search-input"
        type="search"
        value={safeValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck="false"
        aria-label="Search documents"
      />

      {loading && (
        <span
          className="document-search-spinner"
          aria-hidden="true"
        />
      )}

      {!loading && hasValue && !disabled && (
        <button
          type="button"
          className="document-search-clear"
          onClick={handleClear}
          aria-label="Clear document search"
          title="Clear search"
        >
          ×
        </button>
      )}
    </label>
  );
}

