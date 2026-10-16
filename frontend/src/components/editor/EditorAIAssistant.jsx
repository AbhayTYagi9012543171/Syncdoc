import React, { useState } from "react";
import { Check, Clipboard, Sparkles, X } from "lucide-react";
import aiService from "../../services/aiService";
import "./EditorAIAssistant.css";

const ACTIONS = [
  { id: "summarize", label: "Summarize", description: "Get the key points" },
  { id: "proofread", label: "Proofread", description: "Fix grammar and clarity" },
  { id: "rewrite", label: "Rewrite", description: "Improve flow and tone" },
  { id: "action-items", label: "Action items", description: "Extract next steps" },
  { id: "ask", label: "Ask a question", description: "Ask about this document" },
];

export default function EditorAIAssistant({ documentId, content }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("summarize");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const run = async (nextAction = action) => {
    if (nextAction === "ask" && !prompt.trim()) { setError("Write a question first."); return; }
    if (!String(content || "").trim()) { setError("Add document content before using the assistant."); return; }
    setAction(nextAction); setBusy(true); setError(""); setResult(""); setCopied(false);
    try { const response = await aiService.assist(documentId, nextAction, prompt); setResult(response.result); }
    catch (e) { setError(e?.response?.data?.message || e?.message || "AI assistance failed. Please try again."); }
    finally { setBusy(false); }
  };

  const copyResult = async () => {
    try { await navigator.clipboard.writeText(result); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError("Clipboard access is unavailable. Select and copy the result manually."); }
  };

  return (
    <section className="sd-ai" aria-label="AI document assistant">
      <button className="sd-ai-launch" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Sparkles size={16} aria-hidden="true" /> <span>AI assistant</span>
      </button>
      {open && <div className="sd-ai-panel">
        <div className="sd-ai-panel-head"><div><span className="sd-ai-kicker">SYNCDOC INTELLIGENCE</span><h3>Document assistant</h3><p>Use AI to understand and improve this document.</p></div><button className="sd-ai-icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close AI assistant"><X size={18} /></button></div>
        <div className="sd-ai-actions">{ACTIONS.map((item) => <button key={item.id} type="button" className={`sd-ai-action ${action === item.id ? "is-active" : ""}`} onClick={() => { setAction(item.id); if (item.id !== "ask") run(item.id); }} disabled={busy}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>
        {action === "ask" && <form className="sd-ai-question" onSubmit={(event) => { event.preventDefault(); run("ask"); }}><label htmlFor="sd-ai-question">Your question</label><textarea id="sd-ai-question" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={3000} placeholder="What are the main decisions in this document?" rows={3} /><button type="submit" disabled={busy}>{busy ? "Thinking…" : "Ask about document"}</button></form>}
        {busy && <div className="sd-ai-status" role="status"><span className="sd-ai-spinner" /> Working on your document…</div>}
        {error && <div className="sd-ai-error" role="alert">{error}</div>}
        {result && <div className="sd-ai-result"><div className="sd-ai-result-head"><strong>Assistant result</strong><button type="button" onClick={copyResult} className="sd-ai-copy"><Clipboard size={14} /> {copied ? <><Check size={14} /> Copied</> : "Copy"}</button></div><div className="sd-ai-result-body">{result}</div><p className="sd-ai-disclaimer">Review AI-generated content before using it in your document.</p></div>}
        <div className="sd-ai-footnote">Your document is sent to the AI provider configured by your SyncDoc administrator.</div>
      </div>}
    </section>
  );
}
