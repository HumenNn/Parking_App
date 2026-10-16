'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ParkingSpace extends Model {
    static associate(models) {}
  }
  ParkingSpace.init({
    number: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    pricePerHour: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING,
      defaultValue: 'Не указано'
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    sequelize,
    modelName: 'ParkingSpace',
    tableName: 'ParkingSpaces'
  });
  return ParkingSpace;
};