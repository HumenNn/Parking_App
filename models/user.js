const mongoose = require('mongoose');
const toJSON = require('./toJSON');

const profileSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80 },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email обязателен'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Некорректный email'],
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    maxSpaces: {
      type: Number,
      default: 2,
      min: 0,
      max: 50,
    },
    profile: {
      type: profileSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: {
      ...toJSON,
      transform(doc, ret) {
        const { passwordHash, ...rest } = toJSON.transform(doc, ret);
        return rest;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);