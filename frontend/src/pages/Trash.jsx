import React, { useCallback, useEffect, useState } from "react";
import { ArchiveRestore, FileText, RefreshCw, Trash2 } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import documentService from "../services/documentService";
import { formatRelativeDate } from "../utils/formatDate";

export default function Trash() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await documentService.trash()); }
    catch (e) { setError(e?.documentMessage || e?.message || "Unable to load trash."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const restore = async id => {
    setBusy(id); setError("");
    try { await documentService.restoreFromTrash(id); setItems(v => v.filter(x => (x._id || x.id) !== id)); }
    catch (e) { setError(e?.documentMessage || e?.message || "Unable to restore document."); }
    finally { setBusy(""); }
  };

  return <main className="page trash-page">
    <header className="page-heading"><div><span className="eyebrow">RECOVERY</span><h1>Trash</h1><p>Recover documents that were recently removed from your workspace.</p></div><Button type="button" variant="secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</Button></header>
    {error && <div className="page-alert" role="alert"><strong>Trash unavailable</strong><span>{error}</span></div>}
    <Card title={`${items.length} deleted document${items.length === 1 ? "" : "s"}`} className="trash-card">
      {loading ? <div className="trash-state"><span className="spinner"/><span>Loading recovery items…</span></div> : !items.length ? <div className="trash-state"><ArchiveRestore size={30}/><strong>Trash is empty</strong><span>Deleted documents will appear here for recovery.</span></div> : <div className="trash-list">{items.map(item => { const id = String(item._id || item.id); return <div className="trash-row" key={id}><span className="trash-doc-icon"><FileText size={18}/></span><div className="trash-doc-info"><strong>{item.title || "Untitled document"}</strong><small>Deleted {item.deletedAt ? formatRelativeDate(item.deletedAt) : "recently"}</small></div><Button type="button" variant="secondary" onClick={() => restore(id)} disabled={busy === id}>{busy === id ? "Restoring…" : <><ArchiveRestore size={15}/> Restore</>}</Button></div>; })}</div>}
    </Card>
    <div className="trash-footer"><Trash2 size={15}/> Recovery actions are permission-controlled and permanently deleted content cannot be restored.</div>
  </main>;
}
