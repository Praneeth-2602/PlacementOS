self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data?.json?.() ?? { title: "PlacementOS", body: "You have a new update." };
  const title = data.title ?? "PlacementOS";
  const options = {
    body: data.body ?? "You have a new update.",
    icon: "/favicon.ico",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
