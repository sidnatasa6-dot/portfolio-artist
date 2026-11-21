import mongoose from 'mongoose';
import Painting from './models/Painting.js';

if (!process.env.MONGODB_URI) {
  console.error('Не задано MONGODB_URI. Запускайте скрипт через: npm run seed');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Підключено до бази: ${mongoose.connection.name}`);

  await Painting.deleteMany({}); // очищаємо колекцію перед повторним наповненням
  const created = await Painting.insertMany([
    { title: 'Осінній світанок над Дніпром', style: 'oil', year: 2023 },
    { title: 'Портрет дівчини в синьому', style: 'watercolor', year: 2024 },
    { title: 'Натюрморт із півоніями та керамікою', style: 'acrylic', year: 2022 },
    { title: 'Туманний ранок у Карпатах', style: 'digital', year: 2025 },
    { title: 'Вечірні вогні старого міста', style: 'sketch', year: 2024 },
  ]);

  console.log(`Додано початкових записів: ${created.length}`);
} catch (err) {
  console.error('Помилка під час наповнення бази даних:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
