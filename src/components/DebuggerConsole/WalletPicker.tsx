import React, {useRef, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './walletPicker.module.css';

export type Wallet = {
  name?: string;
  icon?: string;
  enable: () => Promise<{
    getUsedAddresses: () => Promise<string[]>;
    signData: (address: string, payload: string) => Promise<{signature: string; key: string}>;
  }>;
};
type Choice = {id: string; name: string; icon: string; wallet?: Wallet};
const knownWallets = [
  {id: 'eternl', name: 'Eternl', aliases: ['eternl', 'ccvault'], icon: 'eternl.png'},
  {id: 'lace', name: 'Lace', aliases: ['lace'], icon: 'lace.svg'},
  {id: 'vespr', name: 'VESPR', aliases: ['vespr'], icon: 'vespr.svg'},
  {id: 'yoroi', name: 'Yoroi', aliases: ['yoroi'], icon: 'yoroi.svg'},
  {id: 'begin', name: 'Begin', aliases: ['begin'], icon: 'begin.svg'},
];

export default function WalletPicker({onConnect}: {onConnect: (wallet: Wallet, id: string) => Promise<void>}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState('');
  const icons = useBaseUrl('/img/wallets/');
  function open() {
    const injected = (window as unknown as {cardano?: Record<string, Wallet>}).cardano ?? {};
    const available = Object.entries(injected).filter(([, wallet]) => typeof wallet?.enable === 'function');
    const knownIds = new Set(knownWallets.flatMap(wallet => wallet.aliases));
    let preferred = '';
    try { preferred = localStorage.getItem('helios.debugger.wallet') ?? ''; } catch {}
    setChoices([
      ...knownWallets.map(wallet => ({...wallet, icon: `${icons}${wallet.icon}`,
        wallet: available.find(([id]) => wallet.aliases.includes(id))?.[1]})),
      ...available.filter(([id]) => !knownIds.has(id)).map(([id, wallet]) => ({id,
        name: (wallet.name || id).replace(/^connect\s+/i, '').replace(/\s*wallet$/i, '').trim() || id,
        icon: wallet.icon || `${icons}genericWallet.svg`, wallet})),
    ].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred)));
    setError('');
    dialog.current?.showModal();
  }
  async function connect(choice: Choice) {
    if (!choice.wallet || connecting) return;
    setConnecting(choice.id);
    setError('');
    try {
      await onConnect(choice.wallet, choice.id);
      dialog.current?.close();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Wallet request cancelled or failed');
    } finally {
      setConnecting('');
    }
  }
  return <>
    <button className="button button--primary" onClick={open}>Connect wallet</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="wallet-picker-title"
      aria-describedby="wallet-picker-description" onCancel={event => {if (connecting) event.preventDefault();}}
      onClick={event => {if (event.target === event.currentTarget && !connecting) dialog.current?.close();}}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h2 id="wallet-picker-title">Connect wallet</h2>
          <button className={styles.close} type="button" aria-label="Close wallet selection" disabled={!!connecting}
            onClick={() => dialog.current?.close()}>×</button>
        </header>
        <p id="wallet-picker-description" className={styles.description}>Choose a wallet installed in this browser.</p>
        {error && <p role="alert" className="alert alert--danger">{error}</p>}
        {!choices.some(choice => choice.wallet) && <p role="status" className={styles.description}>Install or enable a Cardano wallet to connect.</p>}
        <div className={styles.list} aria-busy={!!connecting}>
          {choices.map(choice => <button key={choice.id} type="button" className={styles.wallet}
            disabled={!choice.wallet || !!connecting} title={!choice.wallet ? 'Not detected in this browser' : undefined}
            onClick={() => void connect(choice)}>
            <img src={choice.icon} alt="" width="36" height="36" onError={event => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = `${icons}genericWallet.svg`;
            }}/>
            <span>{choice.name}</span>
          </button>)}
        </div>
        {connecting && <p role="status" className={styles.description}>Continue in your wallet…</p>}
      </div>
    </dialog>
  </>;
}
