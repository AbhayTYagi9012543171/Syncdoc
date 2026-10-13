
import React from 'react';

const TOOLBAR_GROUPS = [
  [
    {
      command: 'bold',
      label: 'B',
      title: 'Bold',
      ariaLabel: 'Bold',
      className: 'toolbar-bold',
    },
    {
      command: 'italic',
      label: 'I',
      title: 'Italic',
      ariaLabel: 'Italic',
      className: 'toolbar-italic',
    },
    {
      command: 'underline',
      label: 'U',
      title: 'Underline',
      ariaLabel: 'Underline',
      className: 'toolbar-underline',
    },
  ],
  [
    {
      command: 'formatBlock',
      value: 'h1',
      label: 'H1',
      title: 'Heading 1',
      ariaLabel: 'Heading 1',
    },
    {
      command: 'formatBlock',
      value: 'h2',
      label: 'H2',
      title: 'Heading 2',
      ariaLabel: 'Heading 2',
    },
  ],
  [
    {
      command: 'insertUnorderedList',
      label: '• List',
      title: 'Bulleted list',
      ariaLabel: 'Bulleted list',
    },
    {
      command: 'insertOrderedList',
      label: '1. List',
      title: 'Numbered list',
      ariaLabel: 'Numbered list',
    },
  ],
  [
    {
      command: 'formatBlock',
      value: 'blockquote',
      label: '❝',
      title: 'Blockquote',
      ariaLabel: 'Blockquote',
    },
    {
      command: 'formatBlock',
      value: 'pre',
      label: '</>',
      title: 'Code block',
      ariaLabel: 'Code block',
      className: 'toolbar-code',
    },
    {
      command: 'createLink',
      label: '🔗',
      title: 'Insert link',
      ariaLabel: 'Insert link',
    },
  ],
];

function ToolbarButton({
  command,
  value,
  label,
  title,
  ariaLabel,
  className = '',
  active = false,
  disabled = false,
  onCommand,
}) {
  const classes = [
    'toolbar-button',
    className,
    active ? 'active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleMouseDown = (event) => {
    event.preventDefault();

    if (disabled || typeof onCommand !== 'function') {
      return;
    }

    onCommand(command, value);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();

    if (disabled || typeof onCommand !== 'function') {
      return;
    }

    onCommand(command, value);
  };

  return (
    <button
      type="button"
      className={classes}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      {label}
    </button>
  );
}

export default function EditorToolbar({
  onCommand,
  activeCommands = {},
  disabled = false,
  className = '',
}) {
  const classes = [
    'editor-toolbar',
    disabled ? 'editor-toolbar-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role="toolbar"
      aria-label="Document formatting toolbar"
      aria-disabled={disabled}
    >
      {TOOLBAR_GROUPS.map((group, groupIndex) => (
        <React.Fragment key={`toolbar-group-${groupIndex}`}>
          {groupIndex > 0 && (
            <span
              className="toolbar-separator"
              aria-hidden="true"
            />
          )}

          <div
            className="toolbar-group"
            role="group"
            aria-label={`Formatting group ${groupIndex + 1}`}
          >
            {group.map((item) => {
              const commandKey = item.value
                ? `${item.command}:${item.value}`
                : item.command;

              return (
                <ToolbarButton
                  key={commandKey}
                  {...item}
                  active={Boolean(activeCommands[commandKey])}
                  disabled={disabled}
                  onCommand={onCommand}
                />
              );
            })}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
