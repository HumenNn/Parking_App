import { memo, useState } from 'react';
import validateSpace from '../utils/validateSpace';

function SpaceItem({
  space,
  canEdit,
  isPending,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onOccupy,
  onRelease,
  onRemove,
}) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);

  const locked = isPending || Boolean(space.isTemp);

  const startEdit = () => {
    setDraft({
      number: space.number,
      pricePerHour: String(space.pricePerHour),
      capacity: String(space.capacity ?? 1),
      floor: String(space.floor ?? 1),
    });
    setError(null);
    onStartEdit(space.id);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const save = () => {
    const message = validateSpace(draft);
    if (message) {
      setError(message);
      return;
    }

    const changes = {};
    if (draft.number.trim() !== space.number) {
      changes.number = draft.number.trim();
    }
    if (Number(draft.pricePerHour) !== space.pricePerHour) {
      changes.pricePerHour = Number(draft.pricePerHour);
    }
    if (Number(draft.capacity) !== (space.capacity ?? 1)) {
      changes.capacity = Number(draft.capacity);
    }
    if (Number(draft.floor) !== (space.floor ?? 1)) {
      changes.floor = Number(draft.floor);
    }

    onCancelEdit();
    if (Object.keys(changes).length > 0) {
      onSave(space.id, changes);
    }
  };

  const handleKeyDown = (e) => {
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
          <input
            name="number"
            value={draft.number}
            onChange={handleChange}
            aria-label="Номер"
            autoFocus
          />
          <input
            name="floor"
            type="number"
            min="1"
            max="50"
            value={draft.floor}
            onChange={handleChange}
            aria-label="Этаж"
          />
          <input
            name="pricePerHour"
            type="number"
            min="1"
            value={draft.pricePerHour}
            onChange={handleChange}
            aria-label="Цена за час"
          />
          <input
            name="capacity"
            type="number"
            min="1"
            max="20"
            value={draft.capacity}
            onChange={handleChange}
            aria-label="Вместимость"
          />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="space-actions">
          <button type="button" className="primary" onClick={save}>
            Сохранить
          </button>
          <button type="button" onClick={onCancelEdit}>
            Отмена
          </button>
        </div>
      </li>
    );
  }

  const showOccupy = space.isAvailable;
  const showRelease = !space.isAvailable && (space.isMine || canEdit);

  return (
    <li
      className={`${space.isAvailable ? 'available' : 'occupied'} ${
        space.isMine ? 'mine' : ''
      } ${locked ? 'pending' : ''}`}
      aria-busy={locked}
    >
      <div className="space-info">
        <span className="space-number">
          {space.number}
          {locked && (
            <span className="spinner spinner-sm" title="Синхронизация с сервером" />
          )}
        </span>
        <span className="space-floor">Этаж {space.floor ?? 1}</span>
        <span className="space-price">{space.pricePerHour} BYN/час</span>
        <span className="space-capacity">мест: {space.capacity ?? 1}</span>

        {space.isMine ? (
          <span className="space-status mine">★ Ваше</span>
        ) : space.isAvailable ? (
          <span className="space-status ok">✓ Свободно</span>
        ) : (
          <span className="space-status busy">✗ Занято</span>
        )}

        {space.isTemp && <span className="muted">сохраняется…</span>}
      </div>

      <div className="space-actions">
        {showOccupy && (
          <button
            type="button"
            className="primary"
            onClick={() => onOccupy(space.id)}
            disabled={locked}
          >
            Занять
          </button>
        )}
        {showRelease && (
          <button
            type="button"
            onClick={() => onRelease(space.id)}
            disabled={locked}
          >
            Освободить
          </button>
        )}
        {canEdit && (
          <>
            <button type="button" onClick={startEdit} disabled={locked}>
              Изменить
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => onRemove(space.id)}
              disabled={locked}
            >
              Удалить
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export default memo(SpaceItem);