import React, { useEffect, useId, useRef } from 'react';

const ALLOWED_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', 'full'];

const getSafeTitle = title => {
  if (title === null || title === undefined) {
    return 'Dialog';
  }

  if (typeof title === 'string' || typeof title === 'number') {
    return String(title);
  }

  if (typeof title === 'object') {
    return title.title || title.name || title.label || 'Dialog';
  }

  return 'Dialog';
};

export default function Modal({
  open = false,
  onClose,
  title = 'Dialog',
  children,
  size = 'md',
  footer = null,

  closeOnEscape = true,
  closeOnBackdrop = true,
  preventClose = false,
  lockScroll = true,
  returnFocus = true,

  initialFocusRef,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,

  className = '',
  contentClassName = '',
  showCloseButton = true,

  ...rest
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const generatedId = useId();

  const titleId = `modal-title-${generatedId.replace(/:/g, '')}`;
  const descriptionId = `modal-description-${generatedId.replace(/:/g, '')}`;

  const normalizedSize = ALLOWED_SIZES.includes(size) ? size : 'md';
  const safeTitle = getSafeTitle(title);

  const labelledBy = ariaLabel ? undefined : ariaLabelledBy || titleId;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousActiveElement.current = document.activeElement;

    const handleKeyDown = event => {
      if (event.key === 'Escape' && closeOnEscape && !preventClose) {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    if (lockScroll) {
      document.body.classList.add('modal-open');
    }

    const focusTimer = window.setTimeout(() => {
      if (initialFocusRef?.current && typeof initialFocusRef.current.focus === 'function') {
        initialFocusRef.current.focus();
        return;
      }

      if (modalRef.current && typeof modalRef.current.focus === 'function') {
        modalRef.current.focus();
      }
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);

      if (lockScroll) {
        document.body.classList.remove('modal-open');
      }

      if (
        returnFocus &&
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [open, closeOnEscape, lockScroll, returnFocus, preventClose, onClose, initialFocusRef]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleTab = event => {
      if (event.key !== 'Tab' || !modalRef.current) {
        return;
      }

      const focusable = Array.from(
        modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleTab);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleBackdropMouseDown = event => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (closeOnBackdrop && !preventClose) {
      onClose?.();
    }
  };

  const modalClasses = ['modal', `modal-${normalizedSize}`, className].filter(Boolean).join(' ');

  return (
    <div className="modal-backdrop" onMouseDown={handleBackdropMouseDown} role="presentation">
      <div
        ref={modalRef}
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || undefined}
        aria-labelledby={ariaLabel ? undefined : labelledBy}
        aria-describedby={
          ariaDescribedBy || (descriptionId && children ? descriptionId : undefined)
        }
        tabIndex={-1}
        {...rest}
      >
        <header className="modal-header">
          <h2 id={titleId}>{safeTitle}</h2>

          {showCloseButton && (
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              disabled={preventClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          )}
        </header>

        <div className={`modal-body ${contentClassName}`.trim()} id={descriptionId}>
          {children}
        </div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
