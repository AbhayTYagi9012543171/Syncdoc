import './CommonPremium.css';
import React, { useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,

  title = "Are you sure?",

  message = "This action cannot be undone.",

  confirmLabel = "Confirm",
  cancelLabel = "Cancel",

  loading = false,

  danger = true,
}) {
  /*
   * Prevent closing the dialog while
   * an asynchronous confirmation is running.
   */
  const handleClose = () => {
    if (loading) {
      return;
    }

    if (typeof onClose === "function") {
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (loading) {
      return;
    }

    if (typeof onConfirm === "function") {
      await onConfirm();
    }
  };

  /*
   * Escape key support.
   *
   * Modal normally handles this itself, but
   * this makes ConfirmDialog safe even if the
   * underlying Modal implementation does not.
   */
  useEffect(() => {
    if (!open || loading) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  });

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
    >
      <div className="confirm-dialog">
        <p className="modal-message">
          {typeof message === "object"
            ? message?.message ||
              message?.text ||
              "This action cannot be undone."
            : message}
        </p>

        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={loading}
            loadingText="Working..."
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}