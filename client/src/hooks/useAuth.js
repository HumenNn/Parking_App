import { useCallback, useEffect, useState } from 'react';
import {
  AUTH_EXPIRED_EVENT, TOKEN_KEY, USER_KEY,
  fetchProfile, login as apiLogin, register as apiRegister
} from '../api';

const readSession = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
};

const clearStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export default function useAuth() {
  const [session, setSession] = useState(readSession);
  const [notice, setNotice] = useState(null);

  const login = useCallback(async (email, password) => {
    const token = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    try {
      // Роль пользователя нужна интерфейсу: изменять места может только администратор.
      const user = await fetchProfile();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      setNotice(null);
      setSession({ token, user });
    } catch (error) {
      clearStorage();
      throw error;
    }
  }, []);

  const register = useCallback(async (email, password) => {
    await apiRegister(email, password);
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    clearStorage();
    setSession(null);
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      clearStorage();
      setSession(null);
      setNotice('Сессия истекла, войдите снова');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  return { user: session?.user ?? null, notice, login, register, logout };
}
