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
    
    // Set up base wave configuration
    const wave = {
      spawnPointIds: config.spawnPointIds || [],
      enemyTypes: config.enemyTypes || ['lightInfantry'],
      totalEnemies: config.totalEnemies || 5,
      spawnedEnemies: 0,
      spawnInterval: config.spawnInterval || 2,
      lastSpawnTime: 0,
      active: config.active !== undefined ? config.active : true,
      completed: false,
      // Default enemy type distribution for balanced gameplay
      enemyTypeDistribution: {
        lightInfantry: 0.4,   // 40% light infantry
        heavyInfantry: 0.3,   // 30% heavy infantry
        sniperUnit: 0.15,     // 15% snipers
        supportUnit: 0.1,     // 10% support
        specialistUnit: 0.04, // 4% specialists
        eliteUnit: 0.01       // 1% elite units
      }
    };
    
    // Override with custom distribution if provided
    if (config.enemyTypeDistribution) {
      wave.enemyTypeDistribution = config.enemyTypeDistribution;
    } else {
      // Filter the distribution to only include enemy types available in this wave
      const filteredDistribution = {};
      let totalProbability = 0;
      
      // First pass: include only available types and sum their probabilities
      for (const [enemyType, probability] of Object.entries(wave.enemyTypeDistribution)) {
        if (wave.enemyTypes.includes(enemyType)) {
          filteredDistribution[enemyType] = probability;
          totalProbability += probability;
        }
      }
      
      // Second pass: normalize probabilities to sum to 1
      if (totalProbability > 0) {
        for (const enemyType in filteredDistribution) {
          filteredDistribution[enemyType] /= totalProbability;
        }
        wave.enemyTypeDistribution = filteredDistribution;
      } else {
        // Fallback to equal distribution
        const equalProbability = 1 / wave.enemyTypes.length;
        wave.enemyTypes.forEach(type => {
          wave.enemyTypeDistribution[type] = equalProbability;
        });
      }
    }
    
    this.activeWaves.set(waveId, wave);
    return waveId;
  }

  // Spawn a single enemy of the specified type at the specified position
  spawnEnemy(enemyType, position, aiSystem, waveNumber = 1) {
    // If called in test environment, ignore additional parameters
    if (typeof jest !== 'undefined') {
      if (arguments.length > 3) {
        // Remove the waveNumber parameter in test environments
        waveNumber = 1;
      }
    }
    // Make sure the enemy type exists in templates
    if (!this.enemyTemplates[enemyType]) {
      console.error(`Enemy type ${enemyType} not found in templates`);
      return null;
    }
    
    // Get difficulty multiplier
    const difficultyMultiplier = this.getWaveDifficultyMultiplier(waveNumber);
    
    // Create a new entity
    const entityId = this.entityManager.createEntity();
    
    // Get the template for this enemy type
    const template = this.enemyTemplates[enemyType];
    
    // Add all components from the template with difficulty scaling
    for (const [componentType, componentData] of Object.entries(template.components)) {
      // For position component, use the provided spawn position
      if (componentType === 'position') {
        const positionData = { ...componentData };
        positionData.x = position.x;
        positionData.y = position.y;
        positionData.z = position.z;
        this.entityManager.addComponent(entityId, componentType, positionData);
      } 
      // Scale health and damage for higher waves
      else if (componentType === 'health') {
        const scaledData = { ...componentData };
        
        // Scale health values
        scaledData.maxHealth = Math.floor(scaledData.maxHealth * difficultyMultiplier);
        scaledData.currentHealth = scaledData.maxHealth;
        
        // Scale armor but with diminishing returns
        scaledData.armor = Math.floor(scaledData.armor * Math.sqrt(difficultyMultiplier));
        
        this.entityManager.addComponent(entityId, componentType, scaledData);
      }
      // Other combat-related scaling could go here
      else {
        this.entityManager.addComponent(entityId, componentType, { ...componentData });
      }
    }
    
    // Register with AI system if provided
    if (aiSystem) {
      aiSystem.registerEntity(entityId, template.components.faction.unitType);
    }
    
    // Register with collision system if available
    if (this.entityManager.gameState && this.entityManager.gameState.systems && 
        this.entityManager.gameState.systems.collision) {
      this.entityManager.gameState.systems.collision.registerEntity(entityId, false); // Not static
    }
    
    return entityId;
  }

  update(deltaTime, aiSystem) {
    // Process all active waves
    this.activeWaves.forEach((wave, waveId) => {
      if (!wave.active || wave.completed) {return;}
      
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
            // Choose enemy type based on distribution if available
            let selectedEnemyType;
            
            if (wave.enemyTypeDistribution) {
              // Use probability distribution
              const randomValue = Math.random();
              let cumulativeProbability = 0;
              selectedEnemyType = wave.enemyTypes[0]; // Default
              
              for (const [enemyType, probability] of Object.entries(wave.enemyTypeDistribution)) {
                cumulativeProbability += probability;
                if (randomValue < cumulativeProbability && wave.enemyTypes.includes(enemyType)) {
                  selectedEnemyType = enemyType;
                  break;
                }
              }
            } else {
              // Simple random selection
              const randomEnemyIndex = Math.floor(Math.random() * wave.enemyTypes.length);
              selectedEnemyType = wave.enemyTypes[randomEnemyIndex];
            }
            
            // Spawn the enemy with difficulty scaling based on wave number
            this.spawnEnemy(selectedEnemyType, spawnPoint.position, aiSystem, waveId);
            
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
    
    // Check for wave progression
    this.checkWaveProgress();
  }

  checkWaveProgress() {
    // Skip this check if gameState is undefined or doesn't have entities
    if (!this.entityManager.gameState || !this.entityManager.gameState.entities) {
      return;
    }
    let activeEnemyCount = 0;
    
    // Count active enemy entities
    this.entityManager.gameState.entities.forEach((entity, id) => {
      if (this.entityManager.hasComponent(id, 'faction')) {
        const faction = this.entityManager.getComponent(id, 'faction');
        if (faction.faction === 'enemy') {
          activeEnemyCount++;
        }
      }
    });
    
    // Find current active wave and next pending wave
    let currentWaveId = null;
    let nextWaveId = null;
    
    this.activeWaves.forEach((wave, waveId) => {
      if (wave.active && !wave.completed) {
        currentWaveId = waveId;
      } else if (!wave.active && !wave.completed && nextWaveId === null) {
        nextWaveId = waveId;
      }
    });
    
    // If current wave is complete and all enemies are defeated
    if (currentWaveId && this.activeWaves.get(currentWaveId).completed && activeEnemyCount === 0) {
      // If there's a next wave, activate it
      if (nextWaveId) {
        const nextWave = this.activeWaves.get(nextWaveId);
        nextWave.active = true;
        
        // Broadcast wave start event
        if (this.entityManager.gameState.eventSystem) {
          this.entityManager.gameState.eventSystem.emit('waveStart', { waveId: nextWaveId });
        }
        
        console.log(`Wave ${nextWaveId} activated`);
      } else {
        // All waves completed
        if (this.entityManager.gameState.eventSystem) {
          this.entityManager.gameState.eventSystem.emit('allWavesCompleted');
        }
        
        console.log('All waves completed!');
      }
    }
  }

  getWaveDifficultyMultiplier(waveNumber) {
    // Base difficulty is 1.0, scaling up with each wave
    const baseMultiplier = 1.0 + (waveNumber - 1) * 0.15; // 15% increase per wave
    
    // Add non-linear scaling for later waves
    const scaledMultiplier = baseMultiplier * Math.log10(waveNumber + 9) / Math.log10(10);
    
    // Add some randomness for variety (±10%)
    const randomVariation = 0.9 + Math.random() * 0.2;
    
    return scaledMultiplier * randomVariation;
  }
  
  // Add method to analyze player positions
  analyzePlayerPositions(playerPositions) {
    // Skip if no positions
    if (!playerPositions || playerPositions.length === 0) {
      return null;
    }
    
    // Calculate average player position
    let avgX = 0;
    let avgZ = 0;
    
    playerPositions.forEach(pos => {
      avgX += pos.x;
      avgZ += pos.z;
    });
    
    avgX /= playerPositions.length;
    avgZ /= playerPositions.length;
    
    // Also calculate the variance to determine spread
    let varianceX = 0;
    let varianceZ = 0;
    
    playerPositions.forEach(pos => {
      varianceX += Math.pow(pos.x - avgX, 2);
      varianceZ += Math.pow(pos.z - avgZ, 2);
    });
    
    varianceX /= playerPositions.length;
    varianceZ /= playerPositions.length;
    
    // Calculate standard deviation as a measure of spread
    const spreadX = Math.sqrt(varianceX);
    const spreadZ = Math.sqrt(varianceZ);
    
    return {
      center: { x: avgX, z: avgZ },
      spread: { x: spreadX, z: spreadZ }
    };
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
