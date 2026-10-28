import { useState } from 'react';
import validateSpace from '../utils/validateSpace';

const EMPTY_FORM = {
  number: '',
  pricePerHour: '',
  capacity: '1',
  floor: '1',
};

export default function SpaceForm({ onAdd }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = validateSpace(form);
    if (message) {
      setError(message);
      return;
    }
    onAdd({
      number: form.number.trim(),
      pricePerHour: Number(form.pricePerHour),
      capacity: Number(form.capacity),
      floor: Number(form.floor),
    });
    setForm(EMPTY_FORM);
  };

  return (
    <section className="card form-section">
      <h2>Добавить место</h2>
      <form onSubmit={handleSubmit} className="add-form" noValidate>
        <input
          name="number"
          type="text"
          placeholder="Номер (например, A1)"
          value={form.number}
          onChange={handleChange}
        />
        <input
          name="floor"
          type="number"
          placeholder="Этаж"
          min="1"
          max="50"
          value={form.floor}
          onChange={handleChange}
        />
        <input
          name="pricePerHour"
          type="number"
          placeholder="Цена за час"
          min="1"
          value={form.pricePerHour}
          onChange={handleChange}
        />
        <input
          name="capacity"
          type="number"
          placeholder="Вместимость"
          min="1"
          max="20"
          value={form.capacity}
          onChange={handleChange}
        />
        <button type="submit">Добавить</button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}