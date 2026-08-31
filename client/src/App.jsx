import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

   const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001');

const COLORES_AVATAR = [
  'bg-pink-400', 'bg-purple-400', 'bg-yellow-400',
  'bg-green-400', 'bg-blue-400', 'bg-orange-400',
];

function colorDeNombre(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash += nombre.charCodeAt(i);
  return COLORES_AVATAR[hash % COLORES_AVATAR.length];
}

export default function App() {
  const [nombre, setNombre] = useState('');
  const [nombreTemp, setNombreTemp] = useState('');
  const [unido, setUnido] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(null);
  const finRef = useRef(null);
  const escribiendoTimeout = useRef(null);

  useEffect(() => {
    socket.on('connect', () => console.log('✅ Conectado:', socket.id));
    socket.on('connect_error', (err) => console.log('❌ Error de conexión:', err.message));
    socket.on('disconnect', (reason) => console.log('🔌 Desconectado. Razón:', reason));
    
    socket.on('historial', (historial) => setMensajes(historial));
    socket.on('mensaje', (msg) => setMensajes((prev) => [...prev, msg]));
    socket.on('mensaje-sistema', (textoSistema) => {
      setMensajes((prev) => [
        ...prev,
        { id: Date.now(), sistema: true, texto: textoSistema },
      ]);
    });
    socket.on('escribiendo', (nombreUsuario) => setEscribiendo(nombreUsuario));
    socket.on('dejo-de-escribir', () => setEscribiendo(null));

    return () => {
      socket.off('historial');
      socket.off('mensaje');
      socket.off('mensaje-sistema');
      socket.off('escribiendo');
      socket.off('dejo-de-escribir');
    };
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, escribiendo]);

  const unirseAlChat = (e) => {
    e.preventDefault();
    const nombreLimpio = nombreTemp.trim();
    if (!nombreLimpio) return;
    setNombre(nombreLimpio);
    socket.emit('unirse', nombreLimpio);
    setUnido(true);
  };

  const enviarMensaje = (e) => {
    e.preventDefault();
    const textoLimpio = texto.trim();
    if (!textoLimpio || !nombre) return;
    socket.emit('mensaje', { autor: nombre, texto: textoLimpio });
    socket.emit('dejo-de-escribir');
    setTexto('');
  };

  const manejarEscritura = (e) => {
    const valor = e.target.value;
    setTexto(valor);
    if (!nombre) return;
    socket.emit('escribiendo', nombre);
    clearTimeout(escribiendoTimeout.current);
    escribiendoTimeout.current = setTimeout(() => {
      socket.emit('dejo-de-escribir');
    }, 1200);
  };

  if (!unido) {
    return (
      <div
        style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-300 via-purple-300 to-yellow-200 p-4"
      >
        <form
          onSubmit={unirseAlChat}
          className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-sm border-4 border-purple-400"
        >
          <h1 className="text-3xl font-bold text-center text-purple-600 mb-2">💬 ¡Hola!</h1>
          <p className="text-center text-purple-400 mb-6">¿Cómo te llamas?</p>
          <input
            autoFocus
            value={nombreTemp}
            onChange={(e) => setNombreTemp(e.target.value)}
            placeholder="Tu nombre..."
            className="w-full px-4 py-3 rounded-2xl border-2 border-pink-300 focus:border-purple-500 outline-none text-lg mb-4"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform"
          >
            Entrar al chat
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
      className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-yellow-100 p-4 flex items-center justify-center"
    >
      <div className="w-full max-w-3xl h-[80vh] bg-white/85 backdrop-blur rounded-3xl shadow-2xl border-4 border-purple-300 overflow-hidden flex flex-col">
        <header className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] opacity-80">Chat</p>
            <h2 className="text-2xl font-bold">Bienvenido, {nombre}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-300 animate-pulse"></span>
            <span className="text-sm font-semibold">En línea</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-purple-50/80 to-pink-50/80">
          {mensajes.map((mensaje) => (
            <div key={mensaje.id ?? `${mensaje.autor}-${mensaje.texto}-${Math.random()}`} className={mensaje.sistema ? 'text-center' : 'flex'}>
              {mensaje.sistema ? (
                <p className="inline-block mx-auto rounded-full bg-purple-200 text-purple-700 px-3 py-1 text-sm">
                  {mensaje.texto}
                </p>
              ) : (
                <div className={`max-w-[75%] ${mensaje.autor === nombre ? 'ml-auto' : 'mr-auto'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-8 w-8 rounded-full ${colorDeNombre(mensaje.autor)} flex items-center justify-center text-white font-bold text-xs`}>
                      {mensaje.autor.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-purple-700">{mensaje.autor}</span>
                  </div>
                  <div className={`${mensaje.autor === nombre ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-white border-2 border-purple-200 text-gray-800'} rounded-2xl px-4 py-2 shadow-sm`}>
                    {mensaje.texto}
                  </div>
                </div>
              )}
            </div>
          ))}

          {escribiendo && (
            <div className="text-sm text-purple-600 italic">
              {escribiendo} está escribiendo...
            </div>
          )}

          <div ref={finRef} />
        </main>

        <form onSubmit={enviarMensaje} className="border-t-4 border-purple-200 bg-white px-4 py-3 flex gap-3">
          <input
            value={texto}
            onChange={manejarEscritura}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-3 rounded-2xl border-2 border-pink-200 focus:border-purple-500 outline-none"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold shadow-md hover:scale-[1.02] transition"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
