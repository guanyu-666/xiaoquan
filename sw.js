/* =========================================================
   小圈 · Service Worker
   作用：预缓存全部静态资源，装到桌面后断网也能打开
   注意：换图标/改代码后，把下面的 CACHE 版本号 +1 即可刷新缓存
   ========================================================= */

const CACHE = 'xiaocuan-v1';

/* 需要离线缓存的文件（保持相对路径） */
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* 安装：把资源全部塞进缓存 */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => { /* 个别文件缺失不影响安装 */ }))
      .then(() => self.skipWaiting())
  );
});

/* 激活：清理旧版本缓存，立即接管页面 */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 请求策略：
   - 页面导航：优先网络，失败则用缓存的 index.html（离线可用）
   - 其它资源：优先缓存，没有再走网络并写入缓存 */
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;

  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      if(hit) return hit;
      return fetch(req).then(res => {
        if(res && res.status === 200 && res.type === 'basic'){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
