import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSpace,
  deleteSpace,
  fetchSpaces,
  fetchStats,
  getErrorMessage,
  getStatus,
  isCanceled,
  updateSpace,
  occupySpace,
  releaseSpace,
} from '../api';

export const PAGE_SIZE = 6;

/**
 * Парковочные места, синхронизированные с сервером:
 * - GET /spaces с поиском, фильтром, сортировкой и постраничной загрузкой;
 * - POST, PUT, DELETE с оптимистичным обновлением;
 * - occupy / release с оптимистичным обновлением и откатом.
 */
export default function useSpaces({ search, available, sort }, notify, currentUserId) {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${search}|${available}|${sort}|${reloadKey}`;

  const [result, setResult] = useState({
    key: null,
    items: [],
    total: 0,
    hasMore: false,
    error: null,
  });
  const [more, setMore] = useState({ key: null, loading: false, error: null });
  const [pending, setPending] = useState({});
  const [stats, setStats] = useState(null);

  const itemsRef = useRef([]);
  const moreControllerRef = useRef(null);

  useEffect(() => {
    itemsRef.current = result.items;
  }, [result.items]);

  // Первая страница
  useEffect(() => {
    const controller = new AbortController();
    fetchSpaces(
      { search, available, sort, limit: PAGE_SIZE, offset: 0 },
      controller.signal
    )
      .then(({ items, total, hasMore }) => {
        const withMine = items.map((s) => ({
          ...s,
          isMine: currentUserId != null && s.occupiedByUserId === currentUserId,
        }));
        setResult({ key: requestKey, items: withMine, total, hasMore, error: null });
      })
      .catch((error) => {
        if (!isCanceled(error)) {
          setResult({
            key: requestKey,
            items: [],
            total: 0,
            hasMore: false,
            error: getErrorMessage(error),
          });
        }
      });
    return () => {
      controller.abort();
      moreControllerRef.current?.abort();
    };
  }, [search, available, sort, requestKey, currentUserId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller.signal).then(setStats).catch(() => {});
    return () => controller.abort();
  }, [reloadKey]);

  const refreshStats = useCallback(() => {
    fetchStats().then(setStats).catch(() => {});
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const isLoading = result.key !== requestKey;
  const error = isLoading ? null : result.error;
  const isLoadingMore = more.key === requestKey && more.loading;
  const moreError = more.key === requestKey ? more.error : null;

  const loadMore = useCallback(() => {
    const key = requestKey;
    const controller = new AbortController();
    moreControllerRef.current = controller;
    setMore({ key, loading: true, error: null });

    fetchSpaces(
      {
        search,
        available,
        sort,
        limit: PAGE_SIZE,
        offset: itemsRef.current.length,
      },
      controller.signal
    )
      .then(({ items, total, hasMore }) => {
        setResult((prev) => {
          if (prev.key !== key) return prev;
          const known = new Set(prev.items.map((i) => i.id));
          const next = items
            .filter((i) => !known.has(i.id))
            .map((s) => ({
              ...s,
              isMine: currentUserId != null && s.occupiedByUserId === currentUserId,
            }));
          return {
            ...prev,
            items: [...prev.items, ...next],
            total,
            hasMore,
          };
        });
        setMore({ key, loading: false, error: null });
      })
      .catch((err) => {
        if (!isCanceled(err)) {
          setMore({ key, loading: false, error: getErrorMessage(err) });
        }
      });
  }, [requestKey, search, available, sort, currentUserId]);

  const track = useCallback(async (id, request) => {
    setPending((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    try {
      return await request();
    } finally {
      setPending((prev) => {
        const next = { ...prev };
        if (next[id] > 1) next[id] -= 1;
        else delete next[id];
        return next;
      });
    }
  }, []);

  const patchItems = useCallback((fn, totalDelta = 0) => {
    setResult((prev) => ({
      ...prev,
      items: fn(prev.items),
      total: prev.total + totalDelta,
    }));
  }, []);

  /* POST: оптимистичное добавление */
  const addSpace = useCallback(
    async (data) => {
      const tempId = `temp-${Date.now()}`;
      patchItems(
        (items) => [
          ...items,
          { ...data, id: tempId, isAvailable: true, isTemp: true, isMine: false },
        ],
        1
      );
      try {
        const created = await track(tempId, () => createSpace(data));
        patchItems((items) =>
          items.map((i) => (i.id === tempId ? { ...created, isMine: false } : i))
        );
        notify('success', `Место ${created.number} добавлено`);
        refreshStats();
        return true;
      } catch (error) {
        patchItems((items) => items.filter((i) => i.id !== tempId), -1);
        notify(
          'error',
          `Не удалось добавить место ${data.number}: ${getErrorMessage(error)}`
        );
        return false;
      }
    },
    [notify, patchItems, refreshStats, track]
  );

  /* PUT: оптимистичное изменение */
  const editSpace = useCallback(
    async (id, changes) => {
      const before = itemsRef.current.find((i) => i.id === id);
      if (!before) return false;

      patchItems((items) =>
        items.map((i) => (i.id === id ? { ...i, ...changes } : i))
      );
      try {
        const updated = await track(id, () => updateSpace(id, changes));
        patchItems((items) =>
          items.map((i) =>
            i.id === id
              ? {
                  ...updated,
                  isMine:
                    currentUserId != null &&
                    updated.occupiedByUserId === currentUserId,
                }
              : i
          )
        );
        if ('isAvailable' in changes) refreshStats();
        return true;
      } catch (error) {
        patchItems((items) => items.map((i) => (i.id === id ? before : i)));
        notify(
          'error',
          `Не удалось изменить место ${before.number}: ${getErrorMessage(error)}`
        );
        return false;
      }
    },
    [notify, patchItems, refreshStats, track, currentUserId]
  );

  /* DELETE: оптимистичное удаление */
  const removeSpace = useCallback(
    async (id) => {
      const index = itemsRef.current.findIndex((i) => i.id === id);
      if (index === -1) return false;
      const removed = itemsRef.current[index];

      patchItems((items) => items.filter((i) => i.id !== id), -1);
      try {
        await track(id, () => deleteSpace(id));
        notify('success', `Место ${removed.number} удалено`);
        refreshStats();
        return true;
      } catch (error) {
        if (getStatus(error) === 404) return true;
        patchItems(
          (items) =>
            items.some((i) => i.id === id)
              ? items
              : [
                  ...items.slice(0, index),
                  removed,
                  ...items.slice(index),
                ],
          1
        );
        notify(
          'error',
          `Не удалось удалить место ${removed.number}: ${getErrorMessage(error)}`
        );
        return false;
      }
    },
    [notify, patchItems, refreshStats, track]
  );

  /* OCCUPY: оптимистичное занятие */
  const occupySpaceAction = useCallback(
    async (id) => {
      const before = itemsRef.current.find((i) => i.id === id);
      if (!before || !before.isAvailable) return false;

      // 1. Сразу обновляем UI
      patchItems((items) =>
        items.map((i) =>
          i.id === id
            ? {
                ...i,
                isAvailable: false,
                occupiedByUserId: currentUserId,
                isMine: true,
              }
            : i
        )
      );

      try {
        const updated = await track(id, () => occupySpace(id));
        patchItems((items) =>
          items.map((i) =>
            i.id === id ? { ...updated, isMine: true } : i
          )
        );
        notify('success', `Место ${before.number} занято`);
        refreshStats();
        return true;
      } catch (error) {
        // откат
        patchItems((items) =>
          items.map((i) => (i.id === id ? before : i))
        );
        notify('error', getErrorMessage(error));
        return false;
      }
    },
    [notify, patchItems, refreshStats, track, currentUserId]
  );

  /* RELEASE: оптимистичное освобождение */
  const releaseSpaceAction = useCallback(
    async (id) => {
      const before = itemsRef.current.find((i) => i.id === id);
      if (!before || before.isAvailable) return false;

      patchItems((items) =>
        items.map((i) =>
          i.id === id
            ? {
                ...i,
                isAvailable: true,
                occupiedByUserId: null,
                isMine: false,
              }
            : i
        )
      );

      try {
        const updated = await track(id, () => releaseSpace(id));
        patchItems((items) =>
          items.map((i) =>
            i.id === id ? { ...updated, isMine: false } : i
          )
        );
        notify('success', `Место ${before.number} освобождено`);
        refreshStats();
        return true;
      } catch (error) {
        patchItems((items) =>
          items.map((i) => (i.id === id ? before : i))
        );
        notify('error', getErrorMessage(error));
        return false;
      }
    },
    [notify, patchItems, refreshStats, track]
  );

  return {
    items: result.items,
    total: result.total,
    hasMore: !isLoading && !error && result.hasMore,
    isLoading,
    error,
    stats,
    pending,
    isSyncing: Object.keys(pending).length > 0,
    isLoadingMore,
    moreError,
    reload,
    loadMore,
    addSpace,
    editSpace,
    removeSpace,
    occupySpace: occupySpaceAction,
    releaseSpace: releaseSpaceAction,
  };
}