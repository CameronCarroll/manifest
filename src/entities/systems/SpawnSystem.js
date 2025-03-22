class SpawnSystem {
  constructor(entityManager) {
    this.entityManager = entityManager;
    this.spawnPoints = new Map(); // Maps spawnPointId to spawn point data
    this.activeWaves = new Map(); // Maps waveId to wave data
    this.nextSpawnPointId = 1;
    this.nextWaveId = 1;
    
    // Enemy unit templates
    this.enemyTemplates = {
      // Light Infantry: Fast, low health, low damage
      lightInfantry: {
        components: {
          position: { x: 0, y: 0, z: 0, rotation: 0 },
          health: { maxHealth: 60, armor: 2, regeneration: 0 },
          render: { 
            meshId: 'unit', 
            scale: { x: 0.8, y: 0.8, z: 0.8 }, 
            color: 0xff5555 
          },
          faction: { 
            faction: 'enemy', 
            unitType: 'light', 
            attackType: 'ranged', 
            damageType: 'normal' 
          }
        },
        speed: 7 // Faster movement
      },
      
      // Heavy Infantry: Slow, high health, high damage
      heavyInfantry: {
        components: {
          position: { x: 0, y: 0, z: 0, rotation: 0 },
          health: { maxHealth: 150, armor: 8, regeneration: 0 },
          render: { 
            meshId: 'unit', 
            scale: { x: 1.2, y: 1.2, z: 1.2 }, 
            color: 0x990000 
          },
          faction: { 
            faction: 'enemy', 
            unitType: 'heavy', 
            attackType: 'melee', 
            damageType: 'normal' 
          }
        },
        speed: 3 // Slower movement
      },
      
      // Support Units: Provide buffs or healing to other enemies
      supportUnit: {
        components: {
          position: { x: 0, y: 0, z: 0, rotation: 0 },
          health: { maxHealth: 80, armor: 3, regeneration: 2 },
          render: { 
            meshId: 'unit', 
            scale: { x: 0.9, y: 1.1, z: 0.9 }, 
            color: 0xaa5500 
          },
          faction: { 
            faction: 'enemy', 
            unitType: 'support', 
            attackType: 'ranged', 
            damageType: 'normal' 
          }
        },
        speed: 4
      },
      
      // Sniper Units: Long range, high damage, low health
      sniperUnit: {
        components: {
          position: { x: 0, y: 0, z: 0, rotation: 0 },
          health: { maxHealth: 70, armor: 1, regeneration: 0 },
          render: { 
            meshId: 'unit', 
            scale: { x: 0.8, y: 1.0, z: 0.8 }, 
            color: 0x550000 
          },
          faction: { 
            faction: 'enemy', 
            unitType: 'sniper', 
            attackType: 'ranged', 
            damageType: 'piercing' 
          }
        },
        speed: 4
      },
      
      // Specialist Units: Unique abilities like stealth, area denial
      specialistUnit: {
        components: {
          position: { x: 0, y: 0, z: 0, rotation: 0 },
          health: { maxHealth: 90, armor: 4, regeneration: 1 },
          render: { 
            meshId: 'unit', 
            scale: { x: 1.0, y: 1.0, z: 1.0 }, 
            color: 0x880088 
          },
          faction: { 
            faction: 'enemy', 
            unitType: 'specialist', 
            attackType: 'ranged', 
            damageType: 'special' 
          }
        },
        speed: 5
      },
      
      // Elite Units: Rare, powerful enemies with special abilities
      eliteUnit: {
        components: {
          position: { x: 0, y: 0, z: 0, rotation: 0 },
          health: { maxHealth: 250, armor: 12, regeneration: 3 },
          render: { 
            meshId: 'unit', 
            scale: { x: 1.5, y: 1.5, z: 1.5 }, 
            color: 0xdd0000 
          },
          faction: { 
            faction: 'enemy', 
            unitType: 'elite', 
            attackType: 'melee', 
            damageType: 'special' 
          }
        },
        speed: 4
      }
    };
  }

  initialize() {
    // Initialize system if needed
  }

  // Create a spawn point at the specified position
  createSpawnPoint(position) {
    const spawnPointId = this.nextSpawnPointId++;
    
    this.spawnPoints.set(spawnPointId, {
      position: { ...position },
      active: true,
      lastSpawnTime: 0
    });
    
    return spawnPointId;
  }

  // Remove a spawn point
  removeSpawnPoint(spawnPointId) {
    return this.spawnPoints.delete(spawnPointId);
  }

  // Create a wave of enemies
  createWave(config) {
    const waveId = this.nextWaveId++;
    
    this.activeWaves.set(waveId, {
      spawnPointIds: config.spawnPointIds || [],
      enemyTypes: config.enemyTypes || ['lightInfantry'],
      totalEnemies: config.totalEnemies || 5,
      spawnedEnemies: 0,
      spawnInterval: config.spawnInterval || 2,
      lastSpawnTime: 0,
      active: true,
      completed: false
    });
    
    return waveId;
  }

  // Spawn a single enemy of the specified type at the specified position
  spawnEnemy(enemyType, position, aiSystem) {
    // Make sure the enemy type exists in templates
    if (!this.enemyTemplates[enemyType]) {
      console.error(`Enemy type ${enemyType} not found in templates`);
      return null;
    }
    
    // Create a new entity
    const entityId = this.entityManager.createEntity();
    
    // Get the template for this enemy type
    const template = this.enemyTemplates[enemyType];
    
    // Add all components from the template
    for (const [componentType, componentData] of Object.entries(template.components)) {
      // For position component, use the provided spawn position
      if (componentType === 'position') {
        const positionData = { ...componentData };
        positionData.x = position.x;
        positionData.y = position.y;
        positionData.z = position.z;
        this.entityManager.addComponent(entityId, componentType, positionData);
      } else {
        this.entityManager.addComponent(entityId, componentType, { ...componentData });
      }
    }
    
    // Register with AI system if provided
    if (aiSystem) {
      aiSystem.registerEntity(entityId, template.components.faction.unitType);
    }
    
    return entityId;
  }

  update(deltaTime, aiSystem) {
    // Process all active waves
    this.activeWaves.forEach((wave, waveId) => {
      if (!wave.active || wave.completed) return;
      
      wave.lastSpawnTime += deltaTime;
      
      // Check if it's time to spawn another enemy
      if (wave.lastSpawnTime >= wave.spawnInterval && wave.spawnedEnemies < wave.totalEnemies) {
        // Reset spawn timer
        wave.lastSpawnTime = 0;
        
        // Choose a random spawn point from the wave's spawn points
        if (wave.spawnPointIds.length > 0) {
          const randomIndex = Math.floor(Math.random() * wave.spawnPointIds.length);
          const spawnPointId = wave.spawnPointIds[randomIndex];
          const spawnPoint = this.spawnPoints.get(spawnPointId);
          
          if (spawnPoint && spawnPoint.active) {
            // Choose a random enemy type from the wave's enemy types
            const randomEnemyIndex = Math.floor(Math.random() * wave.enemyTypes.length);
            const enemyType = wave.enemyTypes[randomEnemyIndex];
            
            // Spawn the enemy
            this.spawnEnemy(enemyType, spawnPoint.position, aiSystem);
            
            // Update spawn count
            wave.spawnedEnemies++;
            
            // Update spawn point's last spawn time
            spawnPoint.lastSpawnTime = 0;
          }
        }
      }
      
      // Check if wave is complete
      if (wave.spawnedEnemies >= wave.totalEnemies) {
        wave.completed = true;
      }
    });
  }

  // For serialization
  serialize() {
    return {
      spawnPoints: Array.from(this.spawnPoints.entries()),
      activeWaves: Array.from(this.activeWaves.entries()),
      nextSpawnPointId: this.nextSpawnPointId,
      nextWaveId: this.nextWaveId
    };
  }

  // For deserialization
  deserialize(data) {
    this.spawnPoints = new Map(data.spawnPoints);
    this.activeWaves = new Map(data.activeWaves);
    this.nextSpawnPointId = data.nextSpawnPointId;
    this.nextWaveId = data.nextWaveId;
  }
}

export default SpawnSystem;
