import { useEffect, useState } from 'react';
import { fetchUsers, updateUserMaxSpaces, getErrorMessage } from '../api';

export default function UsersAdmin({ notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState({});

  const load = () => {
    setLoading(true);
    setError(null);
    fetchUsers()
      .then(setUsers)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const changeMax = async (id, value) => {
    const maxSpaces = Number(value);
    if (!Number.isInteger(maxSpaces) || maxSpaces < 0 || maxSpaces > 50) {
      notify('error', 'Лимит: целое число от 0 до 50');
      return;
    }
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      const updated = await updateUserMaxSpaces(id, maxSpaces);
      setUsers((list) =>
        list.map((u) => (u.id === id ? { ...u, maxSpaces: updated.maxSpaces } : u))
      );
      notify('success', `Лимит для ${updated.email}: ${updated.maxSpaces}`);
    } catch (e) {
      notify('error', getErrorMessage(e));
    } finally {
      setSaving((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <section className="card">
        <h2>Пользователи</h2>
        <div className="placeholder">
          <span className="spinner" /> Загрузка…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card">
        <h2>Пользователи</h2>
        <div className="placeholder placeholder-error">
          {error}
          <button type="button" className="btn-primary" onClick={load}>
            Повторить
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Пользователи — лимит мест</h2>
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Роль</th>
            <th>Макс. мест</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="50"
                  defaultValue={u.maxSpaces}
                  disabled={Boolean(saving[u.id])}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== u.maxSpaces) changeMax(u.id, v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur();
                  }}
                  className="max-spaces-input"
                />
                {saving[u.id] && <span className="spinner spinner-sm" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}