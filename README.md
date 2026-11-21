# Портфоліо художника (Фінальний fullstack-проєкт)

Fullstack-вебзастосунок для ведення каталогу картин художника: клієнтська частина на React 19 (Vite), REST API на Node.js + Express 5, хмарна база даних MongoDB Atlas (Mongoose 9), автентифікація та авторизація за JWT.

**Працюючий клієнтський застосунок:** https://portfolio-artist.netlify.app
**Сервер REST API:** https://portfolio-artist-api.onrender.com (перевірка стану: https://portfolio-artist-api.onrender.com/health)

> Примітка: сервер працює на безкоштовному тарифному плані Render, тому перший запит після 15 хвилин простою може тривати до 40–60 секунд (cold start).

## Використані технології
React 19 · Vite · Node.js 22 · Express 5 · Mongoose 9 · MongoDB Atlas · JWT · bcrypt · CORS

## Архітектура розгорнутого застосунку
Браузер користувача → Netlify (статичний React SPA з CDN) → Render (Node.js + Express REST API) → MongoDB Atlas (хмарна БД `lr15`)

## Запуск проєкту локально
1. Серверна частина: перейдіть у папку `cd lr11-server`, виконайте `npm install`, створіть файл `.env` за зразком `.env.example`, заповніть базу початковими даними `npm run seed` та запустіть сервер `npm run dev` (порт `3008`).
2. Клієнтська частина: у новому терміналі перейдіть у папку `cd client`, виконайте `npm install` та запустіть клієнт `npm run dev` (відкриється http://localhost:5173).

## Змінні середовища

| Змінна | Де зберігається | Призначення |
| :--- | :--- | :--- |
| `MONGODB_URI` | Сервер (Render) | Рядок підключення до кластера MongoDB Atlas (секрет) |
| `JWT_SECRET` | Сервер (Render) | Ключ підпису JWT-токенів довжиною не менше 32 символів (секрет) |
| `CLIENT_ORIGIN` | Сервер (Render) | Дозволений origin клієнтського застосунку для CORS |
| `NODE_ENV` | Сервер (Render) | Режим середовища (`production`) |
| `VITE_API_URL` | Клієнт (Netlify) | Публічна адреса сервера API (вшивається у клієнт під час збірки) |

## Документація REST API
Специфікацію всіх маршрутів (`/api/auth/...` та `/api/paintings/...`), параметрів фільтрації (`style`), сортування (`sort`) та кодів відповідей наведено у файлі `lr11-server/README.md`.

## Демонстраційні облікові записи (створюються скриптом seed.js)
* Звичайний користувач: `alice@example.com` / пароль: `Passw0rd!`
* Адміністратор: `admin@example.com` / пароль: `Passw0rd!`

## Автор
Сідько Наталія, група СОІ-24-1, варіант № 8 (`portfolio-artist`)
