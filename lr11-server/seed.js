import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/User.js';
import Painting from './models/Painting.js';

if (!process.env.MONGODB_URI) {
  console.error('Не задано MONGODB_URI. Запускайте скрипт через: npm run seed');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Підключено до бази: ${mongoose.connection.name}`);

  // Очищаємо обидві колекції та синхронізуємо унікальні індекси
  await Painting.deleteMany({});
  await User.deleteMany({});
  await User.syncIndexes();
  await Painting.syncIndexes();

  const PASSWORD = 'Passw0rd!';
  const hashPassword = () => bcrypt.hash(PASSWORD, 10);
  const [admin, alice, bob] = await User.insertMany([
    { name: 'Адміністратор', email: 'admin@example.com', passwordHash: await hashPassword(), role: 'admin' },
    { name: 'Аліса', email: 'alice@example.com', passwordHash: await hashPassword() },
    { name: 'Богдан', email: 'bob@example.com', passwordHash: await hashPassword() },
  ]);

  const created = await Painting.insertMany([
    { title: 'Осінній світанок над Дніпром', style: 'oil', year: 2023, owner: alice._id },
    { title: 'Портрет дівчини в синьому', style: 'watercolor', year: 2024, owner: alice._id },
    { title: 'Натюрморт із півоніями та керамікою', style: 'acrylic', year: 2022, owner: bob._id },
    { title: 'Туманний ранок у Карпатах', style: 'digital', year: 2025, owner: bob._id },
    { title: 'Вечірні вогні старого міста', style: 'sketch', year: 2024, owner: admin._id },
  ]);

  console.log(`Додано користувачів: 3, записів: ${created.length}`);
  console.log(`Для входу використовуйте пароль ${PASSWORD} (admin@example.com, alice@example.com, bob@example.com)`);
} catch (err) {
  console.error('Помилка під час наповнення бази даних:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
