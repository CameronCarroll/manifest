// src/core/ResourceSystem.js

class ResourceSystem {
    constructor(entityManager) {
      this.entityManager = entityManager;
      this.gatheringUnits = new Map(); // Maps unitId to gathering data
      this.resourceNodes = new Map();  // Maps nodeId to resource data
      
      // Gather rates (resources per second)
      this.gatherRates = {
        minerals: 1.0,
        gas: 0.5
      };
      
      // Discovery resources on map
      this.discoverResources();
    }
    
    // Scan the map and identify resource nodes
    discoverResources() {
      this.entityManager.gameState.entities.forEach((entity, entityId) => {
        if (this.entityManager.hasComponent(entityId, 'resource')) {
          const resourceComp = this.entityManager.getComponent(entityId, 'resource');
          const positionComp = this.entityManager.getComponent(entityId, 'position');
          
          if (positionComp) {
            this.resourceNodes.set(entityId, {
              type: resourceComp.type,
              amount: resourceComp.amount,
              position: { ...positionComp },
              gatherers: 0
            });
          }
        }
      });
    }
    
    // Issue gather command to a unit
    issueGatherCommand(unitId, resourceNodeId) {
      // Verify both entities exist and have required components
      if (!this.entityManager.hasComponent(unitId, 'position') ||
          !this.entityManager.hasComponent(resourceNodeId, 'position') ||
          !this.entityManager.hasComponent(resourceNodeId, 'resource')) {
        return false;
      }
      
      // Get resource node data
      const resourceNode = this.resourceNodes.get(resourceNodeId);
      if (!resourceNode) {
        // If not in cache, try to add it
        const resourceComp = this.entityManager.getComponent(resourceNodeId, 'resource');
        const positionComp = this.entityManager.getComponent(resourceNodeId, 'position');
        
        if (resourceComp && positionComp) {
          this.resourceNodes.set(resourceNodeId, {
            type: resourceComp.type,
            amount: resourceComp.amount,
            position: { ...positionComp },
            gatherers: 0
          });
        } else {
          return false;
        }
      }
      
      // Setup unit for gathering
      this.gatheringUnits.set(unitId, {
        state: 'MOVING_TO_RESOURCE',
        resourceNodeId: resourceNodeId,
        resourceType: this.resourceNodes.get(resourceNodeId).type,
        carryingAmount: 0,
        lastStateChange: 0
      });
      
      // Move unit to resource node
      if (this.entityManager.gameState.systems && 
          this.entityManager.gameState.systems.movement) {
        const nodePosition = this.entityManager.getComponent(resourceNodeId, 'position');
        this.entityManager.gameState.systems.movement.moveEntity(unitId, nodePosition);
      }
      
      // Increment gatherer count for the node
      const node = this.resourceNodes.get(resourceNodeId);
      node.gatherers++;
      
      return true;
    }
    
    // Find nearest resource node of specified type
    findNearestResourceNode(unitId, resourceType = null) {
      if (!this.entityManager.hasComponent(unitId, 'position')) {
        return null;
      }
      
      const unitPosition = this.entityManager.getComponent(unitId, 'position');
      let nearestNodeId = null;
      let nearestDistance = Infinity;
      
      // Check all resource nodes
      this.resourceNodes.forEach((nodeData, nodeId) => {
        // Skip if resource type doesn't match (if specified)
        if (resourceType && nodeData.type !== resourceType) {
          return;
        }
        
        // Skip if node is depleted
        if (nodeData.amount <= 0) {
          return;
        }
        
        // Calculate distance
        const dx = nodeData.position.x - unitPosition.x;
        const dz = nodeData.position.z - unitPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Update if this is the nearest node so far
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestNodeId = nodeId;
        }
      });
      
      return nearestNodeId;
    }
    
    // Stop gathering for a unit
    stopGathering(unitId) {
      if (!this.gatheringUnits.has(unitId)) {
        return false;
      }
      
      // Get gathering data
      const gatherData = this.gatheringUnits.get(unitId);
      
      // Decrement gatherer count for the resource node
      if (gatherData.resourceNodeId && this.resourceNodes.has(gatherData.resourceNodeId)) {
        const node = this.resourceNodes.get(gatherData.resourceNodeId);
        node.gatherers = Math.max(0, node.gatherers - 1);
      }
      
      // Remove unit from gathering
      this.gatheringUnits.delete(unitId);
      
      // Stop movement if needed
      if (this.entityManager.gameState.systems && 
          this.entityManager.gameState.systems.movement) {
        this.entityManager.gameState.systems.movement.stopEntity(unitId);
      }
      
      return true;
    }
    
    // Calculate resource gather amount based on delta time
    calculateGatherAmount(resourceType, deltaTime) {
      const baseRate = this.gatherRates[resourceType] || 1.0;
      return baseRate * deltaTime;
    }
    
    // Update all gathering units
    update(deltaTime) {
      // Process each gathering unit
      this.gatheringUnits.forEach((gatherData, unitId) => {
        // Skip if unit no longer exists
        if (!this.entityManager.hasComponent(unitId, 'position')) {
          this.gatheringUnits.delete(unitId);
          return;
        }
        
        // Update based on current gathering state
        switch (gatherData.state) {
          case 'MOVING_TO_RESOURCE':
            // Check if unit is at the resource node
            if (this.isUnitAtResource(unitId, gatherData.resourceNodeId)) {
              // Start gathering
              gatherData.state = 'GATHERING';
              gatherData.lastStateChange = 0;
            }
            break;
            
          case 'GATHERING':
            // Update gathering time
            gatherData.lastStateChange += deltaTime;
            
            // Once enough time passes, collect resources
            if (gatherData.lastStateChange >= 1.0) { // 1 second of gathering
              // Calculate gather amount
              const gatherAmount = this.calculateGatherAmount(gatherData.resourceType, 1.0);
              
              // Update resource node
              if (this.resourceNodes.has(gatherData.resourceNodeId)) {
                const node = this.resourceNodes.get(gatherData.resourceNodeId);
                
                // Can only gather what's available
                const actualGather = Math.min(gatherAmount, node.amount);
                node.amount -= actualGather;
                
                // Unit is now carrying resources
                gatherData.carryingAmount += actualGather;
                
                // If node is depleted, remove gatherers
                if (node.amount <= 0) {
                  // Stop all units gathering from this node
                  this.gatheringUnits.forEach((otherData, otherUnitId) => {
                    if (otherData.resourceNodeId === gatherData.resourceNodeId) {
                      otherData.state = 'RETURNING';
                      otherData.lastStateChange = 0;
                    }
                  });
                }
                
                // Reset timer and start returning to base if carrying enough
                gatherData.lastStateChange = 0;
                if (gatherData.carryingAmount >= 5) { // Capacity reached
                  gatherData.state = 'RETURNING';
                }
              } else {
                // Resource node no longer exists
                gatherData.state = 'RETURNING';
                gatherData.lastStateChange = 0;
              }
            }
            break;
            
          case 'RETURNING':
            // Check if unit is at a base
            if (this.isUnitAtBase(unitId)) {
              // Deposit resources
              if (gatherData.carryingAmount > 0) {
                // Add to player resources
                if (this.entityManager.gameState.playerResources) {
                  const resources = this.entityManager.gameState.playerResources;
                  resources[gatherData.resourceType] = 
                    (resources[gatherData.resourceType] || 0) + gatherData.carryingAmount;
                }
                
                // Reset carried amount
                gatherData.carryingAmount = 0;
              }
              
              // Check if original resource node still exists and has resources
              if (this.resourceNodes.has(gatherData.resourceNodeId) &&
                  this.resourceNodes.get(gatherData.resourceNodeId).amount > 0) {
                // Return to resource node
                gatherData.state = 'MOVING_TO_RESOURCE';
                gatherData.lastStateChange = 0;
                
                // Move back to node
                if (this.entityManager.gameState.systems && 
                    this.entityManager.gameState.systems.movement) {
                  const nodePosition = this.entityManager.getComponent(gatherData.resourceNodeId, 'position');
                  this.entityManager.gameState.systems.movement.moveEntity(unitId, nodePosition);
                }
              } else {
                // Find a new resource node
                const newNodeId = this.findNearestResourceNode(unitId, gatherData.resourceType);
                if (newNodeId) {
                  // Update resource node reference
                  gatherData.resourceNodeId = newNodeId;
                  gatherData.state = 'MOVING_TO_RESOURCE';
                  gatherData.lastStateChange = 0;
                  
                  // Move to new node
                  if (this.entityManager.gameState.systems && 
                      this.entityManager.gameState.systems.movement) {
                    const nodePosition = this.entityManager.getComponent(newNodeId, 'position');
                    this.entityManager.gameState.systems.movement.moveEntity(unitId, nodePosition);
                  }
                } else {
                  // No more resources of this type, stop gathering
                  this.stopGathering(unitId);
                }
              }
            } else {
              // Not at base yet, make sure unit is moving to nearest base
              this.moveUnitToNearestBase(unitId);
            }
            break;
        }
      });
      
      // Update resource UI
      this.updateResourceDisplay();
    }
    
    // Check if unit is at a resource node
    isUnitAtResource(unitId, resourceNodeId) {
      // Entity Existence check
      if (!this.entityManager.hasComponent(unitId, 'position') ||
          !this.entityManager.hasComponent(resourceNodeId, 'position')) {
        return false;
      }
      
      // Get positions
      const unitPos = this.entityManager.getComponent(unitId, 'position');
      const nodePos = this.entityManager.getComponent(resourceNodeId, 'position');
      
      // Calculate distance
      const dx = unitPos.x - nodePos.x;
      const dz = unitPos.z - nodePos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Unit is at resource if within gathering range
      return distance < 2.0; // 2 units range for gathering
    }
    
    // Check if unit is at a base
    isUnitAtBase(unitId) {
      if (!this.entityManager.hasComponent(unitId, 'position')) {
        return false;
      }
      
      const unitPos = this.entityManager.getComponent(unitId, 'position');
      let atBase = false;
      
      // Check all entities for player buildings that can receive resources
      this.entityManager.gameState.entities.forEach((entity, entityId) => {
        if (this.entityManager.hasComponent(entityId, 'faction') &&
            this.entityManager.hasComponent(entityId, 'position')) {
          
          const faction = this.entityManager.getComponent(entityId, 'faction');
          
          // Only player buildings can receive resources
          if (faction.faction === 'player' && faction.unitType === 'building') {
            const buildingPos = this.entityManager.getComponent(entityId, 'position');
            
            // Calculate distance
            const dx = unitPos.x - buildingPos.x;
            const dz = unitPos.z - buildingPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Check if unit is within deposit range
            if (distance < 3.0) { // 3 units range for resource deposit
              atBase = true;
            }
          }
        }
      });
      
      return atBase;
    }
    
    // Move unit to nearest base
    moveUnitToNearestBase(unitId) {
      if (!this.entityManager.hasComponent(unitId, 'position')) {
        return false;
      }
      
      const unitPos = this.entityManager.getComponent(unitId, 'position');
      let nearestBase = null;
      let minDistance = Infinity;
      
      // Find the nearest player building (base)
      this.entityManager.gameState.entities.forEach((entity, entityId) => {
        if (this.entityManager.hasComponent(entityId, 'faction') &&
            this.entityManager.hasComponent(entityId, 'position')) {
          
          const faction = this.entityManager.getComponent(entityId, 'faction');
          
          // Only player buildings can be bases
          if (faction.faction === 'player' && faction.unitType === 'building') {
            const buildingPos = this.entityManager.getComponent(entityId, 'position');
            
            // Calculate distance
            const dx = unitPos.x - buildingPos.x;
            const dz = unitPos.z - buildingPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Update if this is the nearest base
            if (distance < minDistance) {
              minDistance = distance;
              nearestBase = buildingPos;
            }
          }
        }
      });
      
      // If we found a base and unit isn't already there
      if (nearestBase && minDistance > 3.0) {
        // Move to base
        if (this.entityManager.gameState.systems && 
            this.entityManager.gameState.systems.movement) {
          this.entityManager.gameState.systems.movement.moveEntity(unitId, nearestBase);
        }
        return true;
      }
      
      return false;
    }
    
    // Update resource UI display
    updateResourceDisplay() {
      // Find resource display element
      const resourceDisplay = document.getElementById('resource-display');
      if (!resourceDisplay || !this.entityManager.gameState.playerResources) {
        return;
      }
      
      // Update display
      const resources = this.entityManager.gameState.playerResources;
      let displayHTML = '<div class="resource-counter">';
      
      if (resources.minerals !== undefined) {
        displayHTML += `<div>Minerals: ${Math.floor(resources.minerals)}</div>`;
      }
      
      if (resources.gas !== undefined) {
        displayHTML += `<div>Gas: ${Math.floor(resources.gas)}</div>`;
      }
      
      displayHTML += '</div>';
      resourceDisplay.innerHTML = displayHTML;
    }
  }
  
  export default ResourceSystem;