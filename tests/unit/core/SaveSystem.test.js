import SaveSystem from '../../../src/core/SaveSystem.js';

describe('SaveSystem', () => {
  let saveSystem;
  let mockIDBRequest;
  let mockIDBObjectStore;
  let mockIDBTransaction;
  let mockIDBDatabase;
  let mockIDBOpenDBRequest;

  beforeEach(() => {
    // Setup IndexedDB mocks
    mockIDBRequest = {
      onsuccess: jest.fn(),
      onerror: jest.fn(),
      result: null,
      error: null
    };

    mockIDBObjectStore = {
      put: jest.fn().mockReturnValue(mockIDBRequest),
      get: jest.fn().mockReturnValue(mockIDBRequest),
      getAll: jest.fn().mockReturnValue(mockIDBRequest),
      delete: jest.fn().mockReturnValue(mockIDBRequest)
    };

    mockIDBTransaction = {
      objectStore: jest.fn().mockReturnValue(mockIDBObjectStore)
    };

    mockIDBDatabase = {
      transaction: jest.fn().mockReturnValue(mockIDBTransaction),
      objectStoreNames: {
        contains: jest.fn().mockReturnValue(true)
      },
      createObjectStore: jest.fn()
    };

    mockIDBOpenDBRequest = {
      result: mockIDBDatabase,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null
    };

    // Mock global.indexedDB since it's not defined in Jest environment
    global.indexedDB = {
      open: jest.fn().mockReturnValue(mockIDBOpenDBRequest)
    };

    // Create SaveSystem instance
    saveSystem = new SaveSystem();
    
    // Simulate successful initialization
    if (mockIDBOpenDBRequest.onsuccess) {
      mockIDBOpenDBRequest.onsuccess({ target: mockIDBOpenDBRequest });
    }
  });

  describe('initialization', () => {
    test('should initialize IndexedDB when created', async () => {
      expect(global.indexedDB.open).toHaveBeenCalledWith('rtsGameSaves', 1);
    });

    test('should create object store if missing during upgrade', () => {
      // Simulate onupgradeneeded
      if (mockIDBOpenDBRequest.onupgradeneeded) {
        mockIDBDatabase.objectStoreNames.contains.mockReturnValueOnce(false);
        const event = { target: mockIDBOpenDBRequest };
        mockIDBOpenDBRequest.onupgradeneeded(event);
        expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('saves', { keyPath: 'id' });
      }
    });
  });

  describe('saveGame', () => {
    test('should save game state to IndexedDB', async () => {
      // Mock database to be available
      saveSystem.db = mockIDBDatabase;
      
      const gameState = {
        version: '1.0.0',
        serialize: jest.fn().mockReturnValue({ data: 'test' })
      };
      
      // Setup promise resolution
      mockIDBRequest.onsuccess.mockImplementation(function(event) {
        // Use the saved ID to resolve the promise
        event.target.result = mockIDBObjectStore.put.mock.calls[0][0].id;
        // Execute the saved onsuccess handler
        saveSystem.saveGame(gameState, 'test-save').then((result) => {
          expect(result).toBe(mockIDBObjectStore.put.mock.calls[0][0].id);
        });
      });
      
      saveSystem.saveGame(gameState, 'test-save');
      
      // Verify method calls
      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['saves'], 'readwrite');
      expect(mockIDBTransaction.objectStore).toHaveBeenCalledWith('saves');
      expect(mockIDBObjectStore.put).toHaveBeenCalled();
      
      // Verify save data
      const saveData = mockIDBObjectStore.put.mock.calls[0][0];
      expect(saveData.name).toBe('test-save');
      expect(saveData.gameVersion).toBe('1.0.0');
      expect(saveData.data).toEqual({ data: 'test' });
    });

    test('should reject promise on error', async () => {
      // Mock database to be available
      saveSystem.db = mockIDBDatabase;
      
      const gameState = {
        version: '1.0.0',
        serialize: jest.fn().mockReturnValue({ data: 'test' })
      };
      
      // Setup promise rejection
      mockIDBRequest.onerror.mockImplementation(function(event) {
        event.target.error = new Error('Save error');
        // Execute the saved onerror handler
        saveSystem.saveGame(gameState, 'test-save').catch((error) => {
          expect(error.message).toBe('Save error');
        });
      });
      
      saveSystem.saveGame(gameState, 'test-save');
    });
  });

  describe('loadGame', () => {
    test('should load game state from IndexedDB', async () => {
      // Mock database to be available
      saveSystem.db = mockIDBDatabase;
      
      const saveId = 'test-save-123';
      const savedData = { data: 'test-data' };
      
      // Setup promise resolution for successful load
      mockIDBRequest.onsuccess.mockImplementation(function(event) {
        event.target.result = { data: savedData };
        // Execute the saved onsuccess handler
        saveSystem.loadGame(saveId).then((result) => {
          expect(result).toEqual(savedData);
        });
      });
      
      saveSystem.loadGame(saveId);
      
      // Verify method calls
      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['saves'], 'readonly');
      expect(mockIDBTransaction.objectStore).toHaveBeenCalledWith('saves');
      expect(mockIDBObjectStore.get).toHaveBeenCalledWith(saveId);
    });

    test('should reject promise if save not found', async () => {
      // Mock database to be available
      saveSystem.db = mockIDBDatabase;
      
      const saveId = 'nonexistent-save';
      
      // Setup promise rejection for save not found
      mockIDBRequest.onsuccess.mockImplementation(function(event) {
        event.target.result = undefined;
        // Execute the saved onsuccess handler that should reject
        saveSystem.loadGame(saveId).catch((error) => {
          expect(error.message).toBe(`Save ${saveId} not found`);
        });
      });
      
      saveSystem.loadGame(saveId);
    });

    test('should reject promise on error', async () => {
      // Mock database to be available
      saveSystem.db = mockIDBDatabase;
      
      const saveId = 'test-save';
      
      // Setup promise rejection for error
      mockIDBRequest.onerror.mockImplementation(function(event) {
        event.target.error = new Error('Load error');
        // Execute the saved onerror handler
        saveSystem.loadGame(saveId).catch((error) => {
          expect(error.message).toBe('Load error');
        });
      });
      
      saveSystem.loadGame(saveId);
    });
  });

  describe('getSaveList', () => {
    test('should get list of saved games', async () => {
      // Mock database to be available
      saveSystem.db = mockIDBDatabase;
      
      const mockSaves = [
        { id: 'save1', name: 'Save 1', timestamp: 123, gameVersion: '1.0.0' },
        { id: 'save2', name: 'Save 2', timestamp: 456, gameVersion: '1.0.0' }
      ];
      
      // Setup promise resolution
      mockIDBRequest.onsuccess.mockImplementation(function(event) {
        event.target.result = mockSaves;
        // Execute the saved onsuccess handler
        saveSystem.getSaveList().then((result) => {
          const expectedResult = mockSaves.map(save => ({
            id: save.id,
            name: save.name,
            timestamp: save.timestamp,
            gameVersion: save.gameVersion
          }));
          expect(result).toEqual(expectedResult);
        });
      });
      
      saveSystem.getSaveList();
      
      // Verify method calls
      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['saves'], 'readonly');
      expect(mockIDBTransaction.objectStore).toHaveBeenCalledWith('saves');
      expect(mockIDBObjectStore.getAll).toHaveBeenCalled();
    });

    test('should reject promise on error', async () => {
      // Mock database to be available
      saveSystem.db = mockIDBDatabase;
      
      // Setup promise rejection
      mockIDBRequest.onerror.mockImplementation(function(event) {
        event.target.error = new Error('GetAll error');
        // Execute the saved onerror handler
        saveSystem.getSaveList().catch((error) => {
          expect(error.message).toBe('GetAll error');
        });
      });
      
      saveSystem.getSaveList();
    });
  });

  describe('deleteSave', () => {
    test('should delete a saved game', async () => {
      // Mock database to be available
      saveSystem.db = mockIDBDatabase;
      
      const saveId = 'save-to-delete';
      
      // Setup promise resolution
      mockIDBRequest.onsuccess.mockImplementation(function(event) {
        // Execute the saved onsuccess handler
        saveSystem.deleteSave(saveId).then((result) => {
          expect(result).toBeUndefined();
        });
      });
      
      saveSystem.deleteSave(saveId);
      
      // Verify method calls
      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['saves'], 'readwrite');
      expect(mockIDBTransaction.objectStore).toHaveBeenCalledWith('saves');
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith(saveId);
    });

    test('should reject promise on error', async () => {
      // Mock database to be available
      saveSystem.db = mockIDBDatabase;
      
      const saveId = 'save-to-delete';
      
      // Setup promise rejection
      mockIDBRequest.onerror.mockImplementation(function(event) {
        event.target.error = new Error('Delete error');
        // Execute the saved onerror handler
        saveSystem.deleteSave(saveId).catch((error) => {
          expect(error.message).toBe('Delete error');
        });
      });
      
      saveSystem.deleteSave(saveId);
    });
  });
});