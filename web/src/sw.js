/**
 * name: elecV2P service worker
 * update: 2022-09-19 10:41
 *
 * Dev tools
 * chrome://inspect/#service-workers
 * chrome://serviceworker-internals
 *
 * Todo:
 * - cache with a expired date
 * - hash logo auto generate
 * - broadcast channel
 * - random/schedule update
 * - cache on mutiple conditions
 * - mannul delete caches
 * - sync modify/rewrite rules
 * Done
 * - fall stategy PATH/HOST replace
 * - case base on search
 * - html fallback cache(network first)
 * - cache base on host/path
*/

const CACHE_NAME = 'ELECV2P_V3';

// precache resources
const CACHE_LIST_PRE = [
  '/', '/logs/', '/efss/',
];

// cache strategies
// https://github.com/elecV2/elecV2P-dei/blob/master/docs/dev_note/service%20workers%20开发与优化.md
// 0: cache first, fetch fallback
// 1. cache first, fetch synchronize
// 2. fetch first, cache fallback
// -1. request passthrough with original
const CACHE_URL = new Map([
  // ['', 1],
]);
const CACHE_HOST = new Map([
  ['a.ogod.ml', 0],
  ['unpkg.com', 0],
  ['cdnjs.cloudflare.com', 0],
  ['cdn.jsdelivr.net', 0], ['cdn.tailwindcss.com', 0],
  ['images.unsplash.com', 0], ['cdn.pixabay.com', 0],
  ['sponsors.elecv2.workers.dev', 1],
  ['raw.githubusercontent.com', 2],
]);
const CACHE_SEARCH = new Map([
  ['?type=sponsors&param=lists', 1],
]);
const CACHE_PATH = new Map([
  ['/', 1],
  ['/logs/', 2], ['/efss/', 2],
  ['/manifest.json', 1],
  ['/elecV2/elecV2P/master/logs/update.log', 1],
  ['/efss/logo/elecV2P.png', 2],
  ['/jsfile', 2], ['/store', -1],
  ['/data', 2], ['/eapp', 2],
  ['/sefss', 2], ['/task', 2],
  ['/webhook', -1],
  ['/config', -1],
]);
const CACHE_MODE = new Map([
  ['navigate', 2],
]);
const CACHE_DESTINATION = new Map([
  ['image', 0], ['script', 0], ['style', 0],
  ['font', 0], ['manifest', 1],
  ['document', -1],
  ['video', -1], ['audio', -1],
]);

const PATH_FALLBACK = new Map([
  ['/efss/logo/elecV2P.png', 'https://raw.ev2.workers.dev/elecV2/elecV2P/master/efss/logo/elecV2P.png'],
]);
const HOST_FALLBACK = new Map([
  ['raw.githubusercontent.com', 'raw.ev2.workers.dev'],
]);

const STRATEGY_DEFAULT = -1;

const putInCache = async (request, response) => {
  console.debug('cache', request.url, 'type:', request.destination || 'unknow');
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
};

const eCache = async (event) => {
  const responseFromCache = await caches.match(event.request);
  if (responseFromCache) {
    console.debug('serve', event.request.url, 'from cache');
    return responseFromCache;
  }
};

const eFetch = async (event, trycache = false) => {
  try {
    const networkResponse = await fetch(event.request.url).then((response) => {
      if (response.status > 400) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      };

      return response;
    });
    putInCache(event.request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    if (trycache) {
      console.error('fetch', event.request.url, error);
      console.debug('retry', event.request.url, 'from cache');
      const cacheResponse = await eCache(event);
      if (cacheResponse) {
        return cacheResponse
      }
    }
    const urlobj = new URL(event.request.url);
    const { pathname, host } = urlobj;
    if (PATH_FALLBACK.has(pathname)) {
      const path_fall = PATH_FALLBACK.get(pathname);
      if (/^http/.test(path_fall)) {
        urlobj.href = path_fall;
      } else {
        urlobj.pathname = path_fall;
      }
      console.debug('serve', event.request.url, 'from', urlobj.href, 'PATH_FALLBACK');
      const fallResponse = await fetch(urlobj.href, event.request);
      putInCache(event.request, fallResponse.clone());
      return fallResponse;
    }
    if (HOST_FALLBACK.has(host)) {
      const host_fall = HOST_FALLBACK.get(host);
      if (/^http/.test(host_fall)) {
        urlobj.href = host_fall;
      } else {
        urlobj.host = host_fall;
      }
      console.debug('serve', event.request.url, 'from', urlobj.href, 'HOST_FALLBACK');
      const fallResponse = await fetch(urlobj.href, event.request);
      putInCache(event.request, fallResponse.clone());
      return fallResponse;
    }
    console.error('fetch', event.request.url, error);
    return new Response(`{ "rescode": -1, "message": "Network Error 网络连接错误: ${error.message}"}`, { header: { "Content-Type": "application/json;charset=utf-8" } });
  }
};

const STRATEGIES = [
  async (event)=>{
    return await eCache(event) || await eFetch(event);
  },
  async (event)=>{
    const responseFromCache = await eCache(event)
    const fetchsync = eFetch(event)
    if (responseFromCache) {
      return responseFromCache
    }
    return await fetchsync
  },
  async (event)=>{
    return await eFetch(event, true);
  },
];

const getStrategy = (request) => {
  let strategy = STRATEGY_DEFAULT;
  let { url, mode, method, destination } = request;
  if (method !== 'GET') {
    console.debug('fetch', url, mode, method);
    return strategy;
  }
  let urlobj = new URL(url);
  let host = urlobj.host;
  let path = urlobj.pathname;
  let search = urlobj.search;
  let cache_type = '';
  switch (true) {
  case CACHE_URL.has(url):
    strategy = CACHE_URL.get(url);
    cache_type = 'URL';
    break;
  case CACHE_HOST.has(host):
    strategy = CACHE_HOST.get(host);
    cache_type = 'HOST';
    break;
  case CACHE_SEARCH.has(search):
    strategy = CACHE_SEARCH.get(search);
    cache_type = 'SEARCH';
    break;
  case search.startsWith('?type=stream'):
    cache_type = 'STREAM';
    break;
  case CACHE_PATH.has(path):
    strategy = CACHE_PATH.get(path);
    cache_type = 'PATH';
    break;
  case path.startsWith('/efss/index.'):
    strategy = 0;
    cache_type = '/EFSS/INDEX';
    break;
  case path.startsWith('/efss/'):
    // strategy = STRATEGY_DEFAULT;    // NO CHANGE
    cache_type = '/EFSS';
    break;
  case path.startsWith('/script/'):
    // strategy = STRATEGY_DEFAULT;    // NO CHANGE
    cache_type = '/SCRIPT';
    break;
  case CACHE_DESTINATION.has(destination):
    strategy = CACHE_DESTINATION.get(destination);
    cache_type = 'DESTINATION';
    break;
  case CACHE_MODE.has(mode):
    strategy = CACHE_MODE.get(mode);
    cache_type = 'MODE';
    break;
  }
  if (strategy !== -1 && !STRATEGIES[strategy]) {
    console.error('strategy', strategy, 'not exist');
    strategy = STRATEGY_DEFAULT;
  }
  console.debug('fetch', url, mode, method, destination || 'unknow type', 'strategy:', cache_type, strategy);
  return strategy;
};

const deleteCache = async (key) => {
  console.debug('delete cache', key);
  await caches.delete(key);
};

const deleteCacheSingle = async (request, storage = CACHE_NAME) => {
  const cache = await caches.open(storage);
  return await cache.delete(request);
}

const deleteOldCaches = async () => {
  const cacheKeepList = [CACHE_NAME];
  const keyList = await caches.keys();
  const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key));
  await Promise.all(cachesToDelete.map(deleteCache));
};

const cachePre = async (cachelist = CACHE_LIST_PRE) => {
  if (cachelist.length === 0) {
    return;
  }
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(cachelist);
}

self.addEventListener('install', (event) => {
  console.debug('sw installed');
  self.skipWaiting();
  event.waitUntil(cachePre());
});

self.addEventListener('activate', (event) => {
  console.debug('sw activate');
  event.waitUntil((async () => {
    // Enable navigation preload if it's supported.
    // See https://developers.google.com/web/updates/2017/02/navigation-preload
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.disable();
    }
    await deleteOldCaches()
  })());

  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();
});

self.addEventListener('fetch', async (event) => {
  const strategy = getStrategy(event.request);
  if (strategy === -1) {
    return;
  }
  event.respondWith(
    STRATEGIES[strategy](event)
  );
});