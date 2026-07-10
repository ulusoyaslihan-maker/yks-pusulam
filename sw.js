/* YKS Pusulam — çevrimdışı çalışma için service worker */
const CACHE = "yks-pusulam-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Supabase istekleri her zaman ağa gitsin — asla önbelleğe alınmasın
  if (e.request.method !== "GET" || e.request.url.includes("supabase.co")) return;
  // Sayfanın kendisi: önce ağ (güncellemeler hemen gelsin), çevrimdışıysa önbellek
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", clone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          const u = e.request.url;
          if (res.ok && (u.startsWith(self.location.origin) || u.includes("fonts.g") || u.includes("cdn.jsdelivr.net"))) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
