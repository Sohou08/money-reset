/* MONEY RESET service worker: network first, cache as fallback (lets the app open offline). */
var CACHE='mr-shell-v202611222215';
var SHELL=['./','index.html','style.css','app.js','i18n.js','config.js','manifest.webmanifest','icon-192.png','icon-512.png','icon.svg','apple-touch-icon.png','assets/doc-scan.webp','assets/doc-cheer.webp','assets/doc-worry.webp','assets/doc-wave.webp',
  'fonts/dm-sans-latin-400-normal.woff2','fonts/dm-sans-latin-500-normal.woff2','fonts/dm-sans-latin-700-normal.woff2','fonts/bricolage-grotesque-latin-500-normal.woff2','fonts/bricolage-grotesque-latin-700-normal.woff2'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return Promise.all(SHELL.map(function(u){return c.add(u).catch(function(){});}));}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==self.location.origin)return; /* never touch Supabase / rate calls */
  e.respondWith(fetch(r).then(function(res){
    if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(r,copy);});}
    return res;
  }).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||caches.match('index.html');});}));
});
