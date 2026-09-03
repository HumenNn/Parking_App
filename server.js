const express = require("express");
const app = express();

app.use(express.json());

const PORT = 3000;

let spaces = [
  {
    id: 1,
    number: "A1",
    isAvailable: true,
    pricePerHour: 5,
    location: "Первый этаж",
  },
  {
    id: 2,
    number: "A2",
    isAvailable: false,
    pricePerHour: 5,
    location: "Первый этаж",
  },
  {
    id: 3,
    number: "B1",
    isAvailable: true,
    pricePerHour: 7,
    location: "Второй этаж",
  },
];

let nextId = 4;

app.get("/spaces", (req, res) => {
  res.json(spaces);
});

app.get("/spaces/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const space = spaces.find((s) => s.id === id);
  if (!space) {
    return res.status(404).json({ error: "Место с таким ID не найдено" });
  }
  res.json(space);
});

app.post("/spaces", (req, res) => {
  const { number, isAvailable, pricePerHour, location } = req.body;
  if (!number || pricePerHour === undefined) {
    return res
      .status(400)
      .json({ error: "Необходимо указать number и pricePerHour" });
  }
  const newSpace = {
    id: nextId++,
    number,
    isAvailable: isAvailable !== undefined ? isAvailable : true,
    pricePerHour,
    location: location || "Не указано",
  };
  spaces.push(newSpace);
  res.status(201).json(newSpace);
});

app.put("/spaces/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { number, isAvailable, pricePerHour, location } = req.body;
  const spaceIndex = spaces.findIndex((s) => s.id === id);
  if (spaceIndex === -1) {
    return res.status(404).json({ error: "Место не найдено" });
  }
  if (!number || pricePerHour === undefined) {
    return res
      .status(400)
      .json({ error: "Необходимо указать number и pricePerHour" });
  }
  spaces[spaceIndex] = {
    id,
    number,
    isAvailable: isAvailable !== undefined ? isAvailable : true,
    pricePerHour,
    location: location || "Не указано",
  };
  res.json(spaces[spaceIndex]);
});

app.delete("/spaces/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = spaces.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Место не найдено" });
  }
  spaces.splice(index, 1);
  res.status(204).send();
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
