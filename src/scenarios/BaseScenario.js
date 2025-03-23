// scenarios/BaseScenario.js
class BaseScenario {
  constructor(gameController) {
    this.gameController = gameController;
    this.entityManager = gameController.entityManager;
    this.systems = gameController.systems;
    this.gameState = gameController.gameState;
      
    // Scenario configuration
    this.name = 'Base Scenario';
    this.description = 'Base scenario class for inheritance';
      
    // Victory/defeat conditions
    this.victoryConditions = [];
    this.defeatConditions = [];
    
    // New configuration for scenario features
    this.features = {
      resources: false,    // Toggle resource UI
      production: false,   // Toggle production queue UI
      economyManagement: false  // Could be used for more complex economic scenarios
    };
  }
    
  // Initialize the scenario
  start() {
    console.log(`Starting scenario: ${this.name}`);
    // Override in subclasses
  }
    
  // Update scenario-specific logic
  update(deltaTime) {
    // Override in subclasses
  }
    
  // Check if victory conditions are met
  checkVictory() {
    // Basic implementation, override for complex conditions
    return false;
  }
    
  // Check if defeat conditions are met
  checkDefeat() {
    // Basic implementation, override for complex conditions
    return false;
  }
    
  // Create a player unit
  createPlayerUnit(unitType, position) {
    const entityId = this.entityManager.createEntity();
    
    // Add base components
    this.entityManager.addComponent(entityId, 'position', {
      x: position.x,
      y: position.y || 0,
      z: position.z,
      rotation: Math.random() * Math.PI * 2
    });
    
    // Add health component
    this.entityManager.addComponent(entityId, 'health', {
      maxHealth: 100
    });
    
    // Add render component
    this.entityManager.addComponent(entityId, 'render', {
      meshId: 'unit',
      scale: { x: 1, y: 1, z: 1 },
      color: 0x0000ff
    });
    
    // Add faction component
    this.entityManager.addComponent(entityId, 'faction', {
      faction: 'player',
      unitType: unitType || 'assault',
      attackType: 'ranged',
      damageType: 'normal'
    });
    
    // Register with collision system if available
    if (this.systems && this.systems.collision) {
      this.systems.collision.registerEntity(entityId, false); // Not static
    }
    
    return entityId;
  }
    
  createTerrainFeature(type, position, scale) {
    const entityId = this.entityManager.createEntity();
    
    // Add position component
    this.entityManager.addComponent(entityId, 'position', {
      x: position.x,
      y: position.y || 0,
      z: position.z
    });
    
    // Add render component with type-specific properties
    let meshId = 'terrain';
    let color = 0x7b7b7b; // Default gray
    let entityScale = scale || { x: 1, y: 1, z: 1 };
    
    if (type === 'rock') {
      color = 0x7b7b7b;
      entityScale = scale || { x: 2 + Math.random() * 1.5, y: 2 + Math.random(), z: 2 + Math.random() * 1.5 };
    } else if (type === 'hill') {
      meshId = 'hill';
      color = 0x6b8e4e; // Green
      entityScale = scale || { x: 5 + Math.random() * 5, y: 2 + Math.random() * 2, z: 5 + Math.random() * 5 };
    } else if (type === 'tree') {
      meshId = 'tree';
      color = 0x228B22; // Forest green
      entityScale = scale || { x: 1.5, y: 3, z: 1.5 };
    }
    
    this.entityManager.addComponent(entityId, 'render', {
      meshId: meshId,
      color: color,
      scale: entityScale
    });
    
    // Register with collision system if available
    if (this.systems && this.systems.collision) {
      this.systems.collision.registerEntity(entityId, true); // Static object
    }
    
    return entityId;
  }
    
  // Create resources
  createResourceNode(type, position, amount) {
    const entityId = this.entityManager.createEntity();
      
    this.entityManager.addComponent(entityId, 'position', {
      x: position.x,
      y: position.y || 0,
      z: position.z
    });
      
    this.entityManager.addComponent(entityId, 'resource', {
      type: type || 'minerals',
      amount: amount || 1000
    });
      
    // Add a visual representation
    const color = type === 'gas' ? 0x00ffff : 0xffff00;
    this.entityManager.addComponent(entityId, 'render', {
      meshId: 'resource',
      scale: { x: 1.5, y: 1, z: 1.5 },
      color: color
    });
    
    // Register with collision system if available
    if (this.systems && this.systems.collision) {
      this.systems.collision.registerEntity(entityId, true); // Static object
    }
      
    return entityId;
  }
    
  // Helper to setup wave-based enemies
  setupEnemyWaves(spawnPoints, waves) {
    // Create spawn points
    const spawnPointIds = spawnPoints.map(position => 
      this.systems.spawn.createSpawnPoint(position)
    );
      
    // Create waves
    waves.forEach(waveConfig => {
      this.systems.spawn.createWave({
        spawnPointIds: spawnPointIds,
        ...waveConfig
      });
    });
  }
}
  
export default BaseScenario;