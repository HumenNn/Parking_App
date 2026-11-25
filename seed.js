require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const User = require('./models/user');
const ParkingSpace = require('./models/parkingspace');

async function seed() {
  await connectDB();

  await User.deleteMany({});
  await ParkingSpace.deleteMany({});

  const adminHash = await bcrypt.hash('Admin123!', 10);
  const userHash = await bcrypt.hash('User123!', 10);

  await User.create({
    email: 'admin@parking.local',
    passwordHash: adminHash,
    role: 'admin',
    maxSpaces: 10,
    profile: { name: 'Админ', phone: '+375291112233' },
  });

  await User.create({
    email: 'user@parking.local',
    passwordHash: userHash,
    role: 'user',
    maxSpaces: 2,
    profile: { name: 'Иван', phone: '+375297776655' },
  });

  const spaces = [];
  for (let floor = 1; floor <= 3; floor++) {
    for (let n = 1; n <= 6; n++) {
      spaces.push({
        number: String(n).padStart(2, '0'),
        floor,
        pricePerHour: 5 + floor,
        capacity: 1,
        isAvailable: true,
        tags: floor === 1 ? ['covered'] : floor === 2 ? ['ev-charger'] : ['open'],
        history: [],
      });
    }
  }

  await ParkingSpace.insertMany(spaces);

  console.log('Seed done');
  console.log('admin@parking.local / Admin123!');
  console.log('user@parking.local / User123!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});