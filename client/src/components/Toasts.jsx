import { useEffect } from 'react';

const TOAST_TIMEOUT_MS = 4000;

function Toast({ notification, onDismiss }) {
  const { id, type, text } = notification;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), TOAST_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <li className={`toast toast-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{text}</span>
      <button type="button" className="toast-close" onClick={() => onDismiss(id)} aria-label="Закрыть">×</button>
    </li>
  );
}

export default function Toasts({ notifications, onDismiss }) {
  return (
    <ul className="toasts" aria-live="polite">
      {notifications.map(n => <Toast key={n.id} notification={n} onDismiss={onDismiss} />)}
    </ul>
  );
}
