'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const hashAdmin = await bcrypt.hash('admin123', 10);
    const hashUser = await bcrypt.hash('user123', 10);
    await queryInterface.bulkInsert('Users', [
      {
        email: 'admin@parking.local',
        passwordHash: hashAdmin,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'user@parking.local',
        passwordHash: hashUser,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', {
      email: ['admin@parking.local', 'user@parking.local']
    });
  }
};