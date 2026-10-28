# Parking_App — клиент

React + Vite. Все запросы к серверу выполняются через `src/api.js` (axios).

- `src/hooks/useAuth.js` — вход, регистрация, JWT в localStorage, реакция на 401;
- `src/hooks/useSpaces.js` — загрузка списка, поиск, пагинация, оптимистичные POST/PUT/DELETE с откатом;
- `src/hooks/useDebounce.js` — задержка ввода для поиска;
- `src/components/` — `LoginForm`, `ParkingPage`, `SpaceForm`, `SpaceItem`, `Toasts`.

Команды: `npm run dev`, `npm run build`, `npm run lint`.
Переменные окружения — см. `.env.example`.
