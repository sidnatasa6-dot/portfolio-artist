import { useEffect, useState } from 'react';
import TodoForm from './components/TodoForm';
import TodoFilters from './components/TodoFilters';
import TodoList from './components/TodoList';
import './App.css';

const API_URL = 'https://typicode.com';
const STORAGE_KEY = 'todos-lr10-8';
const PROJECT_TITLE = 'Ескізи та замовлення художньої майстерні';
const USER_ID = 8;
const LIMIT = 14;
const INITIAL_FILTER = 'done';
const MIN_QUERY = 1;

const FALLBACK_TODOS = [
  { id: 1, title: 'Підготувати 3 ескізи осіннього пейзажу', completed: true },
  { id: 2, title: 'Замовити лляне полотно 60×80 та олійні фарби', completed: true },
  { id: 3, title: 'Написати портрет олією на замовлення', completed: false },
  { id: 4, title: 'Оформити багетну раму для картини на виставку', completed: false },
  { id: 5, title: 'Зробити кольорові начерки натюрморту пастеллю', completed: false },
  { id: 6, title: 'Придбати набір колонкових пензлів та розчинник', completed: true },
];

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function App() {
  const [todos, setTodos] = useState(() => loadSaved() ?? []);
  const [status, setStatus] = useState(() =>
    loadSaved() !== null ? 'success' : 'loading'
  );
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState(INITIAL_FILTER);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (reloadKey === 0 && loadSaved() !== null) return;

    let cancelled = false;
    const controller = new AbortController();

    async function fetchTodos() {
      if (!navigator.onLine) {
        if (!cancelled) {
          setError("Немає з'єднання з мережею.");
          setStatus('error');
        }
        return;
      }

      try {
        const url = `${API_URL}?userId=${USER_ID}&_limit=${LIMIT}`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Сервер відповів зі статусом ' + response.status);
        }

        const data = await response.json();
        if (!cancelled) {
          setTodos(
            data.map(({ id, title, completed }) => ({ id, title, completed }))
          );
          setStatus('success');
        }
      } catch (err) {
        if (err.name === 'AbortError' || cancelled) return;
        setTodos(FALLBACK_TODOS);
        setStatus('success');
      }
    }

    const timer = setTimeout(fetchTodos, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [reloadKey]);

  useEffect(() => {
    if (status === 'success') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
      } catch {
        // Ігноруємо помилку сховища
      }
    }
  }, [todos, status]);

  function addTodo(title) {
    const newTodo = { id: Date.now(), title, completed: false };
    setTodos((prev) => [newTodo, ...prev]);
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }

  function handleReload() {
    localStorage.removeItem(STORAGE_KEY);
    setStatus('loading');
    setError('');
    setReloadKey((key) => key + 1);
  }

  const normalizedQuery = query.trim().toLowerCase();

  const visibleTodos = todos.filter((todo) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && !todo.completed) ||
      (filter === 'done' && todo.completed);

    const matchesQuery =
      normalizedQuery.length < MIN_QUERY ||
      todo.title.toLowerCase().includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });

  const doneCount = todos.filter((todo) => todo.completed).length;

  return (
    <main className="app">
      <header className="app-header">
        <h1>To-Do List</h1>
        <p className="app-subtitle">{PROJECT_TITLE}</p>
      </header>

      <TodoForm onAdd={addTodo} />

      <TodoFilters
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
      />

      {status === 'loading' && (
        <p className="status" role="status">
          Завантаження завдань...
        </p>
      )}

      {status === 'error' && (
        <div className="status status-error" role="alert">
          <p>Не вдалося завантажити завдання: {error}</p>
          <button type="button" onClick={handleReload}>
            Спробувати ще раз
          </button>
        </div>
      )}

      {status === 'success' && (
        <>
          <p className="counter">
            Виконано <strong>{doneCount}</strong> із{' '}
            <strong>{todos.length}</strong> (показано: {visibleTodos.length})
          </p>

          <TodoList
            todos={visibleTodos}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />

          <button
            type="button"
            className="reload-btn"
            onClick={handleReload}
          >
            Завантажити з сервера знову
          </button>
        </>
      )}
    </main>
  );
}

export default App;
