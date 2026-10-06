// CodeXa Service Worker for Web Push Notifications & Background Sync

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch (err) {
    payload = {
      title: "CodeXa Agency",
      body: event.data?.text() || "You have an important update from CodeXa.",
    };
  }

  const title = payload.title || "CodeXa Agency";
  const options = {
    body: payload.body || "Your mandatory internship service payment is pending.",
    icon: payload.icon || "/email-assets/codexa-logo.png",
    badge: payload.badge || "/email-assets/codexa-logo.png",
    tag: payload.tag || "mandatory-service-payment",
    renotify: true,
    requireInteraction: payload.requireInteraction || false,
    data: payload.data || { url: "/dashboard/payments" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard/payments";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
