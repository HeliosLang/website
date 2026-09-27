import React, {useEffect, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import styles from './projects.module.css';

type Project = {id: string; name: string; created_at: number; revoked: number};
type Evaluation = {phase: string; scriptHash: string; arguments: string[]; result: {error?: string}; sourceMap?: {sourceNames?: string[]}; companion?: {sourceMap?: {sourceNames?: string[]}}};
type Capture = {captureId: string; evaluations: Evaluation[]; sources?: Record<string,string>; error?: string | {message?: string}};
type Entry = {captureId: string; createdAt: number; payload?: Capture; error?: string};
function captureError(capture: Capture) {return typeof capture.error === 'string' ? capture.error : capture.error?.message;}
function validatorName(capture: Capture, evaluation: Evaluation) {
  const names = new Set([...(evaluation.sourceMap?.sourceNames ?? []), ...(evaluation.companion?.sourceMap?.sourceNames ?? [])]);
  const validators = new Set<string>();
  for (const name of names) {
    const source = capture.sources?.[name];
    const match = source?.match(/^\s*(?:spending|minting|staking|mixed|certifying|rewarding)\s+([A-Za-z_][\w]*)\b/);
    if (match) validators.add(match[1]);
  }
  return validators.size === 1 ? [...validators][0] : 'Unknown validator';
}
function Argument({value, index}: {value: string; index: number}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  return <div className={styles.argument}>
    <span className={styles.argumentLabel}>Argument {index + 1}</span>
    <code>{value.length > 48 ? `${value.slice(0,32)}…${value.slice(-12)}` : value}</code>
    <button type="button" className="button button--sm button--secondary" aria-label={`Copy argument ${index + 1} CBOR`} onClick={async () => {
      setError('');
      try {await navigator.clipboard.writeText(value); setCopied(true);} catch {setError('Copy failed. Select the full CBOR below.');}
    }}>{copied ? 'Copied' : 'Copy'}</button>
    {error && <><span role="alert">{error}</span><textarea readOnly aria-label={`Argument ${index + 1} full CBOR`} value={value}/></>}
  </div>;
}
export default function ProjectCaptures({project, endpoint, onRevoke}: {project: Project; endpoint: string; onRevoke: () => Promise<void>}) {
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
  return <>
    <Head><title>{project.name} | Console</title></Head>
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link to="/console">Console</Link><span aria-hidden="true"> / </span><span>{project.name}</span></nav>
    <header className={`${styles.consoleHeader} ${styles.projectHeader}`}>
      <div><h1>{project.name}</h1><p className={styles.subtitle}>Created {new Date(project.created_at * 1000).toLocaleString()}</p></div>
      {project.revoked ? <span className={styles.revoked}>API key revoked</span> : <button className="button button--danger" disabled={revoking} onClick={() => {
        if (!window.confirm(`Revoke the API key for ${project.name}? Applications using it will lose access.`)) return;
        setRevoking(true); setError('');
        void onRevoke().catch(e => setError(e instanceof Error ? e.message : 'Unable to revoke API key')).finally(() => setRevoking(false));
      }}>Revoke API key</button>}
    </header>
    <section aria-labelledby="captures-title">
      <div className={styles.toolbar}><div><h2 id="captures-title">Failed capture contexts</h2><p className={styles.subtitle}>Stored validator evaluations from failed transaction builds.</p></div><button className="button button--secondary" disabled={busy} onClick={() => void load()}>Refresh</button></div>
      {error && <p role="alert" className="alert alert--danger">{error}</p>}
      {busy && <p role="status">Loading captures…</p>}
      <table className={styles.table} aria-labelledby="captures-title"><thead><tr><th>Validator</th><th>Validator arguments (CBOR)</th></tr></thead><tbody>
        {entries.flatMap(entry => entry.payload?.evaluations.length ? entry.payload.evaluations.map((evaluation, index) => <tr key={`${entry.captureId}:${index}`}>
          <td><strong>{validatorName(entry.payload!, evaluation)}</strong><p className={styles.subtitle}>{evaluation.phase} · {new Date(entry.createdAt * 1000).toLocaleString()}</p><small className={styles.captureId}>Capture {entry.captureId}<br/>Script {evaluation.scriptHash}</small>{(evaluation.result.error || captureError(entry.payload!)) && <p className={styles.failure}>{evaluation.result.error || captureError(entry.payload!)}</p>}</td>
          <td>{evaluation.arguments.length ? evaluation.arguments.map((value, i) => <Argument key={i} value={value} index={i}/>) : 'No arguments recorded'}</td>
        </tr>) : [<tr key={entry.captureId}><td><small>Capture {entry.captureId}</small></td><td>{entry.error ?? 'No validator evaluations recorded'}</td></tr>])}
        {!entries.length && !busy && !error && <tr><td colSpan={2} className={styles.empty}>No failed captures yet.</td></tr>}
      </tbody></table>
      {cursor && <button className="button button--secondary" disabled={busy} onClick={() => void load(cursor)}>Load more</button>}
    </section>
  </>;
}
