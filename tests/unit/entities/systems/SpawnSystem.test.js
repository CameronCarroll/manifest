import SpawnSystem from '../../../src/entities/systems/SpawnSystem.js';

describe('SpawnSystem', () => {
  let spawnSystem;
  let mockEntityManager;
  let mockAISystem;

  beforeEach(() => {
    // Set up mocks
    mockEntityManager = {
      createEntity: jest.fn().mockReturnValue(1),
      addComponent: jest.fn()
    };
    
    mockAISystem = {
      registerEntity: jest.fn()
    };
    
    spawnSystem = new SpawnSystem(mockEntityManager);
  });

  describe('initialization', () => {
    test('should initialize with empty maps and default IDs', () => {
      expect(spawnSystem.spawnPoints).toBeInstanceOf(Map);
      expect(spawnSystem.spawnPoints.size).toBe(0);
      expect(spawnSystem.activeWaves).toBeInstanceOf(Map);
      expect(spawnSystem.activeWaves.size).toBe(0);
      expect(spawnSystem.nextSpawnPointId).toBe(1);
      expect(spawnSystem.nextWaveId).toBe(1);
    });

    test('should define enemy templates', () => {
      expect(spawnSystem.enemyTemplates).toBeDefined();
      expect(Object.keys(spawnSystem.enemyTemplates).length).toBeGreaterThan(0);
      
      // Check template structure
      const template = spawnSystem.enemyTemplates.lightInfantry;
      expect(template.components.position).toBeDefined();
      expect(template.components.health).toBeDefined();
      expect(template.components.render).toBeDefined();
      expect(template.components.faction).toBeDefined();
      expect(template.speed).toBeDefined();
    });
  });

  describe('createSpawnPoint', () => {
    test('should create spawn point with the specified position', () => {
      const position = { x: 10, y: 0, z: 20 };
      const spawnPointId = spawnSystem.createSpawnPoint(position);
      
      expect(spawnPointId).toBe(1);
      expect(spawnSystem.nextSpawnPointId).toBe(2);
      expect(spawnSystem.spawnPoints.has(1)).toBe(true);
      
      const spawnPoint = spawnSystem.spawnPoints.get(1);
      expect(spawnPoint.position).toEqual(position);
      expect(spawnPoint.active).toBe(true);
      expect(spawnPoint.lastSpawnTime).toBe(0);
    });

    test('should create multiple spawn points with incrementing IDs', () => {
      const pos1 = { x: 10, y: 0, z: 20 };
      const pos2 = { x: -10, y: 0, z: -20 };
      
      const id1 = spawnSystem.createSpawnPoint(pos1);
      const id2 = spawnSystem.createSpawnPoint(pos2);
      
      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(spawnSystem.nextSpawnPointId).toBe(3);
      
      expect(spawnSystem.spawnPoints.get(1).position).toEqual(pos1);
      expect(spawnSystem.spawnPoints.get(2).position).toEqual(pos2);
    });
  });

  describe('removeSpawnPoint', () => {
    test('should remove spawn point by ID', () => {
      // Create spawn point
      const spawnPointId = spawnSystem.createSpawnPoint({ x: 0, y: 0, z: 0 });
      expect(spawnSystem.spawnPoints.has(spawnPointId)).toBe(true);
      
      // Remove it
      const result = spawnSystem.removeSpawnPoint(spawnPointId);
      
      expect(result).toBe(true);
      expect(spawnSystem.spawnPoints.has(spawnPointId)).toBe(false);
    });

    test('should return false when removing non-existent spawn point', () => {
      const result = spawnSystem.removeSpawnPoint(999);
      expect(result).toBe(false);
    });
  });

  describe('createWave', () => {
    test('should create wave with specified configuration', () => {
      const config = {
        spawnPointIds: [1, 2],
        enemyTypes: ['lightInfantry', 'heavyInfantry'],
        totalEnemies: 10,
        spawnInterval: 2
      };
      
      const waveId = spawnSystem.createWave(config);
      
      expect(waveId).toBe(1);
      expect(spawnSystem.nextWaveId).toBe(2);
      expect(spawnSystem.activeWaves.has(1)).toBe(true);
      
      const wave = spawnSystem.activeWaves.get(1);
      expect(wave.spawnPointIds).toEqual([1, 2]);
      expect(wave.enemyTypes).toEqual(['lightInfantry', 'heavyInfantry']);
      expect(wave.totalEnemies).toBe(10);
      expect(wave.spawnInterval).toBe(2);
      expect(wave.spawnedEnemies).toBe(0);
      expect(wave.active).toBe(true);
      expect(wave.completed).toBe(false);
    });

    test('should create wave with default values when not specified', () => {
      const waveId = spawnSystem.createWave({});
      
      const wave = spawnSystem.activeWaves.get(waveId);
      expect(wave.spawnPointIds).toEqual([]);
      expect(wave.enemyTypes).toEqual(['lightInfantry']);
      expect(wave.totalEnemies).toBe(5);
      expect(wave.spawnInterval).toBe(2);
    });

    test('should create multiple waves with incrementing IDs', () => {
      const id1 = spawnSystem.createWave({});
      const id2 = spawnSystem.createWave({});
      
      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(spawnSystem.nextWaveId).toBe(3);
    });
  });

  describe('spawnEnemy', () => {
    test('should return null if enemy type does not exist', () => {
      const result = spawnSystem.spawnEnemy('nonExistentType', { x: 0, y: 0, z: 0 });
      expect(result).toBeNull();
    });

    test('should create entity with components from template', () => {
      const position = { x: 10, y: 0, z: 20 };
      
      spawnSystem.spawnEnemy('lightInfantry', position, mockAISystem);
      
      // Check entity was created
      expect(mockEntityManager.createEntity).toHaveBeenCalled();
      
      // Check components were added
      expect(mockEntityManager.addComponent).toHaveBeenCalledTimes(4); // position, health, render, faction
      
      // Check position component was added with correct position
      expect(mockEntityManager.addComponent).toHaveBeenCalledWith(
        1,
        'position',
        expect.objectContaining({
          x: 10,
          y: 0,
          z: 20
        })
      );
      
      // Check health component was added
      expect(mockEntityManager.addComponent).toHaveBeenCalledWith(
        1,
        'health',
        expect.anything()
      );
      
      // Check AI system registration
      expect(mockAISystem.registerEntity).toHaveBeenCalledWith(1, expect.any(String));
    });

    test('should work without AI system', () => {
      spawnSystem.spawnEnemy('lightInfantry', { x: 0, y: 0, z: 0 });
      expect(mockEntityManager.createEntity).toHaveBeenCalled();
      expect(mockEntityManager.addComponent).toHaveBeenCalled();
      // No error without AI system
    });
  });

  describe('update', () => {
    beforeEach(() => {
      // Create spawn point
      spawnSystem.createSpawnPoint({ x: 0, y: 0, z: 0 });
      
      // Spy on spawnEnemy
      jest.spyOn(spawnSystem, 'spawnEnemy').mockImplementation(() => 1);
    });

    test('should spawn enemies at interval until wave is complete', () => {
      // Create wave with one spawn point
      spawnSystem.createWave({
        spawnPointIds: [1],
        enemyTypes: ['lightInfantry'],
        totalEnemies: 2,
        spawnInterval: 1
      });
      
      // First update - should spawn first enemy
      spawnSystem.update(1.5, mockAISystem);
      
      // Check first enemy spawned
      expect(spawnSystem.spawnEnemy).toHaveBeenCalledTimes(1);
      expect(spawnSystem.activeWaves.get(1).spawnedEnemies).toBe(1);
      expect(spawnSystem.activeWaves.get(1).lastSpawnTime).toBe(0);
      
      // Second update - should spawn second enemy
      spawnSystem.update(1.5, mockAISystem);
      
      // Check second enemy spawned
      expect(spawnSystem.spawnEnemy).toHaveBeenCalledTimes(2);
      expect(spawnSystem.activeWaves.get(1).spawnedEnemies).toBe(2);
      
      // Third update - should not spawn more (wave complete)
      spawnSystem.update(1.5, mockAISystem);
      
      // Check no more spawned
      expect(spawnSystem.spawnEnemy).toHaveBeenCalledTimes(2);
      expect(spawnSystem.activeWaves.get(1).completed).toBe(true);
    });

    test('should not spawn if interval time has not passed', () => {
      // Create wave
      spawnSystem.createWave({
        spawnPointIds: [1],
        totalEnemies: 5,
        spawnInterval: 2
      });
      
      // Update with small deltaTime
      spawnSystem.update(0.5, mockAISystem);
      
      // Check no enemy spawned yet
      expect(spawnSystem.spawnEnemy).not.toHaveBeenCalled();
      expect(spawnSystem.activeWaves.get(1).spawnedEnemies).toBe(0);
      expect(spawnSystem.activeWaves.get(1).lastSpawnTime).toBe(0.5);
    });

    test('should ignore inactive waves', () => {
      // Create wave but set inactive
      spawnSystem.createWave({
        spawnPointIds: [1],
        totalEnemies: 5
      });
      spawnSystem.activeWaves.get(1).active = false;
      
      // Update
      spawnSystem.update(2, mockAISystem);
      
      // Check no enemy spawned
      expect(spawnSystem.spawnEnemy).not.toHaveBeenCalled();
    });

    test('should choose random spawn point and enemy type', () => {
      // Create another spawn point
      spawnSystem.createSpawnPoint({ x: 10, y: 0, z: 10 });
      
      // Create wave with multiple spawn points and enemy types
      spawnSystem.createWave({
        spawnPointIds: [1, 2],
        enemyTypes: ['lightInfantry', 'heavyInfantry'],
        totalEnemies: 1
      });
      
      // Mock random to be deterministic
      jest.spyOn(global.Math, 'random')
        .mockReturnValueOnce(0.3) // For spawn point selection
        .mockReturnValueOnce(0.7); // For enemy type selection
      
      // Update
      spawnSystem.update(2, mockAISystem);
      
      // Check enemy spawned with correct parameters
      expect(spawnSystem.spawnEnemy).toHaveBeenCalledWith(
        'heavyInfantry',
        expect.anything(),
        mockAISystem
      );
    });
  });

  describe('serialization', () => {
    test('should correctly serialize and deserialize state', () => {
      // Set up some initial state
      spawnSystem.createSpawnPoint({ x: 0, y: 0, z: 0 });
      spawnSystem.createWave({
        spawnPointIds: [1],
        enemyTypes: ['lightInfantry'],
        totalEnemies: 5
      });
      
      // Serialize
      const serialized = spawnSystem.serialize();
      
      // Create a new system
      const newSystem = new SpawnSystem(mockEntityManager);
      
      // Deserialize
      newSystem.deserialize(serialized);
      
      // Check state was preserved
      expect(newSystem.spawnPoints.size).toBe(1);
      expect(newSystem.activeWaves.size).toBe(1);
      expect(newSystem.nextSpawnPointId).toBe(2);
      expect(newSystem.nextWaveId).toBe(2);
      
      const wave = newSystem.activeWaves.get(1);
      expect(wave.totalEnemies).toBe(5);
      expect(wave.enemyTypes).toEqual(['lightInfantry']);
    });
  });
});