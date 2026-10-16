const simulateAuth = (req, res, next) => {
  if (req.query.auth === "1") {
    req.user = { name: "Гость" };
    next();
  } else {
    res.redirect("/login");
  }
};

module.exports = simulateAuth;
