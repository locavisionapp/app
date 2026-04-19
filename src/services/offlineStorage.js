class OfflineStorage {
  constructor() {
    this.dbName = 'LocaVisionDB';
    this.version = 1;
    this.db = null;
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('inspections')) {
          const inspectionStore = db.createObjectStore('inspections', { keyPath: 'id' });
          inspectionStore.createIndex('vehicleId', 'vehicleId', { unique: false });
          inspectionStore.createIndex('clientId', 'clientId', { unique: false });
          inspectionStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' });
          imageStore.createIndex('inspectionId', 'inspectionId', { unique: false });
        }

        if (!db.objectStoreNames.contains('vehicles')) {
          const vehicleStore = db.createObjectStore('vehicles', { keyPath: 'id' });
          vehicleStore.createIndex('licensePlate', 'licensePlate', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async storeInspection(inspectionData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inspections', 'syncQueue'], 'readwrite');
      const inspectionStore = transaction.objectStore('inspections');
      const syncStore = transaction.objectStore('syncQueue');

      const request = inspectionStore.put({
        ...inspectionData,
        synced: false,
        lastModified: new Date().toISOString()
      });

      request.onsuccess = () => {
        // Add to sync queue
        syncStore.add({
          type: 'inspection',
          data: inspectionData,
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async storeImage(imageData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images', 'syncQueue'], 'readwrite');
      const imageStore = transaction.objectStore('images');
      const syncStore = transaction.objectStore('syncQueue');

      const request = imageStore.put({
        ...imageData,
        synced: false,
        lastModified: new Date().toISOString()
      });

      request.onsuccess = () => {
        syncStore.add({
          type: 'image',
          data: imageData,
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getInspections(vehicleId = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inspections'], 'readonly');
      const store = transaction.objectStore('inspections');

      let request;
      if (vehicleId) {
        const index = store.index('vehicleId');
        request = index.getAll(vehicleId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getImages(inspectionId = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');

      let request;
      if (inspectionId) {
        const index = store.index('inspectionId');
        request = index.getAll(inspectionId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(type, id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const storeName = type === 'inspection' ? 'inspections' : 'images';
      const transaction = this.db.transaction([storeName, 'syncQueue'], 'readwrite');
      const store = transaction.objectStore(storeName);
      const syncStore = transaction.objectStore('syncQueue');

      // Mark item as synced
      const updateRequest = store.get(id);
      updateRequest.onsuccess = () => {
        const item = updateRequest.result;
        if (item) {
          item.synced = true;
          item.syncedAt = new Date().toISOString();
          store.put(item);
        }
      };

      // Remove from sync queue
      const deleteRequest = syncStore.delete(id);
      deleteRequest.onsuccess = resolve;
      deleteRequest.onerror = reject;
    });
  }

  async retrySync(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const request = store.get(id);
      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastRetry = new Date().toISOString();
          store.put(item);
        }
        resolve();
      };
      request.onerror = reject;
    });
  }

  async clearSyncedData() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inspections', 'images'], 'readwrite');
      const inspectionStore = transaction.objectStore('inspections');
      const imageStore = transaction.objectStore('images');

      // Clear synced inspections older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const inspectionIndex = inspectionStore.index('createdAt');
      const inspectionRequest = inspectionIndex.openCursor(IDBKeyRange.upperBound(thirtyDaysAgo));

      inspectionRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const inspection = cursor.value;
          if (inspection.synced) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      // Clear synced images older than 30 days
      const imageIndex = imageStore.index('inspectionId');
      const imageRequest = imageIndex.openCursor();

      imageRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const image = cursor.value;
          if (image.synced && new Date(image.lastModified) < thirtyDaysAgo) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = resolve;
      transaction.onerror = reject;
    });
  }

  getStorageStats() {
    if (!this.db) return Promise.resolve({});

    return new Promise((resolve) => {
      const stats = {
        inspections: { total: 0, synced: 0, pending: 0 },
        images: { total: 0, synced: 0, pending: 0 },
        syncQueue: 0
      };

      const transaction = this.db.transaction(['inspections', 'images', 'syncQueue'], 'readonly');
      
      // Count inspections
      const inspectionStore = transaction.objectStore('inspections');
      inspectionStore.count().onsuccess = (e) => {
        stats.inspections.total = e.target.result;
      };

      // Count images
      const imageStore = transaction.objectStore('images');
      imageStore.count().onsuccess = (e) => {
        stats.images.total = e.target.result;
      };

      // Count sync queue
      const syncStore = transaction.objectStore('syncQueue');
      syncStore.count().onsuccess = (e) => {
        stats.syncQueue = e.target.result;
      };

      transaction.oncomplete = () => {
        // Count synced vs pending
        const inspectionRequest = inspectionStore.openCursor();
        inspectionRequest.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (cursor.value.synced) {
              stats.inspections.synced++;
            } else {
              stats.inspections.pending++;
            }
            cursor.continue();
          }
        };

        const imageRequest = imageStore.openCursor();
        imageRequest.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (cursor.value.synced) {
              stats.images.synced++;
            } else {
              stats.images.pending++;
            }
            cursor.continue();
          }
        };

        setTimeout(() => resolve(stats), 100);
      };
    });
  }
}

export const offlineStorage = new OfflineStorage();
