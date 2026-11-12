const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('Не задана переменная окружения MONGO_URI');
  }
  await mongoose.connect(process.env.MONGO_URI);
  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host}/${name}`);
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

module.exports = connectDB;