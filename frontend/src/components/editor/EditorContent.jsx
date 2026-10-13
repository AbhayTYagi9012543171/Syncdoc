
import React, {
  forwardRef,
  useEffect,
  useRef,
} from 'react';

const DEFAULT_CONTENT = `
  <h1>Project Overview</h1>
  <p>
    Start writing your document here. SyncDoc automatically saves your
    work as you edit.
  </p>

  <h2>Objectives</h2>
  <ul>
    <li>Define the project goals</li>
    <li>Align the team</li>
    <li>Track important decisions</li>
  </ul>

  <h2>Notes</h2>
  <p>
    Add your ideas, requirements, and meeting notes here.
  </p>
`;

const EditorContent = forwardRef(function EditorContent(
  {
    initialContent = DEFAULT_CONTENT,
    onInput,
    onFocus,
    onBlur,
    placeholder = 'Start writing...',
    className = '',
    readOnly = false,
    ...props
  },
  forwardedRef
) {
  const internalRef = useRef(null);

  const setEditorRef = (node) => {
    internalRef.current = node;

    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
      return;
    }

    if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  useEffect(() => {
    const editor = internalRef.current;

    if (!editor) {
      return;
    }

    if (
      typeof initialContent === 'string' &&
      editor.innerHTML !== initialContent
    ) {
      editor.innerHTML = initialContent;
    }
  }, [initialContent]);

  const handleInput = (event) => {
    if (typeof onInput === 'function') {
      onInput(event.currentTarget.innerHTML);
    }
  };

  const handleFocus = (event) => {
    if (typeof onFocus === 'function') {
      onFocus(event);
    }
  };

  const handleBlur = (event) => {
    if (typeof onBlur === 'function') {
      onBlur(event);
    }
  };

  const classes = [
    'editor-content',
    readOnly ? 'editor-content-readonly' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setEditorRef}
      className={classes}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Document editor"
      data-placeholder={placeholder}
      onInput={handleInput}
      onFocus={handleFocus}
      onBlur={handleBlur}
      spellCheck="true"
      {...props}
    />
  );
});

EditorContent.displayName = 'EditorContent';

export default EditorContent;
