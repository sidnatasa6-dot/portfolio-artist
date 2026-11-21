import { Router } from 'express';
import mongoose from 'mongoose';
import Painting from '../models/Painting.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const FIELDS = ['title', 'style', 'year']; // поля, які дозволено змінювати клієнту
const SORT_FIELDS = ['title', 'year', 'createdAt']; // поля, за якими дозволено сортувати

// Беремо з тіла запиту лише дозволені поля, які справді передано
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body?.[f] !== undefined).map((f) => [f, body[f]]));

// Екранує спеціальні символи регулярних виразів у пошуковому запиті
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Middleware 1: перевіряє формат id у шляху
function validateId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ error: 'Некоректний формат id' });
  }
  next();
}

// Middleware 2: знаходить запис і кладе його в req.painting (або повертає 404)
async function findPainting(req, res, next) {
  const painting = await Painting.findById(req.params.id);
  if (!painting) {
    return res.status(404).json({ error: `Картину з id=${req.params.id} не знайдено` });
  }
  req.painting = painting;
  next();
}

// Middleware 3: змінювати запис може лише його власник або адміністратор
function requireOwnerOrAdmin(req, res, next) {
  const isOwner = req.painting.owner?.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Змінювати запис може лише його власник або адміністратор' });
  }
  next();
}

const withPainting = [validateId, findPainting];
const ownPainting = [requireAuth, validateId, findPainting, requireOwnerOrAdmin];

// GET /api/artworks — список: пошук, фільтр, сортування, сторінки
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

// GET /api/artworks/mine — приватний маршрут: записи поточного користувача.
// Має стояти ПЕРЕД '/:id', інакше слово mine буде сприйнято як id
router.get('/mine', requireAuth, async (req, res) => {
  const paintings = await Painting.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json(paintings);
});

// GET /api/artworks/:id — один запис
router.get('/:id', withPainting, (req, res) => {
  res.json(req.painting);
});

// POST /api/artworks — створення
router.post('/', requireAuth, async (req, res) => {
  // Власник береться з токена, а не з тіла запиту
  const painting = await Painting.create({ ...pick(req.body), owner: req.user._id });

  res.status(201).location(`${req.baseUrl}/${painting.id}`).json(painting);
});

// PUT /api/artworks/:id — повна заміна: поля, яких немає в тілі, очищаються
router.put('/:id', ownPainting, async (req, res) => {
  const data = pick(req.body);
  req.painting.set(Object.fromEntries(FIELDS.map((f) => [f, data[f]])));
  await req.painting.save();
  res.json(req.painting);
});

// PATCH /api/artworks/:id — часткове оновлення: змінюються лише передані поля
router.patch('/:id', ownPainting, async (req, res) => {
  const data = pick(req.body);
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: `Передайте хоча б одне з полів: ${FIELDS.join(', ')}` });
  }
  req.painting.set(data);
  await req.painting.save();
  res.json(req.painting);
});

// DELETE /api/artworks/:id — видалення; відповідь без тіла
router.delete('/:id', ownPainting, async (req, res) => {
  await req.painting.deleteOne();
  res.status(204).end();
});

export default router;
