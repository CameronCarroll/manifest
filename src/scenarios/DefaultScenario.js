// scenarios/DefaultScenario.js
import BaseScenario from './BaseScenario.js';
import * as THREE from 'three';

class DefaultScenario extends BaseScenario {
  constructor(gameController) {
    super(gameController);
    
    this.name = 'Default Scenario';
    this.description = 'Defend your base against waves of enemies';
    
    // Set initial resources
    this.initialResources = {
      minerals: 500,
      gas: 200
    };
  }
  
  start() {
    super.start();
    
    // Set initial resources
    this.gameState.playerResources = { ...this.initialResources };
    
    // Create player units
    this.createPlayerUnits();
    
    // Create enemy spawn points and waves
    this.createEnemySpawnPoints();
    
    // Add terrain and resources
    this.addTerrainFeatures();
    this.addResourceNodes();
    
    // Set up objectives
    this.setupObjectives();
  }
  
  createPlayerUnits() {
    console.log('Creating player units');
    
    // Create multiple units spread across the map
    for (let i = 0; i < 10; i++) {
      const posX = (Math.random() - 0.5) * 40; // Closer to center
      const posZ = (Math.random() - 0.5) * 40;
      
      this.createPlayerUnit('assault', { x: posX, z: posZ });
    }
    
    // Create a few buildings
    for (let i = 0; i < 3; i++) {
      const posX = (Math.random() - 0.5) * 30;
      const posZ = (Math.random() - 0.5) * 30;
      
      const buildingEntity = this.entityManager.createEntity();
      
      this.entityManager.addComponent(buildingEntity, 'position', { 
        x: posX, 
        y: 0, 
        z: posZ,
        rotation: Math.random() * Math.PI * 2 
      });
      this.entityManager.addComponent(buildingEntity, 'health', { maxHealth: 500 });
      this.entityManager.addComponent(buildingEntity, 'render', {
        meshId: 'building',
        scale: { x: 2, y: 2, z: 2 },
        color: 0xff0000
      });
      this.entityManager.addComponent(buildingEntity, 'faction', {
        faction: 'player',
        unitType: 'building',
        attackType: 'none',
        damageType: 'none'
      });
    }
  }
  
  createEnemySpawnPoints() {
    console.log('Creating enemy spawn points');
    
    // Create spawn points at the edges of the map
    const spawnPoints = [];
    
    // North edge
    spawnPoints.push({ x: 0, y: 0, z: -90 });
    spawnPoints.push({ x: 50, y: 0, z: -90 });
    spawnPoints.push({ x: -50, y: 0, z: -90 });
    
    // South edge
    spawnPoints.push({ x: 0, y: 0, z: 90 });
    spawnPoints.push({ x: 50, y: 0, z: 90 });
    spawnPoints.push({ x: -50, y: 0, z: 90 });
    
    // East edge
    spawnPoints.push({ x: 90, y: 0, z: 0 });
    spawnPoints.push({ x: 90, y: 0, z: 50 });
    spawnPoints.push({ x: 90, y: 0, z: -50 });
    
    // West edge
    spawnPoints.push({ x: -90, y: 0, z: 0 });
    spawnPoints.push({ x: -90, y: 0, z: 50 });
    spawnPoints.push({ x: -90, y: 0, z: -50 });
    
    // Create enemy waves
    const waves = [
      {
        enemyTypes: ['lightInfantry', 'heavyInfantry'],
        totalEnemies: 10,
        spawnInterval: 3,
        active: true
      },
      {
        enemyTypes: ['lightInfantry', 'heavyInfantry', 'sniperUnit', 'supportUnit'],
        totalEnemies: 15,
        spawnInterval: 2,
        active: false
      },
      {
        enemyTypes: ['heavyInfantry', 'sniperUnit', 'supportUnit', 'specialistUnit', 'eliteUnit'],
        totalEnemies: 20,
        spawnInterval: 2,
        active: false
      }
    ];
    
    // Setup spawn points and waves
    this.setupEnemyWaves(spawnPoints, waves);
  }
  
  addTerrainFeatures() {
    console.log('Adding terrain features');
    
    const { scene } = this.gameController.sceneManager.getActiveScene();
    
    // Add some hills
    for (let i = 0; i < 10; i++) {
      const hillSize = 5 + Math.random() * 10;
      const hillHeight = 2 + Math.random() * 3;
      
      const hillGeometry = new THREE.ConeGeometry(hillSize, hillHeight, 8);
      const hillMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x6b8e4e,
        roughness: 0.9
      });
      
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      
      // Position randomly on the map
      hill.position.x = (Math.random() - 0.5) * 180;
      hill.position.y = 0; // At ground level
      hill.position.z = (Math.random() - 0.5) * 180;
      
      scene.add(hill);
    }
    
    // Add some rock formations
    for (let i = 0; i < 15; i++) {
      const rockSize = 2 + Math.random() * 4;
      
      const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
      const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7b7b7b,
        roughness: 0.7
      });
      
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      
      // Position randomly on the map
      rock.position.x = (Math.random() - 0.5) * 180;
      rock.position.y = rockSize / 2; // Half height above ground
      rock.position.z = (Math.random() - 0.5) * 180;
      
      // Random rotation
      rock.rotation.y = Math.random() * Math.PI * 2;
      
      scene.add(rock);
    }
  }
  
  addResourceNodes() {
    console.log('Adding resource nodes');
    
    // Add mineral nodes
    for (let i = 0; i < 6; i++) {
      const posX = (Math.random() - 0.5) * 160;
      const posZ = (Math.random() - 0.5) * 160;
      
      this.createResourceNode('minerals', { x: posX, z: posZ }, 1000 + Math.random() * 500);
    }
    
    // Add gas nodes (fewer and more rare)
    for (let i = 0; i < 3; i++) {
      const posX = (Math.random() - 0.5) * 160;
      const posZ = (Math.random() - 0.5) * 160;
      
      this.createResourceNode('gas', { x: posX, z: posZ }, 500 + Math.random() * 300);
    }
  }
  
  setupObjectives() {
    if (!this.gameController.systems.objectives) {
      console.warn('Objectives system not found');
      return;
    }
    
    const objectives = this.gameController.systems.objectives;
    
    // Add survive waves objective
    objectives.addObjective({
      id: 'survive_waves',
      title: 'Survive All Waves',
      description: 'Defeat all enemy waves to win'
    });
    
    // Add win condition
    objectives.defineWinCondition({
      type: 'SURVIVE_WAVES',
      objectiveId: 'survive_waves',
      totalWaves: 3
    });
    
    // Add lose condition - if all player units are destroyed
    objectives.defineFailCondition({
      type: 'ALL_UNITS_DESTROYED',
    });
  }
  
  // Update scenario-specific logic
  update(deltaTime) {
    // No additional logic needed for default scenario
  }
  
  // Victory condition
  checkVictory() {
    // Check if all waves are completed and all enemies defeated
    const spawnSystem = this.systems.spawn;
    
    if (!spawnSystem || !spawnSystem.activeWaves) {
      return false;
    }
    
    let allWavesCompleted = true;
    let activeEnemies = 0;
    
    // Check if all waves are complete
    spawnSystem.activeWaves.forEach(wave => {
      if (!wave.completed) {
        allWavesCompleted = false;
      }
    });
    
    // Count active enemies
    this.entityManager.gameState.entities.forEach((entity, id) => {
      if (this.entityManager.hasComponent(id, 'faction')) {
        const faction = this.entityManager.getComponent(id, 'faction');
        if (faction.faction === 'enemy') {
          activeEnemies++;
        }
      }
    });
    
    return allWavesCompleted && activeEnemies === 0;
  }
  
  // Defeat condition
  checkDefeat() {
    // Check if all player units are destroyed
    let playerUnits = 0;
    
    this.entityManager.gameState.entities.forEach((entity, id) => {
      if (this.entityManager.hasComponent(id, 'faction')) {
        const faction = this.entityManager.getComponent(id, 'faction');
        if (faction.faction === 'player') {
          playerUnits++;
        }
      }
    });
    
    return playerUnits === 0;
  }
}

export default DefaultScenario;