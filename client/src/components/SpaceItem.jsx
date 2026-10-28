import { memo, useState } from 'react';
import validateSpace from '../utils/validateSpace';

function SpaceItem({ space, canEdit, isPending, isEditing, onStartEdit, onCancelEdit, onSave, onToggle, onRemove }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);

  const locked = isPending || Boolean(space.isTemp);

  const startEdit = () => {
    setDraft({
      number: space.number,
      pricePerHour: String(space.pricePerHour),
      location: space.location,
      capacity: String(space.capacity ?? 1)
    });
    setError(null);
    onStartEdit(space.id);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setDraft(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const save = () => {
    const message = validateSpace(draft);
    if (message) {
      setError(message);
      return;
    }
    const changes = {};
    if (draft.number.trim() !== space.number) changes.number = draft.number.trim();
    if (Number(draft.pricePerHour) !== space.pricePerHour) changes.pricePerHour = Number(draft.pricePerHour);
    if (draft.location.trim() !== space.location) changes.location = draft.location.trim() || 'Не указано';
    if (Number(draft.capacity) !== space.capacity) changes.capacity = Number(draft.capacity);
    onCancelEdit();
    if (Object.keys(changes).length > 0) onSave(space.id, changes);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  if (isEditing && draft) {
    return (
      <li className="editing" onKeyDown={handleKeyDown}>
        <div className="edit-grid">
          <input name="number" value={draft.number} onChange={handleChange} aria-label="Номер" autoFocus />
          <input name="pricePerHour" type="number" min="1" value={draft.pricePerHour} onChange={handleChange} aria-label="Цена за час" />
          <input name="location" value={draft.location} onChange={handleChange} aria-label="Расположение" />
          <input name="capacity" type="number" min="1" max="20" value={draft.capacity} onChange={handleChange} aria-label="Вместимость" />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="space-actions">
          <button type="button" className="primary" onClick={save}>Сохранить</button>
          <button type="button" onClick={onCancelEdit}>Отмена</button>
        </div>
      </li>
    );
  }

  return (
    <li className={`${space.isAvailable ? 'available' : 'occupied'} ${locked ? 'pending' : ''}`} aria-busy={locked}>
      <div className="space-info">
        <span className="space-number">
          {space.number}
          {locked && <span className="spinner spinner-sm" title="Синхронизация с сервером" />}
        </span>
        <span className="space-location">{space.location}</span>
        <span className="space-price">{space.pricePerHour} BYN/час</span>
        <span className="space-capacity">мест: {space.capacity ?? 1}</span>
        <span className={`space-status ${space.isAvailable ? 'ok' : 'busy'}`}>
          {space.isAvailable ? '✓ Свободно' : '✗ Занято'}
        </span>
        {space.isTemp && <span className="muted">сохраняется…</span>}
      </div>
      {canEdit && (
        <div className="space-actions">
          <button type="button" onClick={() => onToggle(space.id, !space.isAvailable)} disabled={locked}>
            {space.isAvailable ? 'Занять' : 'Освободить'}
          </button>
          <button type="button" onClick={startEdit} disabled={locked}>Изменить</button>
          <button type="button" className="danger" onClick={() => onRemove(space.id)} disabled={locked}>Удалить</button>
        </div>
      )}
    </li>
  );
}

export default memo(SpaceItem);
