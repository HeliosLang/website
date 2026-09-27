import React, {useRef, useState} from 'react';
import WalletPicker from './WalletPicker';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './projects.module.css';
import modal from './walletPicker.module.css';

type Key = {id: string; name: string; created_at: number; revoked: number};
export default function DebuggerConsole() {
  const {siteConfig} = useDocusaurusContext();
  const endpoint = String(siteConfig.customFields?.debuggerApiUrl ?? 'https://debugger.helios-lang.io');
  const [keys, setKeys] = useState<Key[]>([]);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const createDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const [selectedId, setSelectedId] = useState('');
  const selected = keys.find(key => key.id === selectedId);
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
  return <>
    <header className={styles.consoleHeader}>
      <h1>Console</h1>
      {connected && <button type="button" className={styles.logout} aria-label="Log out" title="Log out" disabled={busy}
        onClick={() => void run(async () => {await api('auth/logout','POST'); setConnected(false); setSecret(''); setKeys([]);})}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M8 12h10"/>
        </svg>
      </button>}
    </header>
    {!connected && <p>Connect your wallet to manage your debugger projects.</p>}
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
      {secret && <div className="alert alert--warning margin-top--md"><p>Copy this secret now. It will not be shown again.</p><code style={{overflowWrap:'anywhere'}}>{secret}</code><p><button onClick={() => setSecret('')}>Dismiss secret</button></p></div>}
      <div className={styles.toolbar}>
        <div><h2 id="projects-title">Projects</h2><p className={styles.subtitle}>Manager your Debugger API keys</p></div>
        {keys.length > 0 && <button className="button button--primary" disabled={busy} onClick={openCreate}>New project</button>}
      </div>
      <table className={styles.table} aria-labelledby="projects-title">
        <thead><tr><th scope="col">Name</th><th scope="col">Creation time</th></tr></thead>
        <tbody>{keys.length === 0 ? <tr><td colSpan={2} className={styles.empty}>
          <button className="button button--primary" disabled={busy} onClick={openCreate}>Create project</button>
        </td></tr> : keys.map(key => <tr key={key.id}>
          <td><button className={styles.projectName} onClick={() => {setSelectedId(key.id); setError(''); detailDialog.current?.showModal();}}>{key.name}</button>
            {!!key.revoked && <span className={styles.revoked}>Revoked</span>}</td>
          <td>{creationTime(key)}</td>
        </tr>)}</tbody>
      </table>
      <dialog ref={createDialog} className={modal.dialog} aria-labelledby="create-project-title"
        onCancel={event => {if (busy) event.preventDefault();}}>
        <form className={modal.content} onSubmit={event => {event.preventDefault(); void run(async () => {
          const key = await api('keys','POST',{name:name.trim()});
          setSecret(key.apiKey); setName(''); createDialog.current?.close(); await refresh();
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
      <dialog ref={detailDialog} className={modal.dialog} aria-labelledby="project-detail-title">
        <div className={modal.content}>
          <header className={modal.header}><h2 id="project-detail-title">{selected?.name ?? 'Project'}</h2>
            <button type="button" className={modal.close} aria-label="Close project details" onClick={() => detailDialog.current?.close()}>×</button>
          </header>
          {error && <p role="alert" className="alert alert--danger">{error}</p>}
          {selected && <><p>Created {creationTime(selected)}</p>
            {selected.revoked ? <p>API key revoked</p> : <button className="button button--danger" disabled={busy} onClick={() => void run(async () => {
              await api(`keys/${selected.id}`,'DELETE'); setSecret(''); await refresh();
            })}>Revoke API key</button>}
          </>}
        </div>
      </dialog>
    </>}
    </section>
  </>;
}
