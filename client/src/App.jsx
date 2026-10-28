import { useEffect, useState } from 'react';
import './App.css';
import LoginForm from './components/LoginForm';
import ParkingPage from './components/ParkingPage';
import Toasts from './components/Toasts';
import useAuth from './hooks/useAuth';
import useNotifications from './hooks/useNotifications';

const THEME_KEY = 'parking:theme';

function App() {
  const { user, notice, login, register, logout } = useAuth();
  const { notifications, notify, dismiss } = useNotifications();

  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_KEY) || 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <div className="app">
      <header className="app-header">
        <h1>🅿️ Парковка — управление местами</h1>
        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {user && (
            <div className="user-box">
              <span>
                {user.email}
                {user.role === 'admin' ? ' · администратор' : ''}
              </span>
              <button type="button" onClick={logout}>
                Выйти
              </button>
            </div>
          )}
        </div>
      </header>

      {user ? (
        <ParkingPage key={user.id} user={user} notify={notify} />
      ) : (
        <LoginForm onLogin={login} onRegister={register} notice={notice} />
      )}

      <Toasts notifications={notifications} onDismiss={dismiss} />
    </div>
  );
}

export default App;