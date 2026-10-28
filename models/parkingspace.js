'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ParkingSpace extends Model {
    static associate(models) {
  ParkingSpace.belongsTo(models.User, {
    foreignKey: 'occupiedByUserId',
    as: 'occupant'
  });
}
  }
  ParkingSpace.init({
    floor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    defaultValue: 1
    },
    occupiedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
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