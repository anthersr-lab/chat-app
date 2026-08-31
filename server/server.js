const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const webpush = require('web-push');

const app = express();
const server = http.createServer(app);
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 3001;

webpush.setVapidDetails(
  'mailto:tucorreo@ejemplo.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

let mensajes = [];
let suscripciones = [];

app.post('/subscribe', (req, res) => {
  const sub = req.body;
  console.log('🔔 Nueva suscripcion recibida:', sub.endpoint);
  const yaExiste = suscripciones.some((s) => s.endpoint === sub.endpoint);
  if (!yaExiste) suscripciones.push(sub);
  console.log('📋 Total de suscripciones activas:', suscripciones.length);
  res.status(201).json({ ok: true });
});

io.on('connection', (socket) => {
  console.log(`✅ Nuevo usuario conectado: ${socket.id}`);

  socket.emit('historial', mensajes);

  socket.on('mensaje', (data) => {
    const nuevoMensaje = {
      id: Date.now(),
      autorId: socket.id,
      texto: data.texto,
      hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    };

    mensajes.push(nuevoMensaje);
    if (mensajes.length > 200) mensajes.shift();

    io.emit('mensaje', nuevoMensaje);

    console.log('📤 Intentando enviar notificacion a', suscripciones.length, 'suscriptores');
    suscripciones.forEach((sub) => {
      webpush
        .sendNotification(
          sub,
          JSON.stringify({
            title: 'Nuevo mensaje',
            body: data.texto,
          })
        )
        .then(() => console.log('✅ Notificacion enviada'))
        .catch((err) => {
          console.log('❌ Error al enviar notificacion:', err.message);
          suscripciones = suscripciones.filter((s) => s.endpoint !== sub.endpoint);
        });
    });
  });

  socket.on('escribiendo', () => {
    socket.broadcast.emit('escribiendo');
  });

  socket.on('dejo-de-escribir', () => {
    socket.broadcast.emit('dejo-de-escribir');
  });

  socket.on('disconnect', () => {
    console.log(`❌ Usuario desconectado: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});