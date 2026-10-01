require("dotenv").config();
const express = require("express");
const { ParkingSpace, User } = require("./models");
const authRoutes = require("./routes/auth");
const { authMiddleware, isAdmin } = require("./middleware/auth");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/auth", authRoutes);

app.get("/spaces", async (req, res) => {
  try {
    const spaces = await ParkingSpace.findAll();
    res.json(spaces);
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
