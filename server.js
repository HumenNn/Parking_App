const express = require('express');
const { ParkingSpace } = require('./models');

const app = express();
app.use(express.json());

const PORT = 3000;

app.get('/', async (req, res) => {
  try {
    const spaces = await ParkingSpace.findAll();
    res.json(spaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ error: 'Место с таким ID не существует' });
    }
    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/', async (req, res) => {
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

app.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { number, isAvailable, pricePerHour, location, capacity } = req.body;
    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ error: 'Место не найдено' });
    }
    if (!number || pricePerHour === undefined) {
      return res.status(400).json({ error: 'Необходимо указать number и pricePerHour' });
    }
    await space.update({
      number,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      pricePerHour,
      location: location || 'Не указано',
      capacity: capacity !== undefined ? capacity : 1
    });
    res.json(space);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const space = await ParkingSpace.findByPk(id);
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
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});