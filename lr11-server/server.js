import express from 'express';
import path from 'node:path';

const app = express();
const PORT = Number(process.env.PORT) || 3008;

// Початкова колекція даних (Варіант № 8 — портфоліо художника)
const paintings = [
  { id: 1, title: 'Осінній світанок над Дніпром', style: 'Імпресіонізм', year: 2023 },
  { id: 2, title: 'Портрет дівчини в синьому', style: 'Реалізм', year: 2024 },
  { id: 3, title: 'Натюрморт із півоніями та керамікою', style: 'Постімпресіонізм', year: 2022 },
  { id: 4, title: 'Туманний ранок у Карпатах', style: 'Пейзаж олією', year: 2025 },
  { id: 5, title: 'Вечірні вогні старого міста', style: 'Акварельний скетч', year: 2024 },
];
let nextId = paintings.length + 1;

// Middleware логування — Тип 4 (ISO-час, метод, URL, статус, мс, IP-адреса)
function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms} мс ${req.ip}`
    );
  });
  next();
}

app.use(logger);
app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, 'public')));

// Отримання списку картин + пошук ?q= за полем title
app.get('/api/paintings', (req, res) => {
  const { q } = req.query;
  if (q) {
    const search = String(q).trim().toLowerCase();
    const result = paintings.filter((p) =>
      p.title.toLowerCase().includes(search)
    );
    return res.json(result);
  }
  res.json(paintings);
});

// Створення нової картини з валідацією полів та їхніх типів
app.post('/api/paintings', (req, res) => {
  const { title, style, year } = req.body ?? {};

  if (
    typeof title !== 'string' ||
    title.trim() === '' ||
    typeof style !== 'string' ||
    style.trim() === ''
  ) {
    return res.status(400).json({
      error: 'Поля title і style є обов’язковими і мають бути непорожніми рядками',
    });
  }

  if (typeof year !== 'number' || !Number.isFinite(year) || year <= 0) {
    return res.status(400).json({
      error: 'Поле year є обов’язковим і має бути додатним числом (тип number)',
    });
  }

  const painting = {
    id: nextId++,
    title: title.trim(),
    style: style.trim(),
    year,
  };
  paintings.push(painting);
  res.status(201).json(painting);
});

// Отримання однієї картини за параметром маршруту :id
app.get('/api/paintings/:id', (req, res) => {
  const id = Number(req.params.id);
  const painting = paintings.find((p) => p.id === id);
  if (!painting) {
    return res
      .status(404)
      .json({ error: `Картину з id=${req.params.id} не знайдено` });
  }
  res.json(painting);
});

// Навмисна помилка для перевірки централізованого обробника (статус 500)
app.get('/api/error', () => {
  throw new Error('Тестова помилка сервера');
});

// Обробка неіснуючих маршрутів (статус 404)
app.use((req, res) => {
  res
    .status(404)
    .json({ error: 'Маршрут не знайдено', path: req.originalUrl });
});

// Централізований обробник помилок (4 параметри — підключається останнім)
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ error: 'Некоректний JSON у тілі запиту' });
  }
  const status = err.status ?? 500;
  res.status(status).json({
    error: status === 500 ? 'Внутрішня помилка сервера' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});
