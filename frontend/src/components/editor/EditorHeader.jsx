
import React from 'react';
import './EditorPremium.css';
import { Link } from 'react-router-dom';

import Button from '../common/Button';
import Collaborators from './Collaborators';

const getDocumentTitle = (title) => {
  if (typeof title !== 'string') {
    return 'Untitled document';
  }

  const trimmedTitle = title.trim();

  return trimmedTitle || 'Untitled document';
};

const getSaveState = (saved) => {
  if (saved === true) {
    return {
      label: 'Saved',
      icon: '✓',
      className: 'saved',
    };
  }

  if (saved === false) {
    return {
      label: 'Saving...',
      icon: '↻',
      className: 'saving',
    };
  }

  return {
    label: 'Not saved',
    icon: '•',
    className: 'unsaved',
  };
};

export default function EditorHeader({
  title,
  saved = true,
  collaborators = [],
  onShare,
  onHistory,
  sharing = false,
  historyLoading = false,
  disabled = false,
}) {
  const documentTitle = getDocumentTitle(title);
  const saveState = getSaveState(saved);

  const isShareDisabled =
    disabled ||
    sharing ||
    typeof onShare !== 'function';

  const isHistoryDisabled =
    disabled ||
    historyLoading ||
    typeof onHistory !== 'function';

  return (
    <header
      className="editor-header"
      aria-label="Document editor header"
    >
      <div className="editor-title-group">
        <Link
          to="/documents"
          className="back-link"
          aria-label="Back to documents"
          title="Back to documents"
        >
          <span aria-hidden="true">←</span>
        </Link>

        <div className="editor-document-info">
          <h1
            className="editor-document-title"
            title={documentTitle}
          >
            {documentTitle}
          </h1>

          <div
            className={`save-state ${saveState.className}`}
            role="status"
            aria-live="polite"
          >
            <span
              className="save-state-icon"
              aria-hidden="true"
            >
              {saveState.icon}
            </span>

            <span>{saveState.label}</span>
          </div>
        </div>
      </div>

      <div className="editor-actions">
        {Array.isArray(collaborators) &&
          collaborators.length > 0 && (
            <div
              className="editor-collaborators"
              aria-label={`${collaborators.length} collaborator${
                collaborators.length === 1 ? '' : 's'
              }`}
            >
              <Collaborators
                collaborators={collaborators}
              />
            </div>
          )}

        <Button
          type="button"
          variant="ghost"
          onClick={onHistory}
          loading={historyLoading}
          disabled={isHistoryDisabled}
          aria-label="View document history"
        >
          {historyLoading ? 'Loading...' : 'History'}
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onShare}
          loading={sharing}
          disabled={isShareDisabled}
          aria-label={`Share ${documentTitle}`}
        >
          {sharing ? 'Sharing...' : 'Share'}
        </Button>
      </div>
    </header>
  );
}

