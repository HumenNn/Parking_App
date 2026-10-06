function logger(req, res, next) {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`  → ${res.statusCode} (${duration} мс)`);
  });

  next();
}

function attachUser(req, res, next) {
  req.user = { name: req.cookies.username || 'Гость' };
  next();
}

function requireAuth(req, res, next) {
  if (req.user && req.user.name && req.user.name !== 'Гость') {
    return next();
  }
  res.redirect('/login');
}

function notFound(req, res, next) {
  res.status(404).render('404', { title: '404', user: req.user });
}

function errorHandler(err, req, res, next) {
  console.error('Ошибка:', err.message);
  res.status(500).render('500', { title: '500', user: req.user });
}

module.exports = { logger, attachUser, requireAuth, notFound, errorHandler };