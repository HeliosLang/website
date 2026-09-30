import type {CompilationContext} from './compilation';
import React, {useEffect, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import ApiKeyBox from './ApiKeyBox';
import styles from './projects.module.css';

type Project = {id: string; name: string; created_at: number; revoked: number};
type Evaluation = {compilation?: CompilationContext; phase: string; scriptHash: string; arguments: string[]; result: {error?: string}; sourceMap?: {sourceNames?: string[]}; companion?: {sourceMap?: {sourceNames?: string[]}}};
type Capture = {captureId: string; evaluations: Evaluation[]; sources?: Record<string,string>; error?: string | {message?: string}};
type Entry = {captureId: string; createdAt: number; payload?: Capture; error?: string};
function captureError(capture: Capture) {return typeof capture.error === 'string' ? capture.error : capture.error?.message;}
function validatorName(capture: Capture, evaluation: Evaluation) {
  if (evaluation.compilation) return evaluation.compilation.validator.name;
  const names = new Set([...(evaluation.sourceMap?.sourceNames ?? []), ...(evaluation.companion?.sourceMap?.sourceNames ?? [])]);
  const validators = new Set<string>();
  for (const name of names) {
    const source = capture.sources?.[name];
    const match = source?.match(/^\s*(?:spending|minting|staking|mixed|certifying|rewarding)\s+([A-Za-z_][\w]*)\b/);
    if (match) validators.add(match[1]);
  }
  return validators.size === 1 ? [...validators][0] : 'Unknown validator';
}
function Timestamp({value}: {value: number}) {
  const date = new Date(value * 1000);
  return <time dateTime={date.toISOString()}>{date.toLocaleString()}</time>;
}
function Argument({value, index}: {value: string; index: number}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  return <div className={styles.argument}>
    <code>{value.length > 24 ? `${value.slice(0,12)}…${value.slice(-8)}` : value}</code>
    <button type="button" className={styles.copyButton} title={copied ? 'Copied' : 'Copy CBOR'} aria-label={`Copy argument ${index + 1} CBOR`} onClick={async () => {
      setError('');
      try {await navigator.clipboard.writeText(value); setCopied(true);} catch {setError('Copy failed. Select the full CBOR below.');}
    }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {copied ? <path d="m5 12 4 4L19 6"/> : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>}
    </svg><span className="sr-only" role="status">{copied ? 'Copied' : ''}</span></button>
    {error && <><span role="alert">{error}</span><textarea readOnly aria-label={`Argument ${index + 1} full CBOR`} value={value}/></>}
  </div>;
}
export default function ProjectCaptures({project, endpoint, onRevoke}: {project: Project; endpoint: string; onRevoke: () => Promise<void>}) {
  const [apiKey, setApiKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState(false);
  const controller = useRef<AbortController | null>(null);
  async function load(before?: string) {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError('');
    async function get(path: string) {
      const response = await fetch(`${endpoint}/v1/keys/${project.id}/captures${path}`, {credentials:'include', signal:abort.signal});
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session expired. Return to Console and reconnect your wallet.' : data.error ?? `HTTP ${response.status}`);
      return data;
    }
    try {
      const page = await get(before ? `?before=${encodeURIComponent(before)}` : '');
      const loaded: Entry[] = [];
      // Read one payload at a time; capture payloads can be up to 10 MiB.
      for (const entry of page.captures as Entry[]) {
        try { loaded.push({...entry, payload: await get(`/${entry.captureId}`)}); }
        catch (e) { if (abort.signal.aborted) return; loaded.push({...entry, error:e instanceof Error ? e.message : 'Unable to load capture'}); }
      }
      if (abort.signal.aborted) return;
      setEntries(current => before ? [...current, ...loaded.filter(entry => !current.some(item => item.captureId === entry.captureId))] : loaded);
      setCursor(page.nextCursor);
    } catch (e) {if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load captures');}
    finally {if (!abort.signal.aborted) setBusy(false);}
  }
  useEffect(() => {void load(); return () => controller.current?.abort();}, [project.id, endpoint]);
  useEffect(() => {
    const abort = new AbortController();
    setApiKey(''); setKeyError('');
    if (!project.revoked) void fetch(`${endpoint}/v1/keys/${project.id}`, {credentials:'include', signal:abort.signal})
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(response.status === 401 ? 'Your session expired. Return to Console and reconnect your wallet.' : data.error ?? 'Unable to load API key');
        if (typeof data.apiKey !== 'string' || !data.apiKey) throw new Error('Unable to load API key');
        setApiKey(data.apiKey);
      }).catch(e => {if (!abort.signal.aborted) setKeyError(e.message);});
    return () => abort.abort();
  }, [project.id, project.revoked, endpoint]);
  return <>
    <Head><title>{project.name} | Console</title></Head>
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link to="/console">Console</Link><span aria-hidden="true"> / </span><span>{project.name}</span></nav>
    <header className={`${styles.consoleHeader} ${styles.projectHeader}`}>
      <div><h1>{project.name}</h1><p className={styles.subtitle}>Created {new Date(project.created_at * 1000).toLocaleString()}</p></div>
      {project.revoked ? <span className={styles.revoked}>API key revoked</span> : <button type="button" className={`${styles.iconButton} ${styles.deleteButton}`} aria-label="Delete project" title="Delete project" disabled={revoking} onClick={() => {
        if (!window.confirm(`Delete project ${project.name}? Its API key will be revoked and applications using it will lose access.`)) return;
        setRevoking(true); setError('');
        void onRevoke().catch(e => setError(e instanceof Error ? e.message : 'Unable to revoke API key')).finally(() => setRevoking(false));
      }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7"/></svg></button>}
    </header>
    {!project.revoked && (apiKey ? <ApiKeyBox apiKey={apiKey}/> : keyError ? <p role="alert" className="alert alert--danger">{keyError}</p> : <p role="status">Loading API key…</p>)}
    <section aria-labelledby="captures-title">
      <div className={styles.toolbar}><div><h2 id="captures-title">Failed capture contexts</h2><p className={styles.subtitle}>Stored validator evaluations from failed transaction builds.</p></div><button type="button" className={styles.iconButton} aria-label="Refresh captures" title="Refresh captures" disabled={busy} onClick={() => void load()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9"/></svg></button></div>
      {error && <p role="alert" className="alert alert--danger">{error}</p>}
      {busy && <p role="status">Loading captures…</p>}
      <table className={styles.table} aria-labelledby="captures-title"><thead><tr><th scope="col">Timestamp</th><th scope="col">Validator</th><th scope="col">Arguments (CBOR)</th></tr></thead><tbody>
        {entries.flatMap(entry => entry.payload?.evaluations.length ? entry.payload.evaluations.map((evaluation, index) => <tr key={`${entry.captureId}:${index}`}>
          <td><Timestamp value={entry.createdAt}/></td>
          <td><strong>{validatorName(entry.payload!, evaluation)}</strong><small className={styles.captureId}>Capture {entry.captureId}<br/>Script {evaluation.scriptHash}</small>{(evaluation.result.error || captureError(entry.payload!)) && <p className={styles.failure}>{evaluation.result.error || captureError(entry.payload!)}</p>}</td>
          <td>{evaluation.arguments.length ? <ol className={styles.argumentsList}>{evaluation.arguments.map((value, i) => <li key={i}><Argument value={value} index={i}/></li>)}</ol> : 'No arguments recorded'}</td>
        </tr>) : [<tr key={entry.captureId}><td><Timestamp value={entry.createdAt}/></td><td><small>Capture {entry.captureId}</small></td><td>{entry.error ?? 'No validator evaluations recorded'}</td></tr>])}
        {!entries.length && !busy && !error && <tr><td colSpan={3} className={styles.empty}>No failed captures yet.</td></tr>}
      </tbody></table>
      {cursor && <button className="button button--secondary" disabled={busy} onClick={() => void load(cursor)}>Load more</button>}
    </section>
  </>;
}
