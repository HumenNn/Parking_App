const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, error: "Требуется авторизация" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: "Недействительный токен" });
  }
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  res
    .status(403)
    .json({ success: false, error: "Доступ только для администратора" });
}

module.exports = { authMiddleware, isAdmin };
