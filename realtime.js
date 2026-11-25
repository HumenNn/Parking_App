const { Server } = require('socket.io');
const { verifyToken } = require('./middleware/auth');

const floorRoom = (floor) => `floor:${floor}`;

function attachRealtime(server, allowedOrigins) {
  const io = new Server(server, {
    cors: { origin: allowedOrigins },
    allowRequest: (req, done) => {
      const origin = req.headers.origin;
      done(null, !origin || allowedOrigins.includes(origin));
    },
    maxHttpBufferSize: 4096,
  });

  io.use((socket, next) => {
    try {
      const { id, exp } = verifyToken(socket.handshake.auth.token);
      if (typeof id !== 'string' || !Number.isFinite(exp)) throw new Error();
      socket.data.expiresAt = exp * 1000;
      next();
    } catch {
      next(new Error('Недействительная сессия'));
    }
  });

  io.on('connection', (socket) => {
    const expiry = setTimeout(() => {
      socket.emit('session:expired');
      socket.disconnect(true);
    }, Math.max(0, socket.data.expiresAt - Date.now()));

    socket.on('floor:subscribe', (floor, acknowledge) => {
      if (typeof acknowledge !== 'function') return;
      if (!Number.isInteger(floor) || floor < 1 || floor > 50) {
        return acknowledge({ ok: false, error: 'Выберите этаж от 1 до 50' });
      }

      const previous = socket.data.floor;
      if (previous !== floor) {
        if (previous !== undefined) {
          socket.leave(floorRoom(previous));
          emitPresence(previous, 'left');
        }
        socket.join(floorRoom(floor));
        socket.data.floor = floor;
        socket.to(floorRoom(floor)).emit('floor:presence', presence(floor, 'joined'));
      }
      acknowledge({ ok: true, count: roomSize(floor) });
    });

    socket.on('disconnect', () => {
      clearTimeout(expiry);
      if (socket.data.floor !== undefined) emitPresence(socket.data.floor, 'left');
    });
  });

  function roomSize(floor) {
    return io.sockets.adapter.rooms.get(floorRoom(floor))?.size ?? 0;
  }

  function presence(floor, action) {
    return { floor, action, count: roomSize(floor) };
  }

  function emitPresence(floor, action) {
    io.to(floorRoom(floor)).emit('floor:presence', presence(floor, action));
  }

  function publishSpaceChange(action, space, previousFloor) {
    const { floor, number } = space;
    const event = { action, floor, number, at: new Date().toISOString() };
    let audience = io.to(floorRoom(floor));
    if (previousFloor !== undefined) audience = audience.to(floorRoom(previousFloor));
    audience.emit('floor:activity', event);
    io.emit('spaces:changed');
  }

  return { io, publishSpaceChange };
}

module.exports = attachRealtime;
