class SaveSystem {
  constructor() {
    this.dbName = 'rtsGameSaves';
    this.storeName = 'saves';
    this.db = null;
    this.initialize();
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async saveGame(gameState, saveName = 'autosave') {
    if (!this.db) await this.initialize();

    const saveData = {
      id: `${saveName}-${Date.now()}`,
      name: saveName,
      timestamp: Date.now(),
      gameVersion: gameState.version,
      data: gameState.serialize()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(saveData);

      request.onsuccess = () => resolve(saveData.id);
      request.onerror = (event) => {
        console.error('Error saving game:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async loadGame(saveId) {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(saveId);

      request.onsuccess = (event) => {
        if (event.target.result) {
          resolve(event.target.result.data);
        } else {
          reject(new Error(`Save ${saveId} not found`));
        }
      };

      request.onerror = (event) => {
        console.error('Error loading game:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async getSaveList() {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = (event) => {
        const saves = event.target.result.map(save => ({
          id: save.id,
          name: save.name,
          timestamp: save.timestamp,
          gameVersion: save.gameVersion
        }));
        resolve(saves);
      };

      request.onerror = (event) => {
        console.error('Error getting save list:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async deleteSave(saveId) {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(saveId);

      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error('Error deleting save:', event.target.error);
        reject(event.target.error);
      };
    });
  }
}

export default SaveSystem;
