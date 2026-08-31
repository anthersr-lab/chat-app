const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 3001;

let mensajes = [];
let usuariosConectados = {};

io.on('connection', (socket) => {
  console.log(`✅ Nuevo usuario conectado: ${socket.id}`);

  socket.emit('historial', mensajes);

  socket.on('unirse', (nombre) => {
    usuariosConectados[socket.id] = nombre;
    io.emit('usuarios', Object.values(usuariosConectados));
    socket.broadcast.emit('mensaje-sistema', `${nombre} se ha unido al chat 👋`);
  });

  socket.on('mensaje', (data) => {
    console.log('📨 Mensaje recibido en servidor:', data);
    const nuevoMensaje = {
      id: Date.now(),
      autor: data.autor,
      texto: data.texto,
      hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    };

    mensajes.push(nuevoMensaje);
    if (mensajes.length > 200) mensajes.shift();

    io.emit('mensaje', nuevoMensaje);
  });

  socket.on('escribiendo', (nombre) => {
    socket.broadcast.emit('escribiendo', nombre);
  });

  socket.on('dejo-de-escribir', () => {
    socket.broadcast.emit('dejo-de-escribir');
  });

  socket.on('disconnect', () => {
    const nombre = usuariosConectados[socket.id];
    delete usuariosConectados[socket.id];
    io.emit('usuarios', Object.values(usuariosConectados));
    if (nombre) {
      socket.broadcast.emit('mensaje-sistema', `${nombre} salió del chat 👋`);
    }
    console.log(`❌ Usuario desconectado: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});