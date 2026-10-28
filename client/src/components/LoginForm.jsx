import { useState } from 'react';
import { getErrorMessage } from '../api';

export default function LoginForm({ onLogin, onRegister, notice }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Введите email и пароль');
      return;
    }
    setIsSubmitting(true);
    try {
      const action = mode === 'login' ? onLogin : onRegister;
      await action(form.email.trim(), form.password);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <main className="container">
      <form className="card auth-form" onSubmit={handleSubmit} noValidate>
        <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
        {notice && <p className="notice">{notice}</p>}
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" autoFocus />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
        </label>
        <p className="error" role="alert">{error}</p>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting && <span className="spinner spinner-sm spinner-inverse" aria-hidden="true" />}
          {isSubmitting ? 'Отправка…' : isLogin ? 'Войти' : 'Зарегистрироваться'}
        </button>
        <p className="muted auth-switch">
          {isLogin ? 'Нет аккаунта?' : 'Уже зарегистрированы?'}{' '}
          <button
            type="button"
            className="link"
            onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(null); }}
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </form>
    </main>
  );
}
