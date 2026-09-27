import React, {useEffect, useRef, useState} from 'react';
import {useLocation} from '@docusaurus/router';
import Link from '@docusaurus/Link';
import ProjectCaptures from './ProjectCaptures';
import CliLoginApproval from './CliLoginApproval';
import WalletPicker from './WalletPicker';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './projects.module.css';
import modal from './walletPicker.module.css';

type Key = {id: string; name: string; created_at: number; revoked: number};
export default function DebuggerConsole({projectPage = false}: {projectPage?: boolean}) {
  const {siteConfig} = useDocusaurusContext();
  const endpoint = String(siteConfig.customFields?.debuggerApiUrl ?? 'https://debugger.helios-lang.io');
  const {search} = useLocation();
  const projectId = new URLSearchParams(search).get('id');
  const [checkingSession, setCheckingSession] = useState(true);
  const cliLogin = new URLSearchParams(search).get('cli_login');
  const validCliLogin = cliLogin && /^[a-f0-9-]{36}$/.test(cliLogin);
  const [keys, setKeys] = useState<Key[]>([]);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const createDialog = useRef<HTMLDialogElement>(null);
  const creationTime = (key: Key) => <time dateTime={new Date(key.created_at * 1000).toISOString()}>
    {new Date(key.created_at * 1000).toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
  </time>;
  function openCreate() { setName(''); setError(''); createDialog.current?.showModal(); }
  async function api(path: string, method = 'GET', data?: unknown) {
    const response = await fetch(`${endpoint}/v1/${path}`, {method, credentials: 'include', headers: data ? {'Content-Type':'application/json'} : {}, body: data ? JSON.stringify(data) : undefined});
    const result = await response.json();
    if (!response.ok) { if (response.status === 401) {setConnected(false); setSecret(''); setKeys([]);} throw new Error(result.error ?? `HTTP ${response.status}`); }
    return result;
  }
  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Wallet request cancelled or failed'); } finally {setBusy(false);} }
  const refresh = async () => setKeys((await api('keys')).keys);
  useEffect(() => {
    const abort = new AbortController();
    void fetch(`${endpoint}/v1/keys`, {credentials:'include', signal:abort.signal}).then(async response => {
      if (response.status === 401) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to load projects');
      setKeys(data.keys); setConnected(true);
    }).catch(e => {if (!abort.signal.aborted) setError(e.message);}).finally(() => {if (!abort.signal.aborted) setCheckingSession(false);});
    return () => abort.abort();
  }, [projectPage, endpoint]);
  if (checkingSession) return <><h1>Console</h1><p role="status">Loading console…</p></>;
  if (projectPage && connected) {
    const project = keys.find(key => key.id === projectId);
    if (!project) return <><Link to="/console">← Console</Link><h1>Project not found</h1><p>This project is unavailable to the connected wallet.</p></>;
    return <ProjectCaptures key={project.id} project={project} endpoint={endpoint} onRevoke={async () => {await api(`keys/${project.id}`, 'DELETE'); await refresh();}}/>;
  }
  return <>
    {projectPage && <Link to="/console">← Console</Link>}
    <header className={styles.consoleHeader}>
      <h1>Console</h1>
      {connected && <button type="button" className={styles.logout} aria-label="Log out" title="Log out" disabled={busy}
        onClick={() => void run(async () => {await api('auth/logout','POST'); setConnected(false); setSecret(''); setKeys([]);})}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M8 12h10"/>
        </svg>
      </button>}
    </header>
    {cliLogin && !validCliLogin && <p role="alert">Invalid CLI login link. Run helios login again.</p>}
    {!connected && <p>{validCliLogin ? 'Connect your wallet to authorize the Helios CLI and install your project API keys.' : 'Connect your wallet to manage your debugger projects.'}</p>}
    <section aria-label="Debugger projects">
    {error && <p role="alert" className="alert alert--danger">{error}</p>}
    {!connected ? <>
      <WalletPicker onConnect={async (wallet, id) => {
        setError('');
        const handle = await wallet.enable(); const [address] = await handle.getUsedAddresses();
        if (!address) throw new Error('This wallet has no used address');
        const session = await fetch(`${endpoint}/v1/auth/session`, {method:'POST', credentials:'include',
          headers:{'Content-Type':'application/json'}, body:JSON.stringify({address})});
        if (!session.ok && session.status !== 401) throw new Error('Unable to check your wallet session. Please try again.');
        const resumed = session.ok && (await session.json()).matches === true;
        if (!resumed) {
          const challenge = await api('auth/challenge','POST',{address});
          const signed = await handle.signData(address, challenge.payload);
          await api('auth/verify','POST',{id:challenge.id,...signed});
        }
        await refresh(); setConnected(true);
        try { localStorage.setItem('helios.debugger.wallet', id); } catch {}
      }}/>
    </> : <>
      {validCliLogin && <CliLoginApproval key={cliLogin} id={cliLogin!} endpoint={endpoint} projects={keys} onCreate={openCreate}/>}
      {secret && <div className="alert alert--warning margin-top--md"><p>Copy this API key now, or install it later using helios login.</p><code style={{overflowWrap:'anywhere'}}>{secret}</code><p><button onClick={() => setSecret('')}>Dismiss secret</button></p></div>}
      <div className={styles.toolbar}>
        <div><h2 id="projects-title">Projects</h2><p className={styles.subtitle}>Manager your Debugger API keys</p></div>
        {keys.length > 0 && <button className="button button--primary" disabled={busy} onClick={openCreate}>New project</button>}
      </div>
      <table className={styles.table} aria-labelledby="projects-title">
        <thead><tr><th scope="col">Name</th><th scope="col">Creation time</th></tr></thead>
        <tbody>{keys.length === 0 ? <tr><td colSpan={2} className={styles.empty}>
          <button className="button button--primary" disabled={busy} onClick={openCreate}>Create project</button>
        </td></tr> : keys.map(key => <tr key={key.id}>
          <td><Link className={styles.projectName} to={`/console/project?id=${encodeURIComponent(key.id)}`}>{key.name}</Link>
            {!!key.revoked && <span className={styles.revoked}>Revoked</span>}</td>
          <td>{creationTime(key)}</td>
        </tr>)}</tbody>
      </table>
      <dialog ref={createDialog} className={modal.dialog} aria-labelledby="create-project-title"
        onCancel={event => {if (busy) event.preventDefault();}}>
        <form className={modal.content} onSubmit={event => {event.preventDefault(); void run(async () => {
          const key = await api('keys','POST',{name:name.trim()});
          setSecret(validCliLogin ? '' : key.apiKey); setName(''); createDialog.current?.close(); await refresh();
        });}}>
          <header className={modal.header}><h2 id="create-project-title">Create project</h2>
            <button type="button" className={modal.close} aria-label="Close project creation" disabled={busy} onClick={() => createDialog.current?.close()}>×</button>
          </header>
          <p className={modal.description}>Create a project to get an API key for your debugger captures.</p>
          {error && <p role="alert" className="alert alert--danger">{error}</p>}
          <label className={styles.label}>Project name <input autoFocus value={name} maxLength={100} required onChange={event => setName(event.target.value)}/></label>
          <div className={styles.actions}><button type="button" className="button button--secondary" disabled={busy} onClick={() => createDialog.current?.close()}>Cancel</button>
            <button className="button button--primary" disabled={busy || !name.trim()}>Create project</button></div>
        </form>
      </dialog>

    </>}
    </section>
  </>;
}
