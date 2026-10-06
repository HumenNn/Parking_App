const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const { logger, attachUser, requireAuth, notFound, errorHandler } = require('./middleware/appMiddleware');

const app = express();
const PORT = 3000;

// --- Настройка шаблонизатора EJS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Встроенные middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// --- Кастомные middleware ---
app.use(logger);
app.use(attachUser);

// --- Данные (массив в памяти) ---
let spaces = [
  { id: 1, number: 'A1', isAvailable: true, pricePerHour: 5, location: 'Первый этаж' },
  { id: 2, number: 'A2', isAvailable: false, pricePerHour: 5, location: 'Первый этаж' },
  { id: 3, number: 'B1', isAvailable: true, pricePerHour: 7, location: 'Второй этаж' }
];
let nextId = 4;

// --- Маршруты ---

// Главная — список мест
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Список парковочных мест',
    spaces: spaces,
    user: req.user
  });
});

// Детальная страница места
app.get('/item/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const space = spaces.find(s => s.id === id);
  if (!space) {
    return res.status(404).render('404', { title: '404', user: req.user });
  }
  res.render('item', {
    title: `Место ${space.number}`,
    space: space,
    user: req.user
  });
});

// Форма добавления (защищена middleware requireAuth)
app.get('/add', requireAuth, (req, res) => {
  res.render('add', { title: 'Добавить место', user: req.user });
});

// Обработка формы добавления
app.post('/add', requireAuth, (req, res) => {
  const { number, pricePerHour, location, isAvailable } = req.body;
  if (!number || !pricePerHour) {
    return res.status(400).send('Необходимо указать номер и цену за час');
  }
  const newSpace = {
    id: nextId++,
    number: number.trim(),
    pricePerHour: parseInt(pricePerHour),
    location: (location || 'Не указано').trim(),
    isAvailable: isAvailable === 'on'
  };
  spaces.push(newSpace);
  res.redirect('/');
});

// Страница входа
app.get('/login', (req, res) => {
  res.render('login', { title: 'Вход', user: req.user });
});

// Обработка входа
app.post('/login', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.redirect('/login');
  }
  res.cookie('username', name.trim(), { maxAge: 3600 * 1000, httpOnly: true });
  res.redirect('/');
});

// Выход
app.get('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/');
});

// --- Обработка 404 и 500 ---
app.use(notFound);
app.use(errorHandler);

// --- Запуск сервера ---
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});