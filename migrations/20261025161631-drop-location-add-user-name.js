'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ParkingSpaces', 'location');
    await queryInterface.addColumn('Users', 'name', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('ParkingSpaces', 'location', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.removeColumn('Users', 'name');
  }
};