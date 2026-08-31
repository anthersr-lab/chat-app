import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001');

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function suscribirNotificaciones() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    });

    await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
  } catch (err) {
    console.log('No se pudo suscribir a notificaciones', err);
  }
}

export default function App() {
  const [miId, setMiId] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [otroEscribiendo, setOtroEscribiendo] = useState(false);
  const finRef = useRef(null);
  const escribiendoTimeout = useRef(null);

  useEffect(() => {
    socket.on('connect', () => {
      setMiId(socket.id);
      suscribirNotificaciones();
    });

    socket.on('historial', (historial) => setMensajes(historial));

    socket.on('mensaje', (msg) => {
      setMensajes((prev) => [...prev, msg]);
    });

    socket.on('escribiendo', () => setOtroEscribiendo(true));
    socket.on('dejo-de-escribir', () => setOtroEscribiendo(false));

    return () => {
      socket.off('connect');
      socket.off('historial');
      socket.off('mensaje');
      socket.off('escribiendo');
      socket.off('dejo-de-escribir');
    };
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, otroEscribiendo]);

  const enviarMensaje = (e) => {
    e.preventDefault();
    const textoLimpio = texto.trim();
    if (!textoLimpio) return;
    socket.emit('mensaje', { texto: textoLimpio });
    socket.emit('dejo-de-escribir');
    setTexto('');
  };

  const manejarEscritura = (e) => {
    const valor = e.target.value;
    setTexto(valor);
    socket.emit('escribiendo');
    clearTimeout(escribiendoTimeout.current);
    escribiendoTimeout.current = setTimeout(() => {
      socket.emit('dejo-de-escribir');
    }, 1200);
  };

  return (
    <div
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
      className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-yellow-100 p-4 flex items-center justify-center"
    >
      <div className="w-full max-w-3xl h-[85vh] bg-white/85 backdrop-blur rounded-3xl shadow-2xl border-4 border-purple-300 overflow-hidden flex flex-col">
        <header className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">💬 Nuestro Chat</h2>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-300 animate-pulse"></span>
            <span className="text-sm font-semibold">En línea</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-purple-50/80 to-pink-50/80">
          {mensajes.map((mensaje) => {
            const esMio = mensaje.autorId === miId;
            return (
              <div key={mensaje.id} className="flex">
                <div className={`max-w-[75%] ${esMio ? 'ml-auto' : 'mr-auto'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${esMio ? 'ml-auto text-pink-600' : 'text-purple-700'}`}>
                      {esMio ? 'Yo' : 'Tú'}
                    </span>
                  </div>
                  <div
                    className={`${
                      esMio
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : 'bg-white border-2 border-purple-200 text-gray-800'
                    } rounded-2xl px-4 py-2 shadow-sm`}
                  >
                    {mensaje.texto}
                  </div>
                  <span className="text-xs text-purple-400 px-1">{mensaje.hora}</span>
                </div>
              </div>
            );
          })}

          {otroEscribiendo && (
            <div className="text-sm text-purple-600 italic">
              Escribiendo...
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