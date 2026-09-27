import React, {useState} from 'react';
import styles from './projects.module.css';

export default function ApiKeyBox({apiKey}: {apiKey: string}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  return <section aria-label="Debugger API key" className="alert alert--warning margin-vert--md">
    <p><strong>Debugger API key</strong></p>
    <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
      <code style={{overflowWrap:'anywhere', minWidth:0}}>{apiKey}</code>
      <button type="button" className={styles.copyButton} aria-label="Copy API key" title={copied ? 'Copied' : 'Copy API key'} onClick={async () => {
        setError('');
        try {await navigator.clipboard.writeText(apiKey); setCopied(true);}
        catch {setError('Copy failed. Select and copy the API key above.');}
      }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {copied ? <path d="m5 12 4 4L19 6"/> : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>}
      </svg></button>
    </div>
    <span className="sr-only" role="status">{copied ? 'API key copied' : ''}</span>
    {error && <p role="alert">{error}</p>}
    <p className="margin-top--sm">Share this key with collaborators. Import it with <code>helios import-key &lt;api-key&gt;</code> to upload and read this project's captures.</p>
  </section>;
}
