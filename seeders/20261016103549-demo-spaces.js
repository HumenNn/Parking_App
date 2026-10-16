'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('ParkingSpaces', [
      {
        number: 'A1',
        isAvailable: true,
        pricePerHour: 5,
        location: 'Первый этаж',
        capacity: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        number: 'A2',
        isAvailable: false,
        pricePerHour: 5,
        location: 'Первый этаж',
        capacity: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        number: 'B1',
        isAvailable: true,
        pricePerHour: 7,
        location: 'Второй этаж',
        capacity: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('ParkingSpaces', null, {});
  }
};