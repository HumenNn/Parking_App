require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { ParkingSpace, User } = require('./models');
const logger = require('./middleware/logger');
const { requireAuth, requireAdmin, attachUser } = require('./middleware/auth');
const { Op } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'parking-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));
app.use(logger);
app.use(attachUser);

app.get('/', async (req, res, next) => {
  try {
    const filter = ['all', 'free', 'busy'].includes(req.query.filter)
      ? req.query.filter
      : 'all';
    const sort = ['id', 'number', 'price', 'created'].includes(req.query.sort)
      ? req.query.sort
      : 'id';
    const view = req.query.view === 'map' ? 'map' : 'list';
    const groupBy = ['zone', 'floor', 'floor-zone'].includes(req.query.group)
      ? req.query.group
      : 'zone';

    let order;
    if (sort === 'number') order = [['number', 'ASC']];
    else if (sort === 'price') order = [['pricePerHour', 'ASC']];
    else if (sort === 'created') order = [['createdAt', 'DESC']];
    else order = [['floor', 'ASC'], ['number', 'ASC']];

    let spaces = await ParkingSpace.findAll({
      order,
      include: [{
        model: User,
        as: 'occupant',
        attributes: ['id', 'email', 'name'],
        required: false
      }]
    });

    if (filter === 'free') {
      spaces = spaces.filter((s) => s.occupiedByUserId == null);
    }
    if (filter === 'busy') {
      spaces = spaces.filter((s) => s.occupiedByUserId != null);
    }

        function zoneOf(number) {
      const m = String(number).match(/^[A-Za-zА-Яа-яЁё]+/);
      return m ? m[0].toUpperCase() : '?';
    }

    const groups = {};
    spaces.forEach((s) => {
      const zone = zoneOf(s.number);
      let key;
      if (groupBy === 'floor') key = 'Этаж ' + s.floor;
      else if (groupBy === 'floor-zone') key = 'Этаж ' + s.floor + ' · зона ' + zone;
      else key = 'Зона ' + zone;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    const floorsMap = {};
    spaces.forEach((s) => {
      const fl = s.floor;
      const zone = zoneOf(s.number);
      if (!floorsMap[fl]) floorsMap[fl] = {};
      if (!floorsMap[fl][zone]) floorsMap[fl][zone] = [];
      floorsMap[fl][zone].push(s);
    });
    const floorKeys = Object.keys(floorsMap)
      .map(Number)
      .sort((a, b) => a - b);

    let myOccupiedCount = 0;
    let myMaxSpaces = 2;
    if (req.session.user) {
      myOccupiedCount = await ParkingSpace.count({
        where: { occupiedByUserId: req.session.user.id }
      });
      const dbUser = await User.findByPk(req.session.user.id);
      if (dbUser) myMaxSpaces = dbUser.maxSpaces;
    }

    res.render('index', {
      spaces,
      floorsMap,
      floorKeys,
      groups,
      filter,
      sort,
      view,
      groupBy,
      error: req.query.error || null,
      myOccupiedCount,
      myMaxSpaces
    });
  } catch (err) {
    next(err);
  }
});

app.get('/item/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).render('404');
    }
    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).render('404');
    }
    res.render('item', { space });
  } catch (err) {
    next(err);
  }
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

app.post('/login', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.render('login', { error: 'Неверный email или пароль' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.render('login', { error: 'Неверный email или пароль' });
    }
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || null
    };
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

app.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('register', { error: null });
});

app.post('/register', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    if (!email || !password) {
      return res.render('register', { error: 'Заполните email и пароль' });
    }
    if (password.length < 6 || password.length > 64) {
      return res.render('register', { error: 'Пароль: от 6 до 64 символов' });
    }
    if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.render('register', { error: 'Некорректный email' });
    }
    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.render('register', { error: 'Такой email уже зарегистрирован' });
    }
    const name = (req.body.name || '').trim();
    if (name.length > 50) {
      return res.render('register', { error: 'Имя: максимум 50 символов' });
}
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      passwordHash: hash,
      role: 'user',
      name: name || null
    });
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || null
    };
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/add', requireAuth, requireAdmin, (req, res) => {
  res.render('add', { error: null, form: {} });
});

app.post('/add', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const number = (req.body.number || '').trim();
    const priceRaw = String(req.body.pricePerHour || '').trim().replace(',', '.');

    if (!number || number.length > 20) {
      return res.render('add', {
        error: 'Номер места: от 1 до 20 символов',
        form: req.body
      });
    }
    if (!/^[A-Za-zА-Яа-яЁё0-9\-]+$/.test(number)) {
      return res.render('add', {
        error: 'Номер: только буквы, цифры и дефис',
        form: req.body
      });
    }
    if (!/^\d+(\.\d{1,2})?$/.test(priceRaw)) {
      return res.render('add', {
        error: 'Цена: число, не больше 2 знаков после запятой',
        form: req.body
      });
    }

    const floor = parseInt(req.body.floor, 10);
    if (!Number.isInteger(floor) || floor < 1 || floor > 50) {
      return res.render('add', {
        error: 'Укажите этаж: целое число от 1 до 50',
        form: req.body
      });
    }

    const pricePerHour = Number(priceRaw);
    if (!Number.isFinite(pricePerHour) || pricePerHour < 0 || pricePerHour > 100) {
      return res.render('add', {
        error: 'Цена от 0 до 100 BYN/час',
        form: req.body
      });
    }

    const dup = await ParkingSpace.findOne({
  where: { number, floor }
});
if (dup) {
  return res.render('add', {
    error: 'На этом этаже место с таким номером уже есть',
    form: req.body
  });
}

    await ParkingSpace.create({
      number,
      pricePerHour: Math.round(pricePerHour * 100) / 100,
      capacity: 1,
      floor,
      occupiedByUserId: null,
      isAvailable: true
    });
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

app.post('/spaces/:id/delete', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).render('404');
    }
    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).render('404');
    }
    await space.destroy();
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

app.post('/spaces/:id/toggle', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).render('404');
    }

    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).render('404');
    }

    const me = req.session.user;
    const isAdmin = me.role === 'admin';
    const occupiedBy = space.occupiedByUserId;

    if (occupiedBy == null) {
      if (!isAdmin) {
        const myCount = await ParkingSpace.count({
          where: { occupiedByUserId: me.id }
        });
        const dbUser = await User.findByPk(me.id);
        const limit = dbUser.maxSpaces != null ? dbUser.maxSpaces : 2;
        if (myCount >= limit) {
          return res.redirect('/?error=' + encodeURIComponent(
            'Лимит мест: не больше ' + limit
          ));
        }
      }
      await space.update({
        occupiedByUserId: me.id,
        isAvailable: false
      });
    } else if (occupiedBy === me.id || isAdmin) {
      await space.update({
        occupiedByUserId: null,
        isAvailable: true
      });
    } else {
      return res.redirect('/?error=' + encodeURIComponent(
        'Чужое место может освободить только администратор'
      ));
    }

    const view = req.body.view === 'map' ? 'map' : 'list';
    const filter = req.body.filter || 'all';
    const sort = req.body.sort || 'id';
    const group = req.body.group || 'zone';
    res.redirect('/?view=' + view + '&filter=' + filter + '&sort=' + sort + '&group=' + group);
  } catch (err) {
    next(err);
  }
});

app.get('/admin/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'role', 'maxSpaces', 'createdAt', 'name'],
      order: [['id', 'ASC']]
    });
    const error = req.query.error || null;
    res.render('admin-users', { users, error });
  } catch (err) {
    next(err);
  }
});

app.post('/admin/users/:id/name', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const name = (req.body.name || '').trim();
    if (!Number.isInteger(id) || id < 1) return res.status(404).render('404');
    if (name.length > 50) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Имя: максимум 50'));
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).render('404');
    await user.update({ name: name || null });
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

app.get('/spaces/:id/edit', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).render('404');
    }
    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).render('404');
    }
    res.render('edit-space', { space, error: null });
  } catch (err) {
    next(err);
  }
});

app.post('/spaces/:id/edit', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).render('404');
    }

    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).render('404');
    }

    const number = (req.body.number || '').trim();
    const priceRaw = String(req.body.pricePerHour || '').trim().replace(',', '.');
    const floor = parseInt(req.body.floor, 10);

    const formSpace = Object.assign({}, space.get({ plain: true }), {
      number: number,
      pricePerHour: priceRaw,
      floor: floor
    });

    if (!number || number.length > 20 || !/^[A-Za-zА-Яа-яЁё0-9\-]+$/.test(number)) {
      return res.render('edit-space', { space: formSpace, error: 'Некорректный номер места' });
    }
    if (!/^\d+(\.\d{1,2})?$/.test(priceRaw)) {
      return res.render('edit-space', { space: formSpace, error: 'Цена: до 2 знаков после запятой' });
    }
    const pricePerHour = Number(priceRaw);
    if (!Number.isFinite(pricePerHour) || pricePerHour < 0 || pricePerHour > 100) {
      return res.render('edit-space', { space: formSpace, error: 'Цена от 0 до 100' });
    }
    if (!Number.isInteger(floor) || floor < 1 || floor > 50) {
      return res.render('edit-space', { space: formSpace, error: 'Этаж: от 1 до 50' });
    }

    const dup = await ParkingSpace.findOne({
  where: {
    number: number,
    floor: floor,
    id: { [Op.ne]: space.id }
  }
});
if (dup) {
  return res.render('edit-space', {
    space: formSpace,
    error: 'На этом этаже место с таким номером уже есть'
  });
}

    await space.update({
      number: number,
      pricePerHour: Math.round(pricePerHour * 100) / 100,
      floor: floor
    });
    res.redirect('/item/' + space.id);
  } catch (err) {
    next(err);
  }
});

app.post('/admin/users/:id/make-admin', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).render('404');
    }
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).render('404');
    }
    await user.update({ role: 'admin' });
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/users/:id/make-user', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).render('404');
    }
    if (id === req.session.user.id) {
      return res.redirect('/admin/users');
    }
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).render('404');
    }
    await user.update({ role: 'user' });
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/users/create', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const role = req.body.role === 'admin' ? 'admin' : 'user';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Некорректный email'));
    }
    if (password.length < 6 || password.length > 64) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Пароль: от 6 до 64 символов'));
    }
    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Email уже занят'));
    }

    const hash = await bcrypt.hash(password, 10);
    const name = (req.body.name || '').trim();
    if (name.length > 50) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Имя: максимум 50'));
    }
    await User.create({
      email,
      passwordHash: hash,
      role,
      name: name || null,
      maxSpaces: 2
    });
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/users/:id/delete', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).render('404');
    }
    if (id === req.session.user.id) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Нельзя удалить себя'));
    }
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).render('404');
    }
    await user.destroy();
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/users/:id/max-spaces', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const maxSpaces = parseInt(req.body.maxSpaces, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).render('404');
    }
    if (!Number.isInteger(maxSpaces) || maxSpaces < 0 || maxSpaces > 20) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Лимит: 0–20'));
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).render('404');
    await user.update({ maxSpaces });
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
});

app.get('/spaces', async (req, res) => {
  try {
    const spaces = await ParkingSpace.findAll();
    res.json(spaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).render('404');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500');
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});