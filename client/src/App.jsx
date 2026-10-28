import './App.css';
import LoginForm from './components/LoginForm';
import ParkingPage from './components/ParkingPage';
import Toasts from './components/Toasts';
import useAuth from './hooks/useAuth';
import useNotifications from './hooks/useNotifications';

function App() {
  const { user, notice, login, register, logout } = useAuth();
  const { notifications, notify, dismiss } = useNotifications();

  return (
    <div className="app">
      <header className="app-header">
        <h1>🅿️ Парковка — управление местами</h1>
        {user && (
          <div className="user-box">
            <span>{user.email}{user.role === 'admin' ? ' · администратор' : ''}</span>
            <button type="button" onClick={logout}>Выйти</button>
          </div>
        )}
      </header>

      {user
        ? <ParkingPage key={user.id} user={user} notify={notify} />
        : <LoginForm onLogin={login} onRegister={register} notice={notice} />}

      <Toasts notifications={notifications} onDismiss={dismiss} />
    </div>
  );
}

export default App;
