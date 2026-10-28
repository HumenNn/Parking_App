import { useCallback, useEffect, useState } from 'react';
import useDebounce from '../hooks/useDebounce';
import useSpaces from '../hooks/useSpaces';
import SpaceForm from './SpaceForm';
import SpaceItem from './SpaceItem';
import UsersAdmin from './UsersAdmin';

const SEARCH_DEBOUNCE_MS = 400;

function sortByNumber(list) {
  return [...list].sort((a, b) => {
    const fa = a.floor ?? 1;
    const fb = b.floor ?? 1;
    if (fa !== fb) return fa - fb;
    return String(a.number).localeCompare(String(b.number), 'ru', {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

export default function ParkingPage({ user, notify }) {
  const [search, setSearch] = useState('');
  const [available, setAvailable] = useState('all');
  const [sort, setSort] = useState('id');
  const [editingId, setEditingId] = useState(null);
  const [view, setView] = useState('list');

  const debouncedSearch = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS);
  const isTyping = search.trim() !== debouncedSearch;
  const canEdit = user.role === 'admin';

  const {
    items,
    total,
    hasMore,
    isLoading,
    error,
    stats,
    pending,
    isSyncing,
    isLoadingMore,
    moreError,
    reload,
    loadMore,
    addSpace,
    editSpace,
    removeSpace,
    occupySpace,
    releaseSpace,
  } = useSpaces({ search: debouncedSearch, available, sort }, notify, user.id);

  useEffect(() => {
    const previous = document.title;
    document.title = isLoading ? 'Загрузка мест…' : `Парковка (${total})`;
    return () => {
      document.title = previous;
    };
  }, [isLoading, total]);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);
  const handleSave = useCallback(
    (id, changes) => {
      setEditingId(null);
      editSpace(id, changes);
    },
    [editSpace]
  );
  const handleRemove = useCallback(
    (id) => {
      setEditingId((current) => (current === id ? null : current));
      removeSpace(id);
    },
    [removeSpace]
  );

  const myOccupied = items.filter((s) => s.isMine).length;
  const maxSpaces = user.maxSpaces ?? 2;

  // Для списка: при сортировке «по номеру» упорядочиваем на клиенте
  const listItems = sort === 'number' ? sortByNumber(items) : items;

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
        <button type="button" className="btn-primary" onClick={reload}>
          Повторить
        </button>
      </div>
    );
  } else if (items.length === 0) {
    content = <p className="empty">Нет мест по выбранным условиям</p>;
  } else if (view === 'map') {
  // этаж → зона (буква) → места
  const byFloor = {};
  items.forEach((space) => {
    const fl = space.floor ?? 1;
    const zone = (String(space.number).match(/^[A-Za-zА-Яа-я]+/) || ['?'])[0].toUpperCase();
    if (!byFloor[fl]) byFloor[fl] = {};
    if (!byFloor[fl][zone]) byFloor[fl][zone] = [];
    byFloor[fl][zone].push(space);
  });

  const floorKeys = Object.keys(byFloor)
    .map(Number)
    .sort((a, b) => a - b);

  content = (
    <div className="map-by-floor">
      {floorKeys.map((fl) => {
        const zones = Object.keys(byFloor[fl]).sort((a, b) =>
          a.localeCompare(b, 'ru')
        );
        return (
          <div key={fl} className="floor-block">
            <h3 className="floor-title">Этаж {fl}</h3>
            {zones.map((zone) => {
              const seats = [...byFloor[fl][zone]].sort((a, b) =>
                String(a.number).localeCompare(String(b.number), 'ru', {
                  numeric: true,
                  sensitivity: 'base',
                })
              );
              return (
                <div key={zone} className="zone-block">
                  <h4 className="zone-title">Зона {zone}</h4>
                  <div className="seats-grid">
                    {seats.map((space) => {
                      const locked = Boolean(pending[space.id]);
                      const cls = [
                        'seat',
                        space.isAvailable
                          ? 'free'
                          : space.isMine
                            ? 'mine'
                            : 'busy',
                        locked ? 'pending' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      const canClick =
                        space.isAvailable || space.isMine || canEdit;

                      return (
                        <button
                          key={space.id}
                          type="button"
                          className={cls}
                          disabled={locked || !canClick}
                          title={`${space.number} · этаж ${fl}${
                            space.isMine
                              ? ' — ваше'
                              : space.isAvailable
                                ? ' — свободно'
                                : ' — занято'
                          }`}
                          onClick={() => {
                            if (space.isAvailable) occupySpace(space.id);
                            else if (space.isMine || canEdit)
                              releaseSpace(space.id);
                          }}
                        >
                          {space.number}
                          {locked && (
                            <span className="spinner spinner-sm" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
} else {
    content = (
      <ul
        className={`space-list ${isLoading ? 'is-loading' : ''}`}
        aria-busy={isLoading}
      >
        {listItems.map((space) => (
          <SpaceItem
            key={space.id}
            space={space}
            canEdit={canEdit}
            isPending={Boolean(pending[space.id])}
            isEditing={editingId === space.id}
            onStartEdit={setEditingId}
            onCancelEdit={handleCancelEdit}
            onSave={handleSave}
            onOccupy={occupySpace}
            onRelease={releaseSpace}
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
      {canEdit ? (
        <SpaceForm onAdd={addSpace} />
      ) : (
        <p className="card notice">
          Вы можете занимать свободные места и освобождать свои.
          Изменять и удалять места может только администратор.
        </p>
      )}

      {!canEdit && (
        <p className="card notice">
          Занято вами: <b>{myOccupied}</b> / <b>{maxSpaces}</b>
        </p>
      )}

      <section className="card controls">
        <div className="control">
          <span className="control-label">Вид:</span>
          <button
            type="button"
            className={view === 'list' ? 'chip active' : 'chip'}
            onClick={() => setView('list')}
          >
            Список
          </button>
          <button
            type="button"
            className={view === 'map' ? 'chip active' : 'chip'}
            onClick={() => setView('map')}
          >
            Карта
          </button>
        </div>

        <div className="control control-search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по номеру"
            aria-label="Поиск"
          />
        </div>

        <div className="control">
          <label htmlFor="filter">Фильтр:</label>
          <select
            id="filter"
            value={available}
            onChange={(e) => setAvailable(e.target.value)}
          >
            <option value="all">Все</option>
            <option value="true">Свободные</option>
            <option value="false">Занятые</option>
          </select>
        </div>

        <div className="control">
          <label htmlFor="sort">Сортировка:</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="id">По ID</option>
            <option value="number">По номеру</option>
            <option value="price">По цене</option>
          </select>
        </div>

        <div className="stats">
          <span>
            Всего: <b>{stats ? stats.total : '—'}</b>
          </span>
          <span>
            Свободно: <b>{stats ? stats.available : '—'}</b>
          </span>
          <span>
            Занято: <b>{stats ? stats.occupied : '—'}</b>
          </span>
        </div>
      </section>

      <section className="card">
        <div className="list-header">
          <h2>{view === 'map' ? 'Карта мест' : 'Список мест'}</h2>
          <span className="save-status" aria-live="polite">
            {isSyncing ? (
              <>
                <span className="spinner spinner-sm" /> Сохранение…
              </>
            ) : (
              progress
            )}
          </span>
          {!isLoading && !error && (
            <button
              type="button"
              className="link"
              onClick={reload}
              disabled={isSyncing}
            >
              Обновить
            </button>
          )}
        </div>

        {view === 'map' && !error && items.length > 0 && (
          <p className="legend">
            Зелёный — свободно · Синий — ваше · Красный — занято
          </p>
        )}

        {content}

        {(hasMore || moreError) && (
          <div className="load-more">
            {moreError && <span className="error">{moreError}</span>}
            <button type="button" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore && (
                <span className="spinner spinner-sm" aria-hidden="true" />
              )}
              {isLoadingMore
                ? 'Загрузка…'
                : moreError
                  ? 'Повторить'
                  : `Показать ещё (осталось ${total - items.length})`}
            </button>
          </div>
        )}
      </section>
      {canEdit && <UsersAdmin notify={notify} />}
    </main>
  );
}