const CACHE_NAME = 'daycare-tracker-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((response) => {
        const clonedRes = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clonedRes);
        });
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-routines') {
    event.waitUntil(syncRoutines());
  }
});

async function syncRoutines() {
  const db = await openIndexedDB();
  const pending = await getAllFromDB(db, 'pending_routines');
  for (const routine of pending) {
    try {
      await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routine),
      });
      await deleteFromDB(db, 'pending_routines', routine.id);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }
}

function openIndexedDB() {
  return new Promise((resolve) => {
    const req = indexedDB.open('daycare-tracker', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending_routines')) {
        db.createObjectStore('pending_routines', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function getAllFromDB(db, store) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

function deleteFromDB(db, store, key) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
  });
}
