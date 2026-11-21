import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import authRouter from './routes/auth.js';
import paintingsRouter from './routes/paintings.js';
import { logger } from './middleware/logger.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const PORT = process.env.PORT ?? 3008;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI) {
  console.error('Не задано MONGODB_URI. Створіть файл .env за зразком .env.example');
  process.exit(1);
}

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('Не задано JWT_SECRET у файлі .env (потрібно щонайменше 32 символи)');
  process.exit(1);
}

const app = express();

app.use(logger);
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(import.meta.dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api/paintings', paintingsRouter);

app.get('/api/error', () => {
  throw new Error('Тестова помилка');
});

app.use(notFound);
app.use(errorHandler);

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
