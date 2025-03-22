// src/core/ProductionSystem.js

class ProductionSystem {
    constructor(entityManager, resourceSystem) {
      this.entityManager = entityManager;
      this.resourceSystem = resourceSystem;
      this.productionQueue = new Map(); // Maps producerId to production queue
      this.unitTypes = {
        // Basic units
        'worker': {
          cost: { minerals: 50, gas: 0 },
          buildTime: 5,
          components: {
            position: { x: 0, y: 0, z: 0 },
            health: { maxHealth: 50, armor: 0 },
            faction: { faction: 'player', unitType: 'worker', attackType: 'melee', damageType: 'normal' },
            render: { meshId: 'unit', scale: { x: 0.8, y: 0.8, z: 0.8 }, color: 0x00ff00 }
          }
        },
        'marine': {
          cost: { minerals: 50, gas: 0 },
          buildTime: 5,
          components: {
            position: { x: 0, y: 0, z: 0 },
            health: { maxHealth: 80, armor: 2 },
            faction: { faction: 'player', unitType: 'assault', attackType: 'ranged', damageType: 'normal' },
            render: { meshId: 'unit', scale: { x: 1, y: 1, z: 1 }, color: 0x0000ff }
          }
        },
        'tank': {
          cost: { minerals: 150, gas: 75 },
          buildTime: 10,
          components: {
            position: { x: 0, y: 0, z: 0 },
            health: { maxHealth: 160, armor: 8 },
            faction: { faction: 'player', unitType: 'tank', attackType: 'ranged', damageType: 'explosive' },
            render: { meshId: 'unit', scale: { x: 1.5, y: 1.2, z: 1.5 }, color: 0x444488 }
          }
        },
        'medic': {
          cost: { minerals: 75, gas: 50 },
          buildTime: 7,
          components: {
            position: { x: 0, y: 0, z: 0 },
            health: { maxHealth: 70, armor: 1 },
            faction: { faction: 'player', unitType: 'support', attackType: 'none', damageType: 'normal' },
            render: { meshId: 'unit', scale: { x: 0.9, y: 1.1, z: 0.9 }, color: 0xffffff }
          }
        }
      };
    }
    
    // Check if a producer can produce a unit type
    canProduce(producerId, unitType) {
      // Verify producer exists and is a player building
      if (!this.entityManager.hasComponent(producerId, 'faction')) {
        return false;
      }
      
      const faction = this.entityManager.getComponent(producerId, 'faction');
      if (faction.faction !== 'player' || faction.unitType !== 'building') {
        return false;
      }
      
      // Verify unit type exists
      if (!this.unitTypes[unitType]) {
        return false;
      }
      
      // Check if player has enough resources
      const cost = this.unitTypes[unitType].cost;
      const playerResources = this.entityManager.gameState.playerResources;
      
      if (!playerResources) {
        return false;
      }
      
      if ((cost.minerals && playerResources.minerals < cost.minerals) ||
          (cost.gas && playerResources.gas < cost.gas)) {
        return false;
      }
      
      return true;
    }
    
    // Start producing a unit
    startProduction(producerId, unitType, options = {}) {
      // Verify production is possible
      if (!this.canProduce(producerId, unitType)) {
        return false;
      }
      
      // Get unit specification
      const unitSpec = this.unitTypes[unitType];
      
      // Deduct resources
      const cost = options.cost || unitSpec.cost;
      const playerResources = this.entityManager.gameState.playerResources;
      
      playerResources.minerals -= cost.minerals || 0;
      playerResources.gas -= cost.gas || 0;
      
      // Create or get production queue for this producer
      if (!this.productionQueue.has(producerId)) {
        this.productionQueue.set(producerId, []);
      }
      
      const queue = this.productionQueue.get(producerId);
      
      // Add to production queue
      queue.push({
        unitType: unitType,
        progress: 0,
        buildTime: options.buildTime || unitSpec.buildTime,
        rallyPoint: options.rallyPoint // Optional rally point
      });
      
      return true;
    }
    
    // Cancel production of a unit
    cancelProduction(producerId, queueIndex) {
      // Verify producer has a queue
      if (!this.productionQueue.has(producerId)) {
        return false;
      }
      
      const queue = this.productionQueue.get(producerId);
      
      // Verify queue index is valid
      if (queueIndex < 0 || queueIndex >= queue.length) {
        return false;
      }
      
      // Get production item
      const item = queue[queueIndex];
      
      // Refund resources (partial refund based on progress)
      const unitSpec = this.unitTypes[item.unitType];
      if (unitSpec) {
        const refundMultiplier = 0.75; // 75% refund
        const progressFactor = 1 - (item.progress / item.buildTime);
        
        const refund = {
          minerals: Math.floor(unitSpec.cost.minerals * refundMultiplier * progressFactor),
          gas: Math.floor(unitSpec.cost.gas * refundMultiplier * progressFactor)
        };
        
        // Add refund to player resources
        const playerResources = this.entityManager.gameState.playerResources;
        playerResources.minerals += refund.minerals;
        playerResources.gas += refund.gas;
      }
      
      // Remove from queue
      queue.splice(queueIndex, 1);
      
      return true;
    }
    
    // Set rally point for a producer
    setRallyPoint(producerId, position) {
      // Verify producer exists
      if (!this.entityManager.hasComponent(producerId, 'position')) {
        return false;
      }
      
      // Store rally point
      this.productionQueue.set(
        `${producerId}_rallyPoint`,
        { x: position.x, y: position.y, z: position.z }
      );
      
      return true;
    }
    
    // Get default spawn position near a producer
    getSpawnPosition(producerId) {
      if (!this.entityManager.hasComponent(producerId, 'position')) {
        return { x: 0, y: 0, z: 0 };
      }
      
      const producerPos = this.entityManager.getComponent(producerId, 'position');
      
      // Add slight offset to avoid spawning exactly at the building
      const spawnPosition = {
        x: producerPos.x + (Math.random() * 8 - 4),
        y: producerPos.y,
        z: producerPos.z + (Math.random() * 8 - 4)
      };
      
      return spawnPosition;
    }
    
    // Get rally point for a producer
    getRallyPoint(producerId) {
      // Check if custom rally point is set
      const rallyPointKey = `${producerId}_rallyPoint`;
      if (this.productionQueue.has(rallyPointKey)) {
        return this.productionQueue.get(rallyPointKey);
      }
      
      // No rally point, use default (producer position)
      if (this.entityManager.hasComponent(producerId, 'position')) {
        return this.entityManager.getComponent(producerId, 'position');
      }
      
      return null;
    }
    
    // Spawn a completed unit
    spawnUnit(producerId, unitType) {
      // Get unit specification
      const unitSpec = this.unitTypes[unitType];
      if (!unitSpec) {
        return null;
      }
      
      // Get spawn position
      const spawnPosition = this.getSpawnPosition(producerId);
      
      // Create entity
      const entityId = this.entityManager.createEntity();
      
      // Add components from template
      for (const [componentType, componentData] of Object.entries(unitSpec.components)) {
        // For position component, use the spawn position
        if (componentType === 'position') {
          const positionData = { ...componentData };
          positionData.x = spawnPosition.x;
          positionData.y = spawnPosition.y;
          positionData.z = spawnPosition.z;
          this.entityManager.addComponent(entityId, componentType, positionData);
        } else {
          this.entityManager.addComponent(entityId, componentType, { ...componentData });
        }
      }
      
      // Move to rally point if set
      const rallyPoint = this.getRallyPoint(producerId);
      if (rallyPoint && this.entityManager.gameState.systems && 
          this.entityManager.gameState.systems.movement) {
        this.entityManager.gameState.systems.movement.moveEntity(entityId, rallyPoint);
      }
      
      return entityId;
    }
    
    // Update production progress
    update(deltaTime) {
      // Process each producer's queue
      this.productionQueue.forEach((queue, producerId) => {
        // Skip if not a queue (e.g., rally points are stored with special keys)
        if (!Array.isArray(queue)) {
          return;
        }
        
        // Skip if queue is empty
        if (queue.length === 0) {
          return;
        }
        
        // Get the first item in the queue (FIFO)
        const item = queue[0];
        
        // Update progress
        item.progress += deltaTime;
        
        // Check if production is complete
        if (item.progress >= item.buildTime) {
          // Spawn the unit
          const unitId = this.spawnUnit(producerId, item.unitType);
          
          // Remove from queue
          queue.shift();
          
          // Custom rally point for this specific unit
          if (unitId && item.rallyPoint && this.entityManager.gameState.systems && 
              this.entityManager.gameState.systems.movement) {
            this.entityManager.gameState.systems.movement.moveEntity(unitId, item.rallyPoint);
          }
        }
      });
      
      // Update production UI
      this.updateProductionUI();
    }
    
    // Update production UI display
    updateProductionUI() {
      // Find production display element
      const productionDisplay = document.getElementById('production-display');
      if (!productionDisplay) {
        return;
      }
      
      // Collect production status from all queues
      let activeProductions = [];
      
      this.productionQueue.forEach((queue, producerId) => {
        // Skip if not a queue
        if (!Array.isArray(queue) || queue.length === 0) {
          return;
        }
        
        queue.forEach((item, index) => {
          // Only show first few items to avoid cluttering the UI
          if (index < 3) {
            activeProductions.push({
              unitType: item.unitType,
              progress: item.progress,
              buildTime: item.buildTime,
              percentage: Math.floor((item.progress / item.buildTime) * 100)
            });
          }
        });
      });
      
      // Update display
      if (activeProductions.length > 0) {
        let displayHTML = '<div class="production-status">';
        activeProductions.forEach(prod => {
          displayHTML += `
            <div class="production-item">
              <div>${prod.unitType}</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${prod.percentage}%"></div>
              </div>
              <div>${prod.percentage}%</div>
            </div>
          `;
        });
        displayHTML += '</div>';
        productionDisplay.innerHTML = displayHTML;
      } else {
        productionDisplay.innerHTML = '';
      }
    }
  }
  
  export default ProductionSystem;