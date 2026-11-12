const express = require('express');
const mongoose = require('mongoose');
const ParkingSpace = require('../models/ParkingSpace');
const User = require('../models/User');
const { authMiddleware, isAdmin } = require('../middleware/auth');

const router = express.Router();
const MAX_LIMIT = 100;

router.get('/', async (req, res) => {
  try {
    const { search, available, sort, limit, offset, tag } = req.query;

    let pageLimit;
    if (limit !== undefined) {
      pageLimit = Number(limit);
      if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > MAX_LIMIT) {
        return res.status(400).json({ error: `limit должен быть от 1 до ${MAX_LIMIT}` });
      }
    }

    let pageOffset = 0;
    if (offset !== undefined) {
      pageOffset = Number(offset);
      if (!Number.isInteger(pageOffset) || pageOffset < 0) {
        return res.status(400).json({ error: 'offset должен быть >= 0' });
      }
    }

    const filter = {};
    if (search && typeof search === 'string' && search.trim()) {
      filter.number = { $regex: search.trim(), $options: 'i' };
    }
    if (available === 'true') filter.isAvailable = true;
    if (available === 'false') filter.isAvailable = false;
    if (tag) filter.tags = tag.toLowerCase();

    const sortMap = {
      id: { _id: 1 },
      number: { floor: 1, number: 1 },
      price: { pricePerHour: 1, floor: 1, number: 1 },
    };
    const sortOpt = sortMap[sort] || sortMap.id;

    const query = ParkingSpace.find(filter).sort(sortOpt).skip(pageOffset);
    if (pageLimit) query.limit(pageLimit);

    const [rows, total] = await Promise.all([
      query.lean(),
      ParkingSpace.countDocuments(filter),
    ]);

    const data = rows.map((doc) => {
      const { _id, ...rest } = doc;
      return { id: _id, ...rest };
    });

    res.json({
      data,
      meta: {
        total,
        limit: pageLimit ?? null,
        offset: pageOffset,
        hasMore: pageOffset + data.length < total,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [total, available] = await Promise.all([
      ParkingSpace.countDocuments(),
      ParkingSpace.countDocuments({ isAvailable: true }),
    ]);
    res.json({ total, available, occupied: total - available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Некорректный ID' });
    }
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ error: 'Место не найдено' });
    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { number, isAvailable, pricePerHour, capacity, floor, tags } = req.body;

    if (!number || pricePerHour === undefined) {
      return res.status(400).json({ error: 'Нужны number и pricePerHour' });
    }

    const space = await ParkingSpace.create({
      number: String(number).trim(),
      pricePerHour,
      capacity: capacity ?? 1,
      floor: floor ?? 1,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      tags: Array.isArray(tags) ? tags : [],
    });

    res.status(201).json(space);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Место с таким номером на этаже уже существует' });
    }
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const update = {};
    if (req.body.number !== undefined) update.number = String(req.body.number).trim();
    if (req.body.pricePerHour !== undefined) update.pricePerHour = req.body.pricePerHour;
    if (req.body.capacity !== undefined) update.capacity = req.body.capacity;
    if (req.body.floor !== undefined) update.floor = req.body.floor;
    if (req.body.isAvailable !== undefined) update.isAvailable = req.body.isAvailable;
    if (req.body.tags !== undefined) update.tags = req.body.tags;

    const space = await ParkingSpace.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!space) return res.status(404).json({ error: 'Место не найдено' });
    res.json(space);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const space = await ParkingSpace.findByIdAndDelete(req.params.id);
    if (!space) return res.status(404).json({ error: 'Место не найдено' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/occupy', authMiddleware, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ error: 'Место не найдено' });
    if (!space.isAvailable || space.occupiedBy) {
      return res.status(400).json({ error: 'Место уже занято' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const myCount = await ParkingSpace.countDocuments({
      'occupiedBy.userId': req.user.id,
    });
    if (myCount >= user.maxSpaces) {
      return res.status(400).json({
        error: `Лимит мест: не больше ${user.maxSpaces}`,
      });
    }

    space.isAvailable = false;
    space.occupiedBy = {
      userId: user._id,
      email: user.email,
      since: new Date(),
    };
    await space.save();

    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/release', authMiddleware, async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id);
    if (!space) return res.status(404).json({ error: 'Место не найдено' });

    const isOwner =
      space.occupiedBy &&
      space.occupiedBy.userId.toString() === req.user.id;
    const isAdminUser = req.user.role === 'admin';

    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ error: 'Можно освободить только своё место' });
    }

    if (space.occupiedBy) {
      const start = space.occupiedBy.since;
      const end = new Date();
      const hours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
      const totalPrice = hours * space.pricePerHour;

      space.history.push({
        userId: space.occupiedBy.userId,
        email: space.occupiedBy.email,
        startTime: start,
        endTime: end,
        hours,
        totalPrice,
      });
    }

    space.isAvailable = true;
    space.occupiedBy = null;
    await space.save();

    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/tags', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { tag } = req.body;
    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({ error: 'Нужен tag (строка)' });
    }
    const space = await ParkingSpace.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { tags: tag.toLowerCase().trim() } },
      { new: true }
    );
    if (!space) return res.status(404).json({ error: 'Место не найдено' });
    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/tags/:tag', authMiddleware, isAdmin, async (req, res) => {
  try {
    const space = await ParkingSpace.findByIdAndUpdate(
      req.params.id,
      { $pull: { tags: req.params.tag.toLowerCase() } },
      { new: true }
    );
    if (!space) return res.status(404).json({ error: 'Место не найдено' });
    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;