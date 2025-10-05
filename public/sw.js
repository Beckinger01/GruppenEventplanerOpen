{/*Service Worker für PWA und Push Nachrichten */}

const CACHE = "app-v1";
const ASSETS = [
  "/",
  "/offline.html",
  "/images/Icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => { });
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;

        if (e.request.mode === "navigate") {
          return caches.match("/offline.html");
        }
      })
  );
});

self.addEventListener("push", (event) => {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const title = data.title || "Neue Nachricht";
    const options = {
      body: data.body || "",
      tag: data.tag || "general",
      icon: data.icon || "/images/Icon.png",
      badge: "/images/Icon.png",
      data: data.data || {},
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: "open",
          title: "Öffnen",
          icon: "/images/Icon.png"
        },
        {
          action: "dismiss",
          title: "Schließen"
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error processing push event:', error);
    
    event.waitUntil(
      self.registration.showNotification("Neue Nachricht", {
        body: "Du hast eine neue Nachricht erhalten",
        icon: "/images/Icon.png"
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const url = event.notification.data?.url || "/";
  
  event.waitUntil(
    clients.matchAll({ 
      type: "window", 
      includeUncontrolled: true 
    }).then((wins) => {
      const existing = wins.find((w) => {
        try {
          const clientUrl = new URL(w.url);
          const targetUrl = new URL(url, self.location.origin);
          return clientUrl.origin === targetUrl.origin;
        } catch (e) {
          return false;
        }
      });

      if (existing && existing.focus) {
        return existing.focus().then(() => {
          if (existing.navigate) {
            return existing.navigate(url);
          }
        });
      }

      return clients.openWindow(url);
    })
  );
});