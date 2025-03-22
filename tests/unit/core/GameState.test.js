import GameState from '../../../src/core/GameState.js';

describe('GameState', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  describe('initialization', () => {
    test('should initialize with empty entities', () => {
      expect(gameState.entities).toBeInstanceOf(Map);
      expect(gameState.entities.size).toBe(0);
    });

    test('should initialize with nextEntityId set to 1', () => {
      expect(gameState.nextEntityId).toBe(1);
    });

    test('should initialize with default resources', () => {
      expect(gameState.playerResources).toEqual({ minerals: 0, gas: 0 });
    });

    test('should initialize with gameTime set to 0', () => {
      expect(gameState.gameTime).toBe(0);
    });

    test('should initialize with version set to 1.0.0', () => {
      expect(gameState.version).toBe('1.0.0');
    });
  });

  describe('update method', () => {
    test('should increment gameTime by deltaTime', () => {
      const initialTime = gameState.gameTime;
      const deltaTime = 0.016; // 16ms, typical frame time
      
      gameState.update(deltaTime);
      
      expect(gameState.gameTime).toBeCloseTo(initialTime + deltaTime);
    });
  });

  describe('serialization', () => {
    test('should serialize state correctly', () => {
      // Setup some test state
      gameState.entities.set(1, { position: true });
      gameState.nextEntityId = 2;
      gameState.playerResources = { minerals: 100, gas: 50 };
      gameState.gameTime = 42;
      
      const serialized = gameState.serialize();
      
      // Verify serialized data
      expect(serialized).toEqual({
        entities: [[1, { position: true }]],
        nextEntityId: 2,
        playerResources: { minerals: 100, gas: 50 },
        gameTime: 42,
        version: '1.0.0',
        timestamp: expect.any(Number)
      });
    });

    test('should deserialize state correctly', () => {
      const testData = {
        entities: [[1, { position: true }], [2, { health: true }]],
        nextEntityId: 3,
        playerResources: { minerals: 100, gas: 50 },
        gameTime: 42,
        version: '1.0.0'
      };
      
      gameState.deserialize(testData);
      
      // Verify deserialized state
      expect(gameState.entities.size).toBe(2);
      expect(gameState.entities.get(1)).toEqual({ position: true });
      expect(gameState.entities.get(2)).toEqual({ health: true });
      expect(gameState.nextEntityId).toBe(3);
      expect(gameState.playerResources).toEqual({ minerals: 100, gas: 50 });
      expect(gameState.gameTime).toBe(42);
      expect(gameState.version).toBe('1.0.0');
    });
  });
});