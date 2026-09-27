import React, {useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type Key = {id: string; name: string; revoked: number};
type Wallet = {name: string; enable: () => Promise<{getUsedAddresses: () => Promise<string[]>; signData: (address: string, payload: string) => Promise<{signature: string; key: string}>}>};
export default function DebuggerConsole() {
  const {siteConfig} = useDocusaurusContext();
  const endpoint = String(siteConfig.customFields?.debuggerApiUrl ?? 'https://debugger.helios-lang.io');
  const [wallets, setWallets] = useState<[string, Wallet][]>([]);
  const [keys, setKeys] = useState<Key[]>([]);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function api(path: string, method = 'GET', data?: unknown) {
    const response = await fetch(`${endpoint}/v1/${path}`, {method, credentials: 'include', headers: data ? {'Content-Type':'application/json'} : {}, body: data ? JSON.stringify(data) : undefined});
    const result = await response.json();
    if (!response.ok) { if (response.status === 401) setConnected(false); throw new Error(result.error ?? `HTTP ${response.status}`); }
    return result;
  }
  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Wallet request cancelled or failed'); } finally {setBusy(false);} }
  const refresh = async () => setKeys((await api('keys')).keys);
  return <section aria-label="Debugger API keys">
    {error && <p role="alert" className="alert alert--danger">{error}</p>}
    {!connected ? <>
      <button className="button button--primary" disabled={busy} onClick={() => {
        const cardano = (window as unknown as {cardano?: Record<string, Wallet>}).cardano ?? {};
        const available = Object.entries(cardano).filter(([, w]) => typeof w?.enable === 'function');
        setWallets(available); if (!available.length) setError('No CIP-30 wallet found. Install or enable your Cardano wallet.');
      }}>Find wallets</button>
      {wallets.map(([id,wallet]) => <button key={id} className="button button--secondary margin-left--sm" disabled={busy} onClick={() => void run(async () => {
        const handle = await wallet.enable(); const [address] = await handle.getUsedAddresses();
        if (!address) throw new Error('This wallet has no used address');
        const challenge = await api('auth/challenge','POST',{address});
        const signed = await handle.signData(address, challenge.payload);
        await api('auth/verify','POST',{id:challenge.id,...signed});
        await refresh(); setConnected(true);
      })}>Connect {wallet.name ?? id}</button>)}
    </> : <>
      <form onSubmit={e => {e.preventDefault(); void run(async () => {const key = await api('keys','POST',{name}); setSecret(key.apiKey); setName(''); await refresh();});}}>
        <label>Key name <input value={name} maxLength={100} required onChange={e => setName(e.target.value)}/></label>{' '}
        <button className="button button--primary" disabled={busy}>Create API key</button>
      </form>
      {secret && <div className="alert alert--warning margin-top--md"><p>Copy this secret now. It will not be shown again.</p><code style={{overflowWrap:'anywhere'}}>{secret}</code><p><button onClick={() => setSecret('')}>Dismiss secret</button></p></div>}
      <ul>{keys.map(key => <li key={key.id}>{key.name} — {key.revoked ? 'Revoked' : <button disabled={busy} onClick={() => void run(async () => {await api(`keys/${key.id}`,'DELETE'); setSecret(''); await refresh();})}>Revoke</button>}</li>)}</ul>
      <button disabled={busy} onClick={() => void run(async () => {await api('auth/logout','POST'); setConnected(false); setSecret(''); setKeys([]);})}>Sign out</button>
    </>}
  </section>;
}
