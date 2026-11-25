import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, AUTH_EXPIRED_EVENT } from '../api';

const actions = {
  created: 'добавлено',
  updated: 'изменено',
  deleted: 'удалено',
  occupied: 'занято',
  released: 'освобождено',
};
const clock = new Intl.DateTimeFormat('ru', { timeStyle: 'medium' });

export default function LiveParking({ token, reload, isSyncing }) {
  const [status, setStatus] = useState('Подключение…');
  const [floor, setFloor] = useState(1);
  const [count, setCount] = useState(null);
  const [events, setEvents] = useState([]);
  const [revision, setRevision] = useState(0);
  const syncedRevision = useRef(0);
  const connection = useRef(null);
  const subscription = useRef({ floor: 1, request: 0 });
  const nextEvent = useRef(0);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token }, autoConnect: false });

    function log(text, at = new Date()) {
      const event = { id: ++nextEvent.current, text, time: clock.format(at) };
      setEvents((current) => [event, ...current].slice(0, 5));
    }

    function subscribe() {
      const request = ++subscription.current.request;
      const selected = subscription.current.floor;
      socket.timeout(4000).emit('floor:subscribe', selected, (error, reply) => {
        if (request !== subscription.current.request || !socket.connected) return;
        if (error || !reply?.ok) {
          setStatus(reply?.error ?? 'Подписка не подтверждена. Повторить');
          return;
        }
        setStatus('Подключено');
        setCount(reply.count);
      });
    }

    connection.current = { socket, subscribe };
    socket.on('connect', () => {
      subscribe();
      setRevision((current) => current + 1);
    });
    socket.on('disconnect', () => {
      setCount(null);
      setStatus(socket.active ? 'Переподключение…' : 'Отключено');
    });
    socket.on('connect_error', (error) => {
      if (error.message === 'Недействительная сессия') {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      } else {
        setStatus('Сервер недоступен. Переподключение…');
      }
    });
    socket.on('session:expired', () => window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)));
    socket.on('spaces:changed', () => setRevision((current) => current + 1));
    socket.on('floor:presence', (event) => {
      if (event.floor !== subscription.current.floor) return;
      setCount(event.count);
      log(event.action === 'joined' ? 'Пользователь подключился' : 'Пользователь отключился');
    });
    socket.on('floor:activity', (event) => {
      log(`Место ${event.number} ${actions[event.action]} · этаж ${event.floor}`, new Date(event.at));
    });

    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      connection.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (isSyncing || syncedRevision.current === revision) return;
    const timer = setTimeout(() => {
      syncedRevision.current = revision;
      reload();
    }, 120);
    return () => clearTimeout(timer);
  }, [isSyncing, reload, revision]);

  function selectFloor(event) {
    const selected = Number(event.target.value);
    subscription.current.floor = selected;
    setFloor(selected);
    setCount(null);
    setEvents([]);
    if (connection.current?.socket.connected) connection.current.subscribe();
  }

  return (
    <section className="card live-parking" aria-label="Уведомления парковки">
      <div className="live-header">
        <h2>События парковки</h2>
        <span className="live-status" role="status">
          <span aria-hidden="true" className={count === null ? 'live-dot' : 'live-dot online'} />
          {status}
        </span>
      </div>
      <div className="live-controls">
        <label>
          Этаж{' '}
          <select value={floor} onChange={selectFloor}>
            {Array.from({ length: 50 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <span>Подключений: <strong>{count ?? '—'}</strong></span>
        {status.includes('Повторить') && (
          <button type="button" onClick={() => connection.current?.subscribe()}>
            Повторить подписку
          </button>
        )}
      </div>
      <ul className="live-events" aria-live="polite">
        {events.length === 0 && <li>На этом этаже пока нет новых событий.</li>}
        {events.map(({ id, text, time }) => (
          <li key={id}><time>{time}</time><span>{text}</span></li>
        ))}
      </ul>
    </section>
  );
}
