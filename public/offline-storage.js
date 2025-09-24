// Local Storage Manager for offline functionality
class LocalStorageManager {
    constructor() {
        this.dbName = 'MedicalReportsDB';
        this.version = 1;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        
        this.init();
        this.setupEventListeners();
    }
    
    async init() {
        try {
            await this.openDatabase();
            console.log('Local storage initialized');
        } catch (error) {
            console.error('Failed to initialize local storage:', error);
            // Fall back to localStorage if IndexedDB fails
            this.useLocalStorage = true;
        }
    }
    
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('patients')) {
                    const patientsStore = db.createObjectStore('patients', { keyPath: 'id', autoIncrement: true });
                    patientsStore.createIndex('patient_id', 'patient_id', { unique: false });
                    patientsStore.createIndex('created_at', 'created_at', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('reports')) {
                    const reportsStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
                    reportsStore.createIndex('patient_id', 'patient_id', { unique: false });
                    reportsStore.createIndex('created_at', 'created_at', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }
    
    setupEventListeners() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncWithServer();
            this.showNotification('Connection Restored', 'Syncing offline changes...', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('Offline Mode', 'Changes will be saved locally and synced when online', 'warning');
        });
    }
    
    // Store patient data locally
    async storePatient(patientData) {
        if (this.useLocalStorage) {
            return this.storeInLocalStorage('patients', patientData);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['patients'], 'readwrite');
            const store = transaction.objectStore('patients');
            
            patientData.synced = this.isOnline;
            patientData.created_at = patientData.created_at || new Date().toISOString();
            patientData.local_id = Date.now() + Math.random(); // Temporary local ID
            
            const request = store.add(patientData);
            
            request.onsuccess = () => {
                if (!this.isOnline) {
                    this.addToSyncQueue('patients', 'POST', patientData);
                }
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    // Get all patients from local storage
    async getPatients() {
        if (this.useLocalStorage) {
            return this.getFromLocalStorage('patients') || [];
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['patients'], 'readonly');
            const store = transaction.objectStore('patients');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Store report data locally
    async storeReport(reportData) {
        if (this.useLocalStorage) {
            return this.storeInLocalStorage('reports', reportData);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reports'], 'readwrite');
            const store = transaction.objectStore('reports');
            
            reportData.synced = this.isOnline;
            reportData.created_at = reportData.created_at || new Date().toISOString();
            reportData.local_id = Date.now() + Math.random();
            
            const request = store.add(reportData);
            
            request.onsuccess = () => {
                if (!this.isOnline) {
                    this.addToSyncQueue('reports', 'POST', reportData);
                }
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    // Get reports for a patient
    async getReportsForPatient(patientId) {
        if (this.useLocalStorage) {
            const reports = this.getFromLocalStorage('reports') || [];
            return reports.filter(r => r.patient_id === patientId);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reports'], 'readonly');
            const store = transaction.objectStore('reports');
            const index = store.index('patient_id');
            const request = index.getAll(patientId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Add item to sync queue
    async addToSyncQueue(type, method, data) {
        const syncItem = {
            type,
            method,
            data,
            timestamp: Date.now(),
            retries: 0
        };
        
        if (this.useLocalStorage) {
            const queue = this.getFromLocalStorage('syncQueue') || [];
            queue.push(syncItem);
            localStorage.setItem('syncQueue', JSON.stringify(queue));
            return;
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.add(syncItem);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Get sync queue
    async getSyncQueue() {
        if (this.useLocalStorage) {
            return this.getFromLocalStorage('syncQueue') || [];
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Clear sync queue item
    async clearSyncQueueItem(id) {
        if (this.useLocalStorage) {
            const queue = this.getFromLocalStorage('syncQueue') || [];
            const filtered = queue.filter(item => item.id !== id);
            localStorage.setItem('syncQueue', JSON.stringify(filtered));
            return;
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    // Sync with server when online
    async syncWithServer() {
        if (!this.isOnline) return;
        
        try {
            const syncQueue = await this.getSyncQueue();
            let syncedCount = 0;
            
            for (const item of syncQueue) {
                try {
                    let endpoint = '';
                    if (item.type === 'patients') {
                        endpoint = '/api/patients';
                    } else if (item.type === 'reports') {
                        endpoint = '/api/reports';
                    }
                    
                    const response = await fetch(endpoint, {
                        method: item.method,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(item.data)
                    });
                    
                    if (response.ok) {
                        await this.clearSyncQueueItem(item.id);
                        syncedCount++;
                    } else {
                        console.error('Failed to sync item:', item);
                    }
                } catch (error) {
                    console.error('Sync error for item:', item, error);
                }
            }
            
            if (syncedCount > 0) {
                this.showNotification('Sync Complete', `${syncedCount} items synced successfully`, 'success');
            }
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.showNotification('Sync Failed', 'Some changes could not be synced', 'error');
        }
    }
    
    // LocalStorage fallback methods
    storeInLocalStorage(key, data) {
        try {
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            data.id = Date.now() + Math.random();
            existing.push(data);
            localStorage.setItem(key, JSON.stringify(existing));
            return data.id;
        } catch (error) {
            console.error('LocalStorage error:', error);
            return null;
        }
    }
    
    getFromLocalStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (error) {
            console.error('LocalStorage read error:', error);
            return [];
        }
    }
    
    // Get storage usage info
    async getStorageInfo() {
        const info = {
            supported: 'indexedDB' in window,
            online: this.isOnline,
            patients: 0,
            reports: 0,
            syncQueue: 0
        };
        
        try {
            if (this.useLocalStorage) {
                info.patients = (this.getFromLocalStorage('patients') || []).length;
                info.reports = (this.getFromLocalStorage('reports') || []).length;
                info.syncQueue = (this.getFromLocalStorage('syncQueue') || []).length;
            } else {
                info.patients = (await this.getPatients()).length;
                info.reports = (await this.getReportsForPatient(null)).length;
                info.syncQueue = (await this.getSyncQueue()).length;
            }
        } catch (error) {
            console.error('Error getting storage info:', error);
        }
        
        return info;
    }
    
    // Clear all local data
    async clearAllData() {
        if (this.useLocalStorage) {
            localStorage.removeItem('patients');
            localStorage.removeItem('reports');
            localStorage.removeItem('syncQueue');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        });
    }
    
    // Show notification (integrate with existing notification system)
    showNotification(title, message, type) {
        if (typeof showNotification === 'function') {
            showNotification(title, message, type);
        } else {
            console.log(`${title}: ${message}`);
        }
    }
}

// Export for use in main script
window.LocalStorageManager = LocalStorageManager;