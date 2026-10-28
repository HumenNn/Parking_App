import axios from 'axios';

export const TOKEN_KEY = 'parking:token';
export const USER_KEY = 'parking:user';
export const AUTH_EXPIRED_EVENT = 'parking:auth-expired';

const DELAY_MS = Number(import.meta.env.VITE_API_DELAY_MS) || 0;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Подставляет JWT в каждый запрос; задержка нужна только для проверки индикаторов загрузки.
api.interceptors.request.use(async config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (DELAY_MS > 0) await sleep(DELAY_MS);
  return config;
});

// 401 на запрос с токеном означает, что сессия недействительна.
api.interceptors.response.use(
  response => response,
  error => {
    const hadToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && hadToken) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then(response => response.data.token);

export const register = (email, password) =>
  api.post('/auth/register', { email, password }).then(response => response.data.data);

export const fetchProfile = () => api.get('/profile').then(response => response.data.data);

export const fetchSpaces = ({ search, available, sort, limit, offset }, signal) =>
  api.get('/spaces', {
    params: {
      ...(search ? { search } : {}),
      ...(available && available !== 'all' ? { available } : {}),
      ...(sort && sort !== 'id' ? { sort } : {}),
      limit,
      offset
    },
    signal
  }).then(response => ({
    items: response.data.data,
    total: response.data.meta.total,
    hasMore: response.data.meta.hasMore
  }));

export const fetchStats = signal =>
  api.get('/spaces/stats', { signal }).then(response => response.data);

export const createSpace = space =>
  api.post('/spaces', space).then(response => response.data);

export const updateSpace = (id, changes) =>
  api.put(`/spaces/${id}`, changes).then(response => response.data);

export const deleteSpace = id => api.delete(`/spaces/${id}`);

// Бронирование
export const occupySpace = id =>
  api.post(`/spaces/${id}/occupy`).then(r => r.data);

export const releaseSpace = id =>
  api.post(`/spaces/${id}/release`).then(r => r.data);

export const isCanceled = error => axios.isCancel(error);

export const getStatus = error => error?.response?.status;

export function getErrorMessage(error) {
  if (axios.isCancel(error)) return 'Запрос отменён';
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'Сервер не ответил вовремя';
  }
  if (!error?.response) {
    return 'Сервер недоступен. Проверьте подключение и что API запущен';
  }
  const { status, data } = error.response;
  if (status >= 500) return `Ошибка сервера (${status}). Попробуйте позже`;
  return data?.error || `Ошибка запроса (${status})`;
}

export const fetchUsers = () =>
  api.get('/users').then((r) => r.data.data);

export const updateUserMaxSpaces = (id, maxSpaces) =>
  api.patch(`/users/${id}/max-spaces`, { maxSpaces }).then((r) => r.data);

export default api;