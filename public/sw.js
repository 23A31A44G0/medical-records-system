// Service Worker for offline functionality
const CACHE_NAME = 'medical-reports-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                
                // Clone the request because it's a stream
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then(response => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response because it's a stream
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                }).catch(() => {
                    // Return offline page for navigation requests
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Background sync for when connection is restored
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncDataWithServer());
    }
});

// Sync offline data with server
async function syncDataWithServer() {
    try {
        // Get offline data from IndexedDB
        const offlineData = await getOfflineData();
        
        for (const item of offlineData) {
            try {
                // Attempt to sync each item
                await fetch(item.endpoint, {
                    method: item.method,
                    headers: item.headers,
                    body: item.data
                });
                
                // Remove from offline storage after successful sync
                await removeOfflineData(item.id);
                
            } catch (error) {
                console.log('Failed to sync item:', item.id);
            }
        }
    } catch (error) {
        console.log('Background sync failed:', error);
    }
}

// Helper function to get offline data (placeholder)
async function getOfflineData() {
    // This would integrate with IndexedDB
    return [];
}

// Helper function to remove synced data (placeholder)
async function removeOfflineData(id) {
    // This would remove from IndexedDB
    return true;
}