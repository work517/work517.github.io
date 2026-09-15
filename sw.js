// OmniSort 랜딩 — 한 번 열어 본 페이지는 인터넷이 없어도 열린다.
//
// 페이지는 '새 것 먼저, 안 되면 저장본' 이고 자산은 '저장본 먼저' 다.
// 랜딩은 자주 바뀌지 않지만, 바뀌었는데 옛 것을 보여 주면 곤란하다.
const CACHE = "omnisort-0.2.4";

// 어느 언어 페이지에서 켜지든 같이 쓰는 것들
const SHARED = [
  "assets/favicon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHARED.map(function (name) {
        return new URL(name, self.registration.scope).toString();
      }));
    }).catch(function () {})            // 하나라도 없으면 설치를 막지는 않는다
  );
  self.skipWaiting();
});

// 페이지가 "이 주소를 챙겨 두라" 고 알려 온다. 첫 방문도 오프라인이 되게 한다.
self.addEventListener("message", function (event) {
  const data = event.data || {};
  if (data.type !== "keep" || !data.url) { return; }
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.add(new Request(data.url, { cache: "reload" }));
    }).catch(function () {})
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (name) {
        return name !== CACHE;
      }).map(function (name) {
        return caches.delete(name);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") { return; }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) { return; }   // 남의 집은 건드리지 않는다

  const wantsPage = request.mode === "navigate";
  if (wantsPage) {
    event.respondWith(
      fetch(request).then(function (response) {
        const copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        return response;
      }).catch(function () {
        return caches.match(request).then(function (hit) {
          return hit || caches.match("https://work517.github.io/");
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (hit) {
      return hit || fetch(request).then(function (response) {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
