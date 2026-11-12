const mongoose = require('mongoose');
const toJSON = require('./toJSON');

const historySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    startTime: { type: Date, required: true },
    endTime: Date,
    hours: Number,
    totalPrice: Number,
  },
  { _id: true }
);

const occupiedBySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: String,
    since: { type: Date, default: Date.now },
  },
  { _id: false }
);

const parkingSpaceSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    floor: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
      default: 1,
    },
    pricePerHour: {
      type: Number,
      required: true,
      min: 1,
    },
    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    occupiedBy: {
      type: occupiedBySchema,
      default: null,
    },
    history: [historySchema],
  },
  {
    timestamps: true,
    toJSON,
  }
);

parkingSpaceSchema.index({ number: 1, floor: 1 }, { unique: true });
parkingSpaceSchema.index({ tags: 1 });
parkingSpaceSchema.index({ isAvailable: 1 });
parkingSpaceSchema.index({ 'occupiedBy.userId': 1 });

module.exports = mongoose.model('ParkingSpace', parkingSpaceSchema);