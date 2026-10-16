import React, { forwardRef, useEffect, useMemo } from "react";
import { EditorContent as TiptapEditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Underline from "@tiptap/extension-underline";
import { Mark, mergeAttributes } from "@tiptap/core";

const LinkMark = Mark.create({
  name: "link",
  inclusive: false,
  addAttributes() { return { href: { default: null } }; },
  parseHTML() { return [{ tag: "a[href]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["a", mergeAttributes(HTMLAttributes, { target: "_blank", rel: "noopener noreferrer" }), 0];
  },
  addCommands() {
    return {
      setLink: (attributes) => ({ commands }) => commands.setMark(this.name, attributes),
      unsetLink: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },
});

const DEFAULT_CONTENT = `
  <h1>Project Overview</h1>
  <p>Start writing your document here. SyncDoc automatically saves your work as you edit.</p>
  <h2>Objectives</h2>
  <ul><li>Define the project goals</li><li>Align the team</li><li>Track important decisions</li></ul>
  <h2>Notes</h2><p>Add your ideas, requirements, and meeting notes here.</p>
`;

const EditorContent = forwardRef(function EditorContent({
  initialContent = DEFAULT_CONTENT,
  onInput,
  onFocus,
  onBlur,
  onEditorReady,
  placeholder = "Start writing...",
  className = "",
  readOnly = false,
  ydoc = null,
  provider = null,
  user = null,
  claimSeed = null,
  ...props
}, forwardedRef) {
  const extensions = useMemo(() => {
    const base = [
      StarterKit.configure({ history: ydoc ? false : undefined }),
      Placeholder.configure({ placeholder }),
      Underline,
      LinkMark,
    ];
    if (ydoc) {
      base.push(Collaboration.configure({ document: ydoc, field: "default" }));
      if (provider) {
        base.push(CollaborationCursor.configure({
          provider,
          user: {
            name: user?.displayName || user?.name || user?.username || user?.email || "SyncDoc user",
            color: user?.color || "#6558d3",
          },
        }));
      }
    }
    return base;
  }, [ydoc, provider, placeholder, user?.displayName, user?.name, user?.username, user?.email, user?.color]);

  const editor = useEditor({
    extensions,
    content: ydoc ? undefined : initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: ["editor-content", readOnly ? "editor-content-readonly" : "", className].filter(Boolean).join(" "),
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Document editor",
        "data-placeholder": placeholder,
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (typeof onInput === "function") onInput(currentEditor.getHTML());
    },
    onFocus: ({ event }) => { if (typeof onFocus === "function") onFocus(event); },
    onBlur: ({ event }) => { if (typeof onBlur === "function") onBlur(event); },
  }, [ydoc, provider]);

  useEffect(() => {
    if (!editor) return undefined;
    if (typeof onEditorReady === "function") onEditorReady(editor);
    const dom = editor.view.dom;
    if (typeof forwardedRef === "function") forwardedRef(dom);
    else if (forwardedRef) forwardedRef.current = dom;
    return () => {
      if (typeof onEditorReady === "function") onEditorReady(null);
      if (typeof forwardedRef === "function") forwardedRef(null);
      else if (forwardedRef) forwardedRef.current = null;
    };
  }, [editor, onEditorReady, forwardedRef]);

  useEffect(() => {
    if (!editor || !ydoc || !provider) return undefined;
    let disposed = false;
    let seeded = false;
    let timer = null;
    let claimInFlight = false;
    const fragment = ydoc.getXmlFragment("default");

    const observeFragment = () => {
      if (fragment.length > 0) {
        seeded = true;
        if (timer) clearTimeout(timer);
        timer = null;
      }
    };

    const scheduleRetry = (delay = 4000) => {
      if (disposed || seeded || timer) return;
      timer = setTimeout(() => {
        timer = null;
        attemptSeed(Boolean(provider.synced));
      }, delay);
    };

    const attemptSeed = async (isSynced) => {
      if (disposed || seeded || !isSynced || editor.isDestroyed || fragment.length > 0 || claimInFlight) return;
      claimInFlight = true;
      try {
        // An API-backed short lease elects one client to initialize an empty
        // room, preventing duplicate initial HTML when several people open it
        // at once. A retry handles a client closing during the lease window.
        const claim = typeof claimSeed === "function"
          ? await claimSeed()
          : { shouldSeed: true };
        if (disposed || editor.isDestroyed) return;
        if (claim?.shouldSeed === true && fragment.length === 0) {
          editor.commands.setContent(initialContent || "<p></p>", false);
          seeded = true;
        } else if (fragment.length === 0) {
          scheduleRetry(16000);
        }
      } catch (seedError) {
        console.warn("SyncDoc: collaboration initialization will retry:", seedError);
        scheduleRetry(5000);
      } finally {
        claimInFlight = false;
      }
    };

    fragment.observe(observeFragment);
    provider.on("sync", attemptSeed);
    if (provider.synced) attemptSeed(true);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      fragment.unobserve(observeFragment);
      provider.off("sync", attemptSeed);
    };
  }, [editor, ydoc, provider, initialContent, claimSeed]);

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || ydoc) return;
    const current = editor.getHTML();
    if (typeof initialContent === "string" && current !== initialContent && !editor.isFocused) {
      editor.commands.setContent(initialContent, false);
    }
  }, [editor, initialContent, ydoc]);

  return <TiptapEditorContent editor={editor} {...props} />;
});

EditorContent.displayName = "EditorContent";
export default EditorContent;
