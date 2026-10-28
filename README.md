# Parking_App

Приложение для управления парковкой: поиск, бронирование и оплата мест.

- Сервер: Node.js, Express 5, PostgreSQL + Sequelize, JWT (роли `user` и `admin`).
- Клиент (`client/`): React 19 + Vite, axios.

## Запуск сервера

```bash
npm install
cp .env.example .env        # задайте JWT_SECRET
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev                 # http://localhost:3000
```

Параметры подключения к PostgreSQL находятся в `config/config.json`.
Сид создаёт администратора `admin@parking.local` / `Admin123!` и 17 парковочных мест.

## Запуск клиента

```bash
cd client
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

`VITE_API_URL` — адрес API, `VITE_API_DELAY_MS` — искусственная задержка запросов для проверки спиннеров.

## API

| Метод и путь | Назначение | Доступ |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | регистрация, вход (JWT) | открыт |
| `GET /profile` | текущий пользователь | токен |
| `GET /spaces?search=&available=&sort=&limit=&offset=` | список мест, ответ `{ data, meta }` | открыт |
| `GET /spaces/stats` | число мест: всего, свободно, занято | открыт |
| `POST /spaces`, `PUT /spaces/:id`, `DELETE /spaces/:id` | изменение мест | администратор |

`sort`: `id`, `number`, `price`; `available`: `true` или `false`; `limit`: 1–100.
CORS разрешён для `CORS_ORIGIN` (по умолчанию `http://localhost:5173`).
