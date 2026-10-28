require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Op } = require("sequelize");
const { ParkingSpace, User } = require("./models");
const authRoutes = require("./routes/auth");
const { authMiddleware, isAdmin } = require("./middleware/auth");

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/auth", authRoutes);

const MAX_LIMIT = 100;
const SORTS = {
  id: [["id", "ASC"]],
  number: [["floor", "ASC"], ["number", "ASC"], ["id", "ASC"]],
  price: [["pricePerHour", "ASC"], ["floor", "ASC"], ["number", "ASC"]],
};

const escapeLike = (value) => value.replace(/[\\%_]/g, (ch) => `\\${ch}`);

app.get("/spaces", async (req, res) => {
  try {
    const { search, available, sort, limit, offset } = req.query;

    let pageLimit;
    if (limit !== undefined) {
      pageLimit = Number(limit);
      if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > MAX_LIMIT) {
        return res
          .status(400)
          .json({ error: `limit должен быть целым числом от 1 до ${MAX_LIMIT}` });
      }
    }

    let pageOffset = 0;
    if (offset !== undefined) {
      pageOffset = Number(offset);
      if (!Number.isInteger(pageOffset) || pageOffset < 0) {
        return res
          .status(400)
          .json({ error: "offset должен быть целым неотрицательным числом" });
      }
    }

    const where = {};
    const query = typeof search === "string" ? search.trim() : "";
      if (query) {
      const pattern = `%${escapeLike(query)}%`;
      where.number = { [Op.iLike]: pattern };
      }
      if (available === "true") where.isAvailable = true;
      if (available === "false") where.isAvailable = false;

    const { rows, count } = await ParkingSpace.findAndCountAll({
      where,
      order: SORTS[sort] || SORTS.id,
      offset: pageOffset,
      ...(pageLimit !== undefined && { limit: pageLimit }),
    });

    res.json({
      data: rows,
      meta: {
        total: count,
        limit: pageLimit ?? null,
        offset: pageOffset,
        hasMore: pageOffset + rows.length < count,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/spaces/stats", async (req, res) => {
  try {
    const [total, available] = await Promise.all([
      ParkingSpace.count(),
      ParkingSpace.count({ where: { isAvailable: true } }),
    ]);
    res.json({ total, available, occupied: total - available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/spaces/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ error: "Место с таким ID не существует" });
    }
    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "email", "role", "maxSpaces", "createdAt", "updatedAt"],
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "Пользователь не найден" });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Список пользователей (только admin)
app.get("/users", authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "email", "role", "maxSpaces", "createdAt"],
      order: [["id", "ASC"]],
    });
    res.json({ data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Изменить maxSpaces пользователя (только admin)
app.patch("/users/:id/max-spaces", authMiddleware, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { maxSpaces } = req.body;

    if (!Number.isInteger(maxSpaces) || maxSpaces < 0 || maxSpaces > 50) {
      return res
        .status(400)
        .json({ error: "maxSpaces: целое число от 0 до 50" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    await user.update({ maxSpaces });
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      maxSpaces: user.maxSpaces,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/users", authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "email", "role", "createdAt", "updatedAt"],
    });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/spaces", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { number, isAvailable, pricePerHour, capacity, floor } = req.body;

    if (!number || pricePerHour === undefined) {
      return res
        .status(400)
        .json({ error: "Необходимо указать number и pricePerHour" });
    }

    const num = String(number).trim();
    if (!num || num.length > 20) {
      return res.status(400).json({ error: "Номер: от 1 до 20 символов" });
    }

    if (!Number.isInteger(pricePerHour) || pricePerHour < 1) {
      return res
        .status(400)
        .json({ error: "pricePerHour должен быть целым числом больше 0" });
    }

    const floorNum = floor !== undefined ? Number(floor) : 1;
    if (!Number.isInteger(floorNum) || floorNum < 1 || floorNum > 50) {
      return res
        .status(400)
        .json({ error: "Этаж: целое число от 1 до 50" });
    }

    const dup = await ParkingSpace.findOne({
      where: { number: num, floor: floorNum },
    });
    if (dup) {
      return res.status(400).json({
        error: `На этаже ${floorNum} место с номером ${num} уже есть`,
      });
    }

    const newSpace = await ParkingSpace.create({
      number: num,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      pricePerHour,
      capacity: capacity !== undefined ? capacity : 1,
      floor: floorNum,
      occupiedByUserId: null,
    });

    res.status(201).json(newSpace);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/spaces/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ error: "Место не найдено" });
    }

    const { number, isAvailable, pricePerHour, capacity, floor } = req.body;

    if (
      pricePerHour !== undefined &&
      (!Number.isInteger(pricePerHour) || pricePerHour < 1)
    ) {
      return res
        .status(400)
        .json({ error: "pricePerHour должен быть целым числом больше 0" });
    }

    const nextNumber =
      number !== undefined ? String(number).trim() : space.number;
    const nextFloor =
      floor !== undefined ? Number(floor) : space.floor ?? 1;

    if (floor !== undefined) {
      if (!Number.isInteger(nextFloor) || nextFloor < 1 || nextFloor > 50) {
        return res
          .status(400)
          .json({ error: "Этаж: целое число от 1 до 50" });
      }
    }

    // проверка дубликата number+floor, кроме текущего места
    if (
      nextNumber !== space.number ||
      nextFloor !== (space.floor ?? 1)
    ) {
      const dup = await ParkingSpace.findOne({
        where: {
          number: nextNumber,
          floor: nextFloor,
          id: { [Op.ne]: id },
        },
      });
      if (dup) {
        return res.status(400).json({
          error: `На этаже ${nextFloor} место с номером ${nextNumber} уже есть`,
        });
      }
    }

    await space.update({
      number: nextNumber,
      isAvailable:
        isAvailable !== undefined ? isAvailable : space.isAvailable,
      pricePerHour:
        pricePerHour !== undefined ? pricePerHour : space.pricePerHour,
      capacity: capacity !== undefined ? capacity : space.capacity,
      floor: nextFloor,
    });

    res.json(space);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/spaces/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ error: "Место не найдено" });
    }
    await space.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/spaces/:id/occupy", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Некорректный ID места" });
    }

    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ error: "Место не найдено" });
    }

    if (!space.isAvailable || space.occupiedByUserId != null) {
      return res.status(400).json({ error: "Место уже занято" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const myCount = await ParkingSpace.count({
      where: { occupiedByUserId: req.user.id },
    });

    if (myCount >= user.maxSpaces) {
      return res.status(400).json({
        error: `Лимит мест: не больше ${user.maxSpaces}`,
      });
    }

    await space.update({
      isAvailable: false,
      occupiedByUserId: req.user.id,
    });

    
    const updated = await ParkingSpace.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post("/spaces/:id/release", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Некорректный ID места" });
    }

    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ error: "Место не найдено" });
    }

    const isOwner = space.occupiedByUserId === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Можно освободить только своё место" });
    }

    await space.update({
      isAvailable: true,
      occupiedByUserId: null,
    });

    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/spaces/:id/occupy', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const space = await ParkingSpace.findByPk(id);
    if (!space) return res.status(404).json({ error: 'Место не найдено' });

    if (!space.isAvailable || space.occupiedByUserId != null) {
      return res.status(400).json({ error: 'Место уже занято' });
    }

    const user = await User.findByPk(req.user.id);
    const myCount = await ParkingSpace.count({
      where: { occupiedByUserId: req.user.id }
    });

    if (myCount >= user.maxSpaces) {
      return res.status(400).json({
        error: `Лимит мест: не больше ${user.maxSpaces}`
      });
    }

    await space.update({
      isAvailable: false,
      occupiedByUserId: req.user.id
    });

    const updated = await ParkingSpace.findByPk(id, {
      include: [{ model: User, as: 'occupant', attributes: ['id', 'email'] }]
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/spaces/:id/release', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const space = await ParkingSpace.findByPk(id);
    if (!space) return res.status(404).json({ error: 'Место не найдено' });

    const isOwner = space.occupiedByUserId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Можно освободить только своё место' });
    }

    await space.update({
      isAvailable: true,
      occupiedByUserId: null
    });

    res.json(space);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
