/* ES5 service worker for the isolated tablet preview only. */
var RELEASE = "f8d4115e75ad5063";
var ASSETS = [{"name":"workroom.f8d4115e75ad5063.html","sha256":"6a207f3d840f1e6b3ff3e076364ed04f6a39550a9beed7e4228d0408845042c9"},{"name":"app.6a1f85cd85bdb802.js","sha256":"6a1f85cd85bdb8022a47783c6bc3786b2c36c05603c9bd70afb270d68ab542bd"},{"name":"style.a49884b20331fe35.css","sha256":"a49884b20331fe358d1ba3c786b160d13e397e01b78bdd224d072e2b4c8a9f14"},{"name":"pdf.8f0674d566da6a27.js","sha256":"8f0674d566da6a27ca1c3801d015125be8eac5d3aca2db287290576a70ca2e6b"},{"name":"offline-client.e66ec8abdc91ae03.js","sha256":"e66ec8abdc91ae03bdb6a1b81ebf6cbd9c8b7f565f7037cf377e5c43662fb2d1"}];
var SHELL = "workroom.f8d4115e75ad5063.html";
var SCOPE = self.registration.scope;
var CACHE = 'rokawright-tablet-offline-' + encodeURIComponent(SCOPE) + '-' + RELEASE;
function assetURL(name) { return new URL(name, SCOPE).href; }
function checked(response, asset) {
  if (!response || !response.ok || response.type === 'opaque') return Promise.reject(Error('Could not fetch ' + asset.name));
  return response.clone().arrayBuffer().then(function (bytes) {
    return crypto.subtle.digest('SHA-256', bytes);
  }).then(function (digest) {
    var data = new Uint8Array(digest), hex = '', i;
    for (i = 0; i < data.length; i++) hex += ('0' + data[i].toString(16)).slice(-2);
    if (hex !== asset.sha256) throw Error('Asset verification failed: ' + asset.name);
    return response;
  });
}
self.addEventListener('install', function (event) {
  // A new release gets its own cache. A failed preparation never replaces the active release.
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return ASSETS.reduce(function (previous, asset) {
      return previous.then(function () {
        return fetch(assetURL(asset.name), {cache:'reload', credentials:'same-origin'}).then(function (response) {
          return checked(response, asset);
        }).then(function (response) { return cache.put(assetURL(asset.name), response); });
      });
    }, Promise.resolve());
  }).catch(function (error) {
    return caches.delete(CACHE).then(function () { throw error; });
  }));
  // Never skip waiting automatically; the user controls updates while the workroom is open.
});
self.addEventListener('activate', function (event) {
  // Keep older caches for an older open page's lazy PDF load; never touch localStorage/records.
  event.waitUntil(self.clients.claim());
});
function ready() {
  return caches.open(CACHE).then(function (cache) {
    return Promise.all(ASSETS.map(function (asset) {
      return cache.match(assetURL(asset.name)).then(function (response) {
        if (!response) throw Error('Offline asset missing: ' + asset.name);
        return checked(response, asset);
      });
    }));
  });
}
self.addEventListener('message', function (event) {
  var port = event.ports && event.ports[0];
  if (!port || !event.data) return;
  function send(value) { port.postMessage(value); }
  if (event.data.type === 'STATUS') {
    event.waitUntil(ready().then(function () { send({ready:true, release:RELEASE}); }).catch(function (error) {
      send({ready:false, release:RELEASE, error:error.message});
    }));
  }
  if (event.data.type === 'REPAIR') {
    event.waitUntil(caches.open(CACHE).then(function (cache) {
      return ASSETS.reduce(function (p, asset) {
        return p.then(function () {
          return cache.match(assetURL(asset.name)).then(function (response) {
            return checked(response,asset).catch(function () {
              return fetch(assetURL(asset.name),{cache:'reload',credentials:'same-origin'}).then(function (fresh) {return checked(fresh,asset);}).then(function (fresh) {return cache.put(assetURL(asset.name),fresh);});
            });
          });
        });
      },Promise.resolve());
    }).then(function () {send({ready:true, release:RELEASE});}).catch(function(error){send({ready:false,error:error.message});}));
  }
  if (event.data.type === 'APPLY_UPDATE') {
    event.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function (clients) {
      var here = clients.filter(function (client) { return client.url.indexOf(SCOPE) === 0; });
      if (here.length > 1) throw Error('Close other offline-test tabs before applying an update.');
      return ready();
    }).then(function () {
      send({accepted:true}); return self.skipWaiting();
    }).catch(function (error) { send({accepted:false, error:error.message}); }));
  }
});
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url), base = new URL(SCOPE);
  if (url.origin !== base.origin || url.pathname.indexOf(base.pathname) !== 0) return;
  var relative = url.pathname.slice(base.pathname.length);
  var navigation = request.mode === 'navigate' && (relative === '' || relative === 'index.html' || relative === SHELL);
  if (navigation) {
    event.respondWith(caches.open(CACHE).then(function (cache) {
      return cache.match(assetURL(SHELL)).then(function (response) {
        if (response) return response;
        return fetch(request);
      });
    }));
    return;
  }
  // Match immutable assets across this preview's retained releases. No other site's caches are used.
  if (/^(app|style|pdf|offline-client)\.[a-f0-9]{16}\.(js|css)$/.test(relative)) {
    event.respondWith(caches.keys().then(function (names) {
      var matches = names.filter(function (name) {return name.indexOf('rokawright-tablet-offline-' + encodeURIComponent(SCOPE) + '-') === 0;});
      return matches.reduce(function (p, name) {
        return p.then(function (found) { return found || caches.open(name).then(function (cache) {return cache.match(request, {ignoreSearch:true});}); });
      }, Promise.resolve(null));
    }).then(function (response) { return response || fetch(request); }));
  }
});
