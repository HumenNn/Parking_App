'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ParkingSpace extends Model {
    static associate(models) {
      ParkingSpace.belongsTo(models.User, {
        foreignKey: 'occupiedByUserId',
        as: 'occupant',
      });
    }
  }

  ParkingSpace.init(
    {
      number: DataTypes.STRING,
      isAvailable: DataTypes.BOOLEAN,
      pricePerHour: DataTypes.INTEGER,
      capacity: DataTypes.INTEGER,
      floor: DataTypes.INTEGER,
      occupiedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ParkingSpace',
    }
  );

  return ParkingSpace;
};