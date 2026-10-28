'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
  User.hasMany(models.ParkingSpace, {
    foreignKey: 'occupiedByUserId',
    as: 'occupiedSpaces'
  });
}
  }
  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'user'
    },
    maxSpaces: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users'
  });
  return User;
};