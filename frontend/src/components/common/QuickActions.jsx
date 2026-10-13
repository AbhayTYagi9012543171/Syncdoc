import React, { useEffect, useState } from "react";
import { FilePlus2, Keyboard, Maximize2, Minimize2, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QuickActions() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(() => localStorage.getItem("syncdoc_focus") === "1");

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFocus(v => {
          const next = !v;
          localStorage.setItem("syncdoc_focus", next ? "1" : "0");
          document.body.classList.toggle("syncdoc-focus-mode", next);
          return next;
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.toggle("syncdoc-focus-mode", focus);
    return () => document.removeEventListener("keydown", onKey);
  }, [focus]);

  const toggleFocus = () => {
    setFocus(v => {
      const next = !v;
      localStorage.setItem("syncdoc_focus", next ? "1" : "0");
      document.body.classList.toggle("syncdoc-focus-mode", next);
      return next;
    });
  };

  return (
    <div className="quick-actions">
      {open && (
        <div className="quick-actions-menu" role="menu">
          <button onClick={() => navigate("/documents")} role="menuitem">
            <FilePlus2 size={17} /><span>New document</span><kbd>N</kbd>
          </button>
          <button onClick={toggleFocus} role="menuitem">
            {focus ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}
            <span>{focus ? "Exit focus mode" : "Focus mode"}</span><kbd>⌘⇧F</kbd>
          </button>
          <button onClick={() => setOpen(false)} role="menuitem">
            <Keyboard size={17}/><span>Keyboard shortcuts</span><kbd>Esc</kbd>
          </button>
        </div>
      )}
      <button className="quick-actions-trigger" type="button" onClick={() => setOpen(v => !v)} aria-label={open ? "Close quick actions" : "Open quick actions"}>
        {open ? <X size={19}/> : <Plus size={19}/>}
      </button>
    </div>
  );
}
