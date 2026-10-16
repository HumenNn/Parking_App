require('dotenv').config();
const express = require('express');
const path = require('path');
const { ParkingSpace } = require('./models');
const logger = require('./middleware/logger');
const simulateAuth = require('./middleware/simulateAuth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

app.get('/', async (req, res, next) => {
  try {
    const spaces = await ParkingSpace.findAll({ order: [['id', 'ASC']] });
    res.render('index', { spaces });
  } catch (err) {
    next(err);
  }
});

app.get('/item/:id', async (req, res, next) => {
  try {
    const space = await ParkingSpace.findByPk(req.params.id);
    if (!space) {
      return res.status(404).render('404');
    }
    res.render('item', { space });
  } catch (err) {
    next(err);
  }
});

app.get('/add', simulateAuth, (req, res) => {
  res.render('add', { error: null, form: {} });
});

app.post('/add', simulateAuth, async (req, res, next) => {
  try {
    const number = (req.body.number || '').trim();
    const pricePerHour = parseFloat(String(req.body.pricePerHour).replace(',', '.'));
    const location = (req.body.location || '').trim();

    if (!number) {
      return res.render('add', {
        error: 'Номер места не может быть пустым',
        form: req.body
      });
    }
    if (isNaN(pricePerHour) || pricePerHour < 0) {
      return res.render('add', {
        error: 'Цена должна быть числом не меньше 0',
        form: req.body
      });
    }

    await ParkingSpace.create({
      number,
      pricePerHour,
      location: location || 'Не указано',
      isAvailable: true,
      capacity: 1
    });
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/spaces', async (req, res) => {
  try {
    const spaces = await ParkingSpace.findAll();
    res.json(spaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/spaces/:id', async (req, res) => {
  try {
    const space = await ParkingSpace.findByPk(parseInt(req.params.id));
    if (!space) {
      return res.status(404).json({ error: 'Место с таким ID не существует' });
    }
    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/spaces', async (req, res) => {
  try {
    const { number, isAvailable, pricePerHour, location, capacity } = req.body;
    if (!number || pricePerHour === undefined) {
      return res.status(400).json({ error: 'Необходимо указать number и pricePerHour' });
    }
    const newSpace = await ParkingSpace.create({
      number,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      pricePerHour,
      location: location || 'Не указано',
      capacity: capacity !== undefined ? capacity : 1
    });
    res.status(201).json(newSpace);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/spaces/:id', async (req, res) => {
  try {
    const space = await ParkingSpace.findByPk(parseInt(req.params.id));
    if (!space) {
      return res.status(404).json({ error: 'Место не найдено' });
    }
    const { number, isAvailable, pricePerHour, location, capacity } = req.body;
    await space.update({
      number: number !== undefined ? number : space.number,
      isAvailable: isAvailable !== undefined ? isAvailable : space.isAvailable,
      pricePerHour: pricePerHour !== undefined ? pricePerHour : space.pricePerHour,
      location: location !== undefined ? location : space.location,
      capacity: capacity !== undefined ? capacity : space.capacity
    });
    res.json(space);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/spaces/:id', async (req, res) => {
  try {
    const space = await ParkingSpace.findByPk(parseInt(req.params.id));
    if (!space) {
      return res.status(404).json({ error: 'Место не найдено' });
    }
    await space.destroy();
    res.status(204).send();
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