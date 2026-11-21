import { Router } from 'express';
import mongoose from 'mongoose';
import Painting from '../models/Painting.js';

const router = Router();

// Білий список полів, які клієнту дозволено передавати у POST, PUT, PATCH
const FIELDS = ['title', 'style', 'year'];
// Білий список полів, за якими клієнту дозволено сортувати список
const SORT_FIELDS = ['title', 'year', 'createdAt'];

// Беремо з тіла запиту лише дозволені поля, які справді передано (захист від Mass Assignment)
const pick = (body) =>
  Object.fromEntries(FIELDS.filter((f) => body?.[f] !== undefined).map((f) => [f, body[f]]));

// Екранує спеціальні символи регулярних виразів у пошуковому запиті ?q=
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Middleware 1: перевіряє формат ObjectId (24 шістнадцяткові символи) у шляху /:id
function validateId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ error: 'Некоректний формат id' });
  }
  next();
}

// Middleware 2: знаходить документ у базі й зберігає його в req.painting (або повертає 404)
async function findPainting(req, res, next) {
  const painting = await Painting.findById(req.params.id);
  if (!painting) {
    return res.status(404).json({ error: `Запис з id=${req.params.id} не знайдено` });
  }
  req.painting = painting;
  next();
}

const withPainting = [validateId, findPainting];

// GET /api/paintings – список: пошук ?q=, фільтр ?style=, сортування ?sort=, пагінація ?page=&limit=
router.get('/', async (req, res) => {
  const { q, style, sort = '-createdAt' } = req.query;
  const page = Math.max(Number.parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit) || 10, 1), 100);

  const sortName = String(sort);
  const sortField = sortName.replace(/^-/, '');
  if (!SORT_FIELDS.includes(sortField)) {
    return res.status(400).json({ error: `sort: допустимі поля ${SORT_FIELDS.join(', ')}` });
  }

  const filter = {};
  if (q) filter.title = { $regex: escapeRegex(String(q)), $options: 'i' };
  if (style) filter.style = String(style);

  const [items, total] = await Promise.all([
    Painting.find(filter)
      .sort({ [sortField]: sortName.startsWith('-') ? -1 : 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Painting.countDocuments(filter),
  ]);

  res.set('X-Total-Count', String(total));
  res.json(items);
});

// GET /api/paintings/:id – отримання одного запису
router.get('/:id', withPainting, (req, res) => {
  res.json(req.painting);
});

// POST /api/paintings – створення нового запису
router.post('/', async (req, res) => {
  const painting = await Painting.create(pick(req.body));
  res.status(201).location(`${req.baseUrl}/${painting.id}`).json(painting);
});

// PUT /api/paintings/:id – повна заміна: необов'язкові поля, яких немає в тілі, очищаються
router.put('/:id', withPainting, async (req, res) => {
  const data = pick(req.body);
  req.painting.set(Object.fromEntries(FIELDS.map((f) => [f, data[f]])));
  await req.painting.save();
  res.json(req.painting);
});

// PATCH /api/paintings/:id – часткове оновлення: змінюються лише передані поля
router.patch('/:id', withPainting, async (req, res) => {
  const data = pick(req.body);
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: `Передайте хоча б одне з полів: ${FIELDS.join(', ')}` });
  }
  req.painting.set(data);
  await req.painting.save();
  res.json(req.painting);
});

// DELETE /api/paintings/:id – видалення; відповідь 204 без тіла
router.delete('/:id', withPainting, async (req, res) => {
  await req.painting.deleteOne();
  res.status(204).end();
});

export default router;
