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
  number: [["number", "ASC"], ["id", "ASC"]],
  price: [["pricePerHour", "ASC"], ["id", "ASC"]],
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
      where[Op.or] = [
        { number: { [Op.iLike]: pattern } },
        { location: { [Op.iLike]: pattern } },
      ];
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
      attributes: ["id", "email", "role", "createdAt", "updatedAt"],
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
    const { number, isAvailable, pricePerHour, location, capacity } = req.body;
    if (!number || pricePerHour === undefined) {
      return res
        .status(400)
        .json({ error: "Необходимо указать number и pricePerHour" });
    }
    if (!Number.isInteger(pricePerHour) || pricePerHour < 1) {
      return res
        .status(400)
        .json({ error: "pricePerHour должен быть целым числом больше 0" });
    }
    const newSpace = await ParkingSpace.create({
      number,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      pricePerHour,
      location: location || "Не указано",
      capacity: capacity !== undefined ? capacity : 1,
    });
    res.status(201).json(newSpace);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/spaces/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ error: "Место не найдено" });
    }
    const { number, isAvailable, pricePerHour, location, capacity } = req.body;
    if (
      pricePerHour !== undefined &&
      (!Number.isInteger(pricePerHour) || pricePerHour < 1)
    ) {
      return res
        .status(400)
        .json({ error: "pricePerHour должен быть целым числом больше 0" });
    }
    await space.update({
      number: number !== undefined ? number : space.number,
      isAvailable: isAvailable !== undefined ? isAvailable : space.isAvailable,
      pricePerHour:
        pricePerHour !== undefined ? pricePerHour : space.pricePerHour,
      location: location !== undefined ? location : space.location,
      capacity: capacity !== undefined ? capacity : space.capacity,
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
