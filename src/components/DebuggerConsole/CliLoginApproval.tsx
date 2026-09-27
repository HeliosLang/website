import React, {useEffect, useState} from 'react';

type Project = {id: string; name: string; revoked: number};
type Login = {state: 'pending' | 'approved' | 'completed' | 'cancelled'; code: string; expires: number};

export default function CliLoginApproval({id, endpoint, projects, onCreate}: {
  id: string; endpoint: string; projects: Project[]; onCreate: () => void;
}) {
  const [login, setLogin] = useState<Login | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const active = projects.filter(project => !project.revoked);
  useEffect(() => {
    if (terminal) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`${endpoint}/v1/auth/cli-logins/${id}`, {
          credentials:'include', signal:abort.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          if ([401,403,404,410].includes(response.status)) setTerminal(true);
          throw new Error(result.error ?? 'Unable to check CLI login');
        }
        setLogin(result); setError('');
        if (['completed','cancelled'].includes(result.state)) {setTerminal(true); return;}
      } catch (error) {
        if (abort.signal.aborted) return;
        setError(error instanceof Error ? error.message : 'Unable to check CLI login');
      }
      if (!abort.signal.aborted) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => {abort.abort(); clearTimeout(timer);};
  }, [id, endpoint, terminal]);
  async function act(method: 'POST' | 'DELETE') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${endpoint}/v1/auth/cli-logins/${id}`, {method, credentials:'include'});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to authorize CLI');
      setLogin(current => current ? {...current, state:result.state} : current);
      if (result.state === 'cancelled') setTerminal(true);
    } catch (error) {setError(error instanceof Error ? error.message : 'Unable to authorize CLI');}
    finally {setBusy(false);}
  }
  return <section className="alert alert--info margin-top--md" aria-label="CLI authorization">
    <h2>Helios CLI login</h2>
    {error && <p role="alert">{error}</p>}
    {!login && !error && <p role="status">Loading login request…</p>}
    {login?.state === 'pending' && !terminal && <>
      <p>Check that this code matches the code in your terminal: <strong>{login.code}</strong></p>
      <p>Authorize the CLI only if you started this login. It will install the API keys for all your active projects on that computer.</p>
      {active.length ? <><ul>{active.map(project => <li key={project.id}>{project.name}</li>)}</ul>
        <button className="button button--primary" disabled={busy} onClick={() => void act('POST')}>Authorize CLI</button></>
        : <><p>Create a project before authorizing the CLI.</p><button className="button button--primary" onClick={onCreate}>Create project</button></>}
      {' '}<button className="button button--secondary" disabled={busy} onClick={() => void act('DELETE')}>Cancel CLI login</button>
    </>}
    {login?.state === 'approved' && !terminal && <>
      <p role="status">Waiting for the CLI to save your project keys…</p>
      <button className="button button--secondary" disabled={busy} onClick={() => void act('DELETE')}>Cancel CLI login</button>
    </>}
    {login?.state === 'completed' && <p role="status">You can now close this tab</p>}
    {login?.state === 'cancelled' && <p role="status">CLI login cancelled. Run helios login to try again.</p>}
  </section>;
}
