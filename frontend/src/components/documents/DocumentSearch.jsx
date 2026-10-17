
import React, { useId, useRef, useState } from "react";
import {
  Search,
  X,
  LoaderCircle,
  ArrowRight,
} from "lucide-react";

import "./DocumentPremium.css";

export default function DocumentSearch({
  value = "",
  onChange,
  placeholder = "Search documents, content, or keywords...",
  disabled = false,
  loading = false,
  className = "",
  onClear,
}) {
  const inputRef = useRef(null);
  const generatedId = useId();
  const inputId = `syncdoc-search-${generatedId.replace(/:/g, "")}`;

  const [focused, setFocused] = useState(false);

  const safeValue =
    typeof value === "string"
      ? value
      : String(value ?? "");

  const hasValue = safeValue.length > 0;
  const canInteract = !disabled;

  const handleChange = (event) => {
    onChange?.(event.target.value);
  };

  const handleClear = () => {
    if (!canInteract) return;

    if (typeof onClear === "function") {
      onClear();
    } else {
      onChange?.("");
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && hasValue) {
      event.preventDefault();
      handleClear();
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      inputRef.current?.focus();
    }
  };

  const classes = [
    "document-search",
    focused ? "document-search-focused" : "",
    loading ? "document-search-loading" : "",
    disabled ? "document-search-disabled" : "",
    hasValue ? "document-search-has-value" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <label
        className="document-search-sr-only"
        htmlFor={inputId}
      >
        Search documents
      </label>

      <div className="document-search-leading">
        {loading ? (
          <LoaderCircle
            className="document-search-spinner"
            size={20}
            aria-hidden="true"
          />
        ) : (
          <Search
            className="document-search-icon"
            size={20}
            strokeWidth={1.9}
            aria-hidden="true"
          />
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className="document-search-input"
        type="search"
        value={safeValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        aria-label="Search documents"
        aria-busy={loading}
      />

      {hasValue && !disabled && (
        <button
          type="button"
          className="document-search-clear"
          onClick={handleClear}
          aria-label="Clear search"
          title="Clear search"
        >
          <X size={16} />
        </button>
      )}

      {!hasValue && !focused && !loading && !disabled && (
        <span
          className="document-search-shortcut"
          aria-hidden="true"
        >
          <kbd>Ctrl</kbd>
          <span className="document-search-shortcut-plus">+</span>
          <kbd>K</kbd>
        </span>
      )}

      {hasValue && !loading && (
        <span
          className="document-search-enter-icon"
          aria-hidden="true"
        >
          <ArrowRight size={15} />
        </span>
      )}

      {loading && (
        <span
          className="document-search-status"
          role="status"
          aria-live="polite"
        >
          Searching
        </span>
      )}
    </div>
  );
}
