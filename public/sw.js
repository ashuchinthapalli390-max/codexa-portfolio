// CodeXa Service Worker for Web Push Notifications & Background Sync

self.addEventListener("install", (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = {
      title: "CodeXa Agency",
      body: event.data ? event.data.text() : "You have an important update from CodeXa.",
    };
  }

  const title = payload.title || "CodeXa Agency";
  const notificationType = payload.data?.type || "SYSTEM";
  const targetUrl = payload.data?.url || "/dashboard";

  // Category-specific fallback icons/badges
  const icon = payload.icon || "/favicon.ico";
  const badge = payload.badge || "/favicon.ico";

  const options = {
    body: payload.body || "New notification from CodeXa Control Center.",
    icon,
    badge,
    tag: payload.tag || `codexa-${notificationType.toLowerCase()}-${Date.now()}`,
    renotify: true,
    requireInteraction: payload.requireInteraction || false,
    vibrate: [100, 50, 100],
    data: {
      url: targetUrl,
      type: notificationType,
      timestamp: Date.now(),
      ...payload.data,
    },
    actions: [
      {
        action: "open",
        title: "Open in CodeXa",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Find existing CodeXa dashboard window if open
        for (const client of windowClients) {
          try {
            const clientUrl = new URL(client.url, self.location.origin);
            if (clientUrl.pathname.startsWith("/dashboard") || clientUrl.origin === self.location.origin) {
              if ("focus" in client) {
                client.navigate(targetUrl);
                return client.focus();
              }
            }
          } catch (e) {}
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
