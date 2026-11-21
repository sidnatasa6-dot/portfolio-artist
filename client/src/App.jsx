import { useCallback, useEffect, useState } from 'react';
import { request, getToken, setToken, clearToken } from './api.js';

function AuthForm({ onLoggedIn }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await request('/api/auth/register', { method: 'POST', body: form });
      }
      const { data } = await request('/api/auth/login', {
        method: 'POST',
        body: { email: form.email, password: form.password },
      });
      setToken(data.token);
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>{mode === 'login' ? 'Вхід до системи' : 'Реєстрація'}</h2>
      {mode === 'register' && (
        <label>
          Ім’я <input name="name" value={form.name} onChange={change} required />
        </label>
      )}
      <label>
        Email <input name="email" type="email" value={form.email} onChange={change} required />
      </label>
      <label>
        Пароль <input name="password" type="password" value={form.password} onChange={change} required minLength={8} />
      </label>
      {error && <p role="alert" className="error">{error}</p>}
      <button disabled={loading}>
        {loading ? 'Зачекайте...' : mode === 'login' ? 'Увійти' : 'Зареєструватися'}
      </button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Немає акаунта? Зареєструватися' : 'Вже є акаунт? Увійти'}
      </button>
    </form>
  );
}

function Paintings({ user }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [q, setQ] = useState('');
  // Додаткова вимога Типу 4: фільтрація за стилем і сортування
  const [styleFilter, setStyleFilter] = useState('');
  const [sort, setSort] = useState('-createdAt');
  // 3 поля Варіанта № 8: title, style, year (число)
  const [form, setForm] = useState({ title: '', style: 'oil', year: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '20', sort });
      if (q) params.set('q', q);
      if (styleFilter) params.set('style', styleFilter);
      const { data, total } = await request(`/api/paintings?${params.toString()}`);
      setItems(data);
      setTotal(total);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, styleFilter, sort]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        title: form.title,
        style: form.style,
        year: Number(form.year),
      };
      await request('/api/paintings', { method: 'POST', body: payload });
      setForm({ title: '', style: 'oil', year: '' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    setError('');
    try {
      await request(`/api/paintings/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const canModify = (p) => p.owner === user.id || user.role === 'admin';

  return (
    <section>
      <form onSubmit={create} className="card row">
        <input
          placeholder="Назва картини"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <select
          value={form.style}
          onChange={(e) => setForm({ ...form, style: e.target.value })}
        >
          <option value="oil">oil (Олія)</option>
          <option value="watercolor">watercolor (Акварель)</option>
          <option value="acrylic">acrylic (Акрил)</option>
          <option value="digital">digital (Цифровий живопис)</option>
          <option value="sketch">sketch (Ескіз / графіка)</option>
        </select>
        <input
          type="number"
          min="1400"
          max="2100"
          placeholder="Рік (напр. 2025)"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
          required
        />
        <button>Додати</button>
      </form>

      <div className="card row">
        <input
          type="search"
          placeholder="Пошук за назвою..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLoading(true);
          }}
        />
        <select
          value={styleFilter}
          onChange={(e) => {
            setStyleFilter(e.target.value);
            setLoading(true);
          }}
        >
          <option value="">Усі техніки (style)</option>
          <option value="oil">oil</option>
          <option value="watercolor">watercolor</option>
          <option value="acrylic">acrylic</option>
          <option value="digital">digital</option>
          <option value="sketch">sketch</option>
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setLoading(true);
          }}
        >
          <option value="-createdAt">Новіші спочатку</option>
          <option value="createdAt">Давніші спочатку</option>
          <option value="title">Назва (А–Я)</option>
          <option value="-title">Назва (Я–А)</option>
          <option value="-year">Рік (за спаданням)</option>
          <option value="year">Рік (за зростанням)</option>
        </select>
      </div>

      {error && <p role="alert" className="error">{error}</p>}
      {loading ? (
        <p>Завантаження... (перший запит після простою може тривати до хвилини)</p>
      ) : items.length === 0 ? (
        <p>Записів не знайдено.</p>
      ) : (
        <ul className="list">
          {items.map((p) => (
            <li key={p.id}>
              <span>
                <strong>{p.title}</strong> — {p.style} ({p.year} р.)
              </span>
              {canModify(p) && (
                <button className="link" onClick={() => remove(p.id)}>
                  Видалити
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {total !== null && <p className="muted">Усього записів: {total}</p>}
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    request('/api/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  function logout() {
    clearToken();
    setUser(null);
  }

  if (checking) return <p>Перевірка сесії...</p>;

  return (
    <main>
      <header className="top">
        <h1>Портфоліо художника</h1>
        {user && (
          <span>
            {user.name} ({user.role}){' '}
            <button className="link" onClick={logout}>
              Вийти
            </button>
          </span>
        )}
      </header>
      {user ? <Paintings user={user} /> : <AuthForm onLoggedIn={setUser} />}
    </main>
  );
}
