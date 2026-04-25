require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  await User.deleteMany({});

  const users = await User.insertMany([
    {
      name: 'Kenan',
      email: 'kenan@ween.com',
      password: await bcrypt.hash('Kenan2026!', 10),
      role: 'super_admin',
      handle: '@knanqafaro'
    },
    {
      name: 'Umit',
      email: 'umit@ween.com',
      password: await bcrypt.hash('Umit2026!', 10),
      role: 'employee',
      handle: '@umitalizade'
    },
    {
      name: 'Ayhan',
      email: 'ayhan@ween.com',
      password: await bcrypt.hash('Ayhan2026!', 10),
      role: 'employee',
      handle: '@aykhan'
    }
  ]);

  console.log(`✅ Seeded ${users.length} users`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
