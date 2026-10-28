import { useState } from 'react';
import validateSpace from '../utils/validateSpace';

const EMPTY_FORM = { number: '', pricePerHour: '', location: '', capacity: '1' };

export default function SpaceForm({ onAdd }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const message = validateSpace(form);
    if (message) {
      setError(message);
      return;
    }
    // Форма очищается сразу: ответ сервера не ожидается (оптимистичное добавление).
    onAdd({
      number: form.number.trim(),
      pricePerHour: Number(form.pricePerHour),
      location: form.location.trim() || 'Не указано',
      capacity: Number(form.capacity)
    });
    setForm(EMPTY_FORM);
  };

  return (
    <section className="card form-section">
      <h2>Добавить место</h2>
      <form onSubmit={handleSubmit} className="add-form" noValidate>
        <input name="number" type="text" placeholder="Номер (например, A1)" value={form.number} onChange={handleChange} />
        <input name="pricePerHour" type="number" placeholder="Цена за час" min="1" value={form.pricePerHour} onChange={handleChange} />
        <input name="location" type="text" placeholder="Расположение" value={form.location} onChange={handleChange} />
        <input name="capacity" type="number" placeholder="Вместимость" min="1" max="20" value={form.capacity} onChange={handleChange} />
        <button type="submit">Добавить</button>
      </form>
      <p className="error" role="alert">{error}</p>
    </section>
  );
}
