import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import Painting from './models/Painting.js';

const PORT = process.env.PORT ?? 3008;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Не задано MONGODB_URI. Створіть файл .env за зразком .env.example');
  process.exit(1);
}

const app = express();

// Middleware логування (за потреби замініть на ваш формат логера з ЛР № 11)
function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms} мс`);
  });
  next();
}

app.use(logger);
app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, 'public')));

// Екранує спеціальні символи регулярних виразів у пошуковому запиті
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Список записів із пошуком (?q=) за полем title та обмеженням кількості (?limit=)
app.get('/api/paintings', async (req, res) => {
  const { q, limit } = req.query;
  const filter = q ? { title: { $regex: escapeRegex(String(q)), $options: 'i' } } : {};
  const max = Math.min(Number(limit) || 50, 100);
  const paintings = await Painting.find(filter).sort({ createdAt: -1 }).limit(max);
  res.json(paintings);
});

// Отримання одного запису за ідентифікатором ObjectId
app.get('/api/paintings/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Некоректний формат id' });
  }
  const painting = await Painting.findById(id);
  if (!painting) {
    return res.status(404).json({ error: `Картину з id=${id} не знайдено` });
  }
  res.json(painting);
});

// Створення нового запису; у модель передаємо лише дозволені схемою поля
app.post('/api/paintings', async (req, res) => {
  const { title, style, year } = req.body ?? {};
  const painting = await Painting.create({ title, style, year });
  res.status(201).json(painting);
});

// Навмисна помилка для перевірки централізованого обробника помилок (500)
app.get('/api/error', () => {
  throw new Error('Тестова помилка');
});

// Обробник 404: жоден маршрут вище не підійшов
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено', path: req.originalUrl });
});

// Централізований обробник помилок (чотири параметри) – завжди підключається останнім
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некоректний JSON у тілі запиту' });
  }
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Дані не пройшли перевірку', details });
  }
  const status = err.status ?? 500;
  res.status(status).json({ error: status === 500 ? 'Внутрішня помилка сервера' : err.message });
});

// Спочатку встановлюємо з'єднання з базою даних, і лише потім запускаємо сервер
try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log(`Підключено до MongoDB, база даних: ${mongoose.connection.name}`);
} catch (err) {
  console.error('Не вдалося підключитися до MongoDB:', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});
