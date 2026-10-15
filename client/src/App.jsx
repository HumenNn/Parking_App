import { useState, useEffect } from 'react';
import './App.css';

const STORAGE_KEY = 'parking_spaces';

const initialSpaces = [
  { id: 1, number: 'A1', isAvailable: true, pricePerHour: 5, location: 'Первый этаж' },
  { id: 2, number: 'A2', isAvailable: false, pricePerHour: 5, location: 'Первый этаж' },
  { id: 3, number: 'B1', isAvailable: true, pricePerHour: 7, location: 'Второй этаж' }
];

function App() {
  // Ленивая инициализация из localStorage
  const [spaces, setSpaces] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : initialSpaces;
    } catch {
      return initialSpaces;
    }
  });

  const [form, setForm] = useState({ number: '', pricePerHour: '', location: '' });
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [saveStatus, setSaveStatus] = useState('');

  // Сохранение в localStorage с debounce 500 мс
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(spaces));
      setSaveStatus('💾 Сохранено');
      const hide = setTimeout(() => setSaveStatus(''), 1500);
      return () => clearTimeout(hide);
    }, 500);

    return () => clearTimeout(timer);
  }, [spaces]);

  // Динамический заголовок страницы
  useEffect(() => {
    document.title = `Парковка (${spaces.length})`;
  }, [spaces.length]);

  const addSpace = (e) => {
    e.preventDefault();
    if (!form.number.trim() || !form.pricePerHour) return;

    const newSpace = {
      id: spaces.length ? Math.max(...spaces.map(s => s.id)) + 1 : 1,
      number: form.number.trim(),
      pricePerHour: parseInt(form.pricePerHour),
      location: form.location.trim() || 'Не указано',
      isAvailable: true
    };

    setSpaces([...spaces, newSpace]);
    setForm({ number: '', pricePerHour: '', location: '' });
  };

  const deleteSpace = (id) => {
    setSpaces(spaces.filter(s => s.id !== id));
  };

  const toggleAvailable = (id) => {
    setSpaces(spaces.map(s =>
      s.id === id ? { ...s, isAvailable: !s.isAvailable } : s
    ));
  };

  const filtered = spaces.filter(s => {
    if (filter === 'available') return s.isAvailable;
    if (filter === 'occupied') return !s.isAvailable;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price') return a.pricePerHour - b.pricePerHour;
    if (sortBy === 'number') return a.number.localeCompare(b.number);
    return a.id - b.id;
  });

  const total = spaces.length;
  const available = spaces.filter(s => s.isAvailable).length;
  const occupied = total - available;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🅿️ Парковка — управление местами</h1>
        <span className="save-status">{saveStatus}</span>
      </header>

      <main className="container">
        <section className="card form-section">
          <h2>Добавить место</h2>
          <form onSubmit={addSpace} className="add-form">
            <input
              type="text"
              placeholder="Номер (например, A1)"
              value={form.number}
              onChange={e => setForm({ ...form, number: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Цена за час"
              value={form.pricePerHour}
              onChange={e => setForm({ ...form, pricePerHour: e.target.value })}
              required
              min="1"
            />
            <input
              type="text"
              placeholder="Расположение"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            />
            <button type="submit">Добавить</button>
          </form>
        </section>

        <section className="card controls">
          <div className="control">
            <label>Фильтр:</label>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Все</option>
              <option value="available">Свободные</option>
              <option value="occupied">Занятые</option>
            </select>
          </div>

          <div className="control">
            <label>Сортировка:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="id">По ID</option>
              <option value="number">По номеру</option>
              <option value="price">По цене</option>
            </select>
          </div>

          <div className="stats">
            <span>Всего: <b>{total}</b></span>
            <span>Свободно: <b>{available}</b></span>
            <span>Занято: <b>{occupied}</b></span>
          </div>
        </section>

        <section className="card">
          <h2>Список мест</h2>
          {sorted.length === 0 ? (
            <p className="empty">Нет мест по выбранному фильтру</p>
          ) : (
            <ul className="space-list">
              {sorted.map(space => (
                <li key={space.id} className={space.isAvailable ? 'available' : 'occupied'}>
                  <div className="space-info">
                    <span className="space-number">{space.number}</span>
                    <span className="space-location">{space.location}</span>
                    <span className="space-price">{space.pricePerHour} BYN/час</span>
                    <span className={`space-status ${space.isAvailable ? 'ok' : 'busy'}`}>
                      {space.isAvailable ? '✓ Свободно' : '✗ Занято'}
                    </span>
                  </div>
                  <div className="space-actions">
                    <button onClick={() => toggleAvailable(space.id)}>
                      {space.isAvailable ? 'Занять' : 'Освободить'}
                    </button>
                    <button onClick={() => deleteSpace(space.id)} className="danger">
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;