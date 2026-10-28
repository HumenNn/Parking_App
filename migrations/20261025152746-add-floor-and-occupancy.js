'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ParkingSpaces', 'floor', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await queryInterface.addColumn('ParkingSpaces', 'occupiedByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('Users', 'maxSpaces', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('ParkingSpaces', 'floor');
    await queryInterface.removeColumn('ParkingSpaces', 'occupiedByUserId');
    await queryInterface.removeColumn('Users', 'maxSpaces');
  }
};