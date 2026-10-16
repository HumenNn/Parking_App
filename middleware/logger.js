const { Log } = require("../models");

const logger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", async () => {
    try {
      await Log.create({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: Date.now() - start,
      });
    } catch (err) {
      console.error("Ошибка записи лога:", err.message);
    }
  });
  next();
};

module.exports = logger;
