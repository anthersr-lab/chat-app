import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const titulo = data.title || 'Nuevo mensaje';
  const opciones = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };
  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});