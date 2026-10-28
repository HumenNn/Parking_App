import { useCallback, useEffect, useState } from 'react';
import useDebounce from '../hooks/useDebounce';
import useSpaces from '../hooks/useSpaces';
import SpaceForm from './SpaceForm';
import SpaceItem from './SpaceItem';

const SEARCH_DEBOUNCE_MS = 400;

export default function ParkingPage({ user, notify }) {
  const [search, setSearch] = useState('');
  const [available, setAvailable] = useState('all');
  const [sort, setSort] = useState('id');
  const [editingId, setEditingId] = useState(null);

  // Запрос на сервер уходит через 400 мс после последнего нажатия клавиши.
  const debouncedSearch = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS);
  const isTyping = search.trim() !== debouncedSearch;
  const canEdit = user.role === 'admin';

  const {
    items, total, hasMore, isLoading, error, stats, pending, isSyncing,
    isLoadingMore, moreError, reload, loadMore, addSpace, editSpace, removeSpace
  } = useSpaces({ search: debouncedSearch, available, sort }, notify);

  useEffect(() => {
    const previous = document.title;
    document.title = isLoading ? 'Загрузка мест…' : `Парковка (${total})`;
    return () => {
      document.title = previous;
    };
  }, [isLoading, total]);

  const handleToggle = useCallback((id, isAvailable) => editSpace(id, { isAvailable }), [editSpace]);
  const handleCancelEdit = useCallback(() => setEditingId(null), []);
  const handleSave = useCallback((id, changes) => {
    setEditingId(null);
    editSpace(id, changes);
  }, [editSpace]);
  const handleRemove = useCallback(id => {
    setEditingId(current => (current === id ? null : current));
    removeSpace(id);
  }, [removeSpace]);

  let content;
  if (isLoading && items.length === 0) {
    content = (
      <div className="placeholder">
        <span className="spinner" aria-hidden="true" />
        Загрузка мест с сервера…
      </div>
    );
  } else if (error) {
    content = (
      <div className="placeholder placeholder-error" role="alert">
        <span>Не удалось загрузить места. {error}</span>
        <button type="button" className="btn-primary" onClick={reload}>Повторить</button>
      </div>
    );
  } else if (items.length === 0) {
    content = <p className="empty">Нет мест по выбранным условиям</p>;
  } else {
    content = (
      <ul className={`space-list ${isLoading ? 'is-loading' : ''}`} aria-busy={isLoading}>
        {items.map(space => (
          <SpaceItem
            key={space.id}
            space={space}
            canEdit={canEdit}
            isPending={Boolean(pending[space.id])}
            isEditing={editingId === space.id}
            onStartEdit={setEditingId}
            onCancelEdit={handleCancelEdit}
            onSave={handleSave}
            onToggle={handleToggle}
            onRemove={handleRemove}
          />
        ))}
      </ul>
    );
  }

  let progress = '';
  if (isTyping) progress = 'Ввод…';
  else if (isLoading) progress = 'Поиск на сервере…';
  else if (!error) progress = `Показано ${items.length} из ${total}`;

  return (
    <main className="container">
      {canEdit
        ? <SpaceForm onAdd={addSpace} />
        : <p className="card notice">Просмотр мест доступен всем, изменять места может только администратор.</p>}

      <section className="card controls">
        <div className="control control-search">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по номеру или расположению"
            aria-label="Поиск"
          />
        </div>
        <div className="control">
          <label htmlFor="filter">Фильтр:</label>
          <select id="filter" value={available} onChange={e => setAvailable(e.target.value)}>
            <option value="all">Все</option>
            <option value="true">Свободные</option>
            <option value="false">Занятые</option>
          </select>
        </div>
        <div className="control">
          <label htmlFor="sort">Сортировка:</label>
          <select id="sort" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="id">По ID</option>
            <option value="number">По номеру</option>
            <option value="price">По цене</option>
          </select>
        </div>
        <div className="stats">
          <span>Всего: <b>{stats ? stats.total : '—'}</b></span>
          <span>Свободно: <b>{stats ? stats.available : '—'}</b></span>
          <span>Занято: <b>{stats ? stats.occupied : '—'}</b></span>
        </div>
      </section>

      <section className="card">
        <div className="list-header">
          <h2>Список мест</h2>
          <span className="save-status" aria-live="polite">
            {isSyncing ? <><span className="spinner spinner-sm" /> Сохранение…</> : progress}
          </span>
          {!isLoading && !error && (
            <button type="button" className="link" onClick={reload} disabled={isSyncing}>Обновить</button>
          )}
        </div>

        {content}

        {(hasMore || moreError) && (
          <div className="load-more">
            {moreError && <span className="error">{moreError}</span>}
            <button type="button" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore && <span className="spinner spinner-sm" aria-hidden="true" />}
              {isLoadingMore
                ? 'Загрузка…'
                : moreError
                  ? 'Повторить'
                  : `Показать ещё (осталось ${total - items.length})`}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
