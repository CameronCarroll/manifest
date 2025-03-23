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
      
    return entityId;
  }
    
  // Create terrain features
  createTerrainFeature(type, position, scale) {
    // Override in subclasses or implement generic terrain creation
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