import React, { useEffect, useMemo, useState } from 'react';

import Button from '../common/Button';
import Modal from '../common/Modal';
import { useWorkspace } from '../../context/WorkspaceContext';

const INITIAL_FORM = {
  title: '',
  description: '',
  workspaceId: '',
};

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;

function getWorkspaceId(workspace) {
  return String(
    workspace?.id ||
    workspace?._id ||
    workspace?.workspaceId ||
    ''
  );
}

export default function CreateDocumentModal({
  open = false,
  onClose,
  onCreate,
  loading: externalLoading = false,
  disabled = false,
  error: externalError = '',
}) {
  const {
    workspaces = [],
    activeWorkspace,
    activeWorkspaceId,
    loading: workspacesLoading,
  } = useWorkspace();

  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loading =
    externalLoading || submitting || disabled;

  const availableWorkspaces = useMemo(
    () =>
      Array.isArray(workspaces)
        ? workspaces.filter((workspace) => getWorkspaceId(workspace))
        : [],
    [workspaces]
  );

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setError('');
      setSubmitting(false);
      return;
    }

    if (!form.workspaceId) {
      const preferred =
        activeWorkspaceId ||
        getWorkspaceId(activeWorkspace) ||
        getWorkspaceId(availableWorkspaces[0]);

      if (preferred) {
        setForm((previous) => ({
          ...previous,
          workspaceId: preferred,
        }));
      }
    }
  }, [
    open,
    activeWorkspace,
    activeWorkspaceId,
    availableWorkspaces,
    form.workspaceId,
  ]);

  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (error) setError('');
  };

  const handleClose = () => {
    if (loading) return;

    setForm(INITIAL_FORM);
    setError('');
    onClose?.();
  };

  const validate = () => {
    const title = form.title.trim();

    if (!title) return 'Please enter a document name.';
    if (title.length < 2) return 'Document name must contain at least 2 characters.';
    if (title.length > MAX_TITLE_LENGTH) {
      return `Document name cannot exceed ${MAX_TITLE_LENGTH} characters.`;
    }

    if (form.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`;
    }

    if (!form.workspaceId) {
      return 'Please select a workspace.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError('');
      setSubmitting(true);

      const result = await onCreate?.({
        title: form.title.trim(),
        description: form.description.trim(),
        workspaceId: form.workspaceId,
      });

      if (result) {
        setForm(INITIAL_FORM);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to create the document. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create a new document"
    >
      <form
        className="form-stack create-document-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="form-field">
          <label htmlFor="document-workspace">
            Workspace
          </label>

          <select
            id="document-workspace"
            value={form.workspaceId}
            onChange={(event) =>
              updateField('workspaceId', event.target.value)
            }
            disabled={loading || workspacesLoading}
          >
            <option value="">
              {workspacesLoading
                ? 'Loading workspaces...'
                : 'Select a workspace'}
            </option>

            {availableWorkspaces.map((workspace) => (
              <option
                key={getWorkspaceId(workspace)}
                value={getWorkspaceId(workspace)}
              >
                {workspace.name || 'Unnamed workspace'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="document-title">
            Document name
          </label>

          <input
            id="document-title"
            name="title"
            type="text"
            value={form.title}
            onChange={(event) =>
              updateField('title', event.target.value)
            }
            placeholder="e.g. Product Roadmap"
            maxLength={MAX_TITLE_LENGTH}
            disabled={loading}
            autoComplete="off"
          />

          <div className="field-meta">
            <span>Give your document a clear name.</span>
            <span>
              {form.title.length}/{MAX_TITLE_LENGTH}
            </span>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="document-description">
            Description
            <span className="optional-label">Optional</span>
          </label>

          <textarea
            id="document-description"
            name="description"
            value={form.description}
            onChange={(event) =>
              updateField('description', event.target.value)
            }
            placeholder="What is this document about?"
            rows={5}
            maxLength={MAX_DESCRIPTION_LENGTH}
            disabled={loading}
          />

          <div className="field-meta">
            <span>Add context for collaborators.</span>
            <span>
              {form.description.length}/{MAX_DESCRIPTION_LENGTH}
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading || !form.title.trim() || !form.workspaceId}
          >
            {loading ? 'Creating...' : 'Create document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
