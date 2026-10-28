'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.ParkingSpace, {
        foreignKey: 'occupiedByUserId',
        as: 'occupiedSpaces',
      });
    }
  }

  User.init(
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user',
      },
      name: DataTypes.STRING,           // если есть
      maxSpaces: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
      },
    },
    {
      sequelize,
      modelName: 'User',
    }
  );

  return User;
};