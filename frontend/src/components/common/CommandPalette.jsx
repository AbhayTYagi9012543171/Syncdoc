import React, { useEffect, useRef, useState } from 'react';
import { FileText, Search, Users, Briefcase, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import searchService from '../../services/searchService';

export default function CommandPalette({ open, onClose, initialQuery = "" }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ documents: [], workspaces: [], people: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) { setQuery(initialQuery || ""); setTimeout(() => inputRef.current?.focus(), 0); } else setQuery(''); }, [open, initialQuery]);
  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults({ documents: [], workspaces: [], people: [] }); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try { const data = await searchService.global(query); if (!cancelled) setResults(data); }
      catch { if (!cancelled) setResults({ documents: [], workspaces: [], people: [] }); }
      finally { if (!cancelled) setLoading(false); }
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const go = path => { onClose(); navigate(path); };
  return <div className="command-palette-backdrop" onMouseDown={onClose}>
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="Global search" onMouseDown={e => e.stopPropagation()}>
      <div className="command-palette-search"><Search size={20}/><input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search documents, workspaces and people..." /><kbd>ESC</kbd><button onClick={onClose} aria-label="Close search"><X size={18}/></button></div>
      <div className="command-palette-body">
        {loading && <div className="command-palette-state">Searching SyncDoc…</div>}
        {!loading && query.length < 2 && <div className="command-palette-state"><Search size={28}/><strong>Search your workspace</strong><span>Find documents, workspaces and collaborators instantly.</span></div>}
        {!loading && query.length >= 2 && !results.documents.length && !results.workspaces.length && !results.people.length && <div className="command-palette-state"><strong>No results found</strong><span>Try another keyword.</span></div>}
        {!!results.documents.length && <ResultGroup title="Documents" icon={FileText}>{results.documents.map(d=><button className="command-result" key={d._id} onClick={()=>go(`/documents/${d._id}`)}><FileText size={17}/><span><strong>{d.title}</strong><small>{d.status || 'Document'}</small></span><ArrowRight size={15}/></button>)}</ResultGroup>}
        {!!results.workspaces.length && <ResultGroup title="Workspaces" icon={Briefcase}>{results.workspaces.map(w=><button className="command-result" key={w._id} onClick={()=>go(`/workspace?workspace=${w._id}`)}><Briefcase size={17}/><span><strong>{w.name}</strong><small>Workspace</small></span><ArrowRight size={15}/></button>)}</ResultGroup>}
        {!!results.people.length && <ResultGroup title="People" icon={Users}>{results.people.map(p=><div className="command-result" key={p._id}><Users size={17}/><span><strong>{p.displayName || p.username}</strong><small>{p.username || p.email || 'Collaborator'}</small></span></div>)}</ResultGroup>}
      </div>
      <div className="command-palette-footer" aria-hidden="true">
        <span><kbd>↵</kbd> Open</span>
        <span><kbd>ESC</kbd> Close</span>
        <span className="command-palette-shortcut">⌘/Ctrl + K <small>Search anywhere</small></span>
      </div>
    </section>
  </div>;
}
function ResultGroup({ title, children }) { return <div className="command-result-group"><div className="command-group-title">{title}</div>{children}</div>; }
