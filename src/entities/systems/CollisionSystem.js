// src/entities/systems/CollisionSystem.js
import * as THREE from 'three';
class CollisionSystem {
  constructor(entityManager) {
    this.entityManager = entityManager;
    this.spatialGrid = {};
    this.cellSize = 2; // Size of each grid cell in world units
    this.collisionRadii = new Map(); // Maps entityId to collision radius
    this.staticEntities = new Set(); // Set of entity IDs that don't move (buildings, terrain)
  }
    
  initialize() {
    // Register static entities first
    this.registerStaticEntities();
  }
    
  // Register all buildings and terrain as static collision entities
  registerStaticEntities() {
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      // Check if the entity has position and render components
      if (this.entityManager.hasComponent(entityId, 'position') &&
            this.entityManager.hasComponent(entityId, 'render')) {
          
        const factionComponent = this.entityManager.getComponent(entityId, 'faction');
        const renderComponent = this.entityManager.getComponent(entityId, 'render');
          
        // Identify static entities (buildings and terrain features)
        if ((factionComponent && factionComponent.unitType === 'building') || 
              (renderComponent.meshId === 'terrain')) {
            
          this.registerEntity(entityId, true);
        }
      }
    });
  }
    
  // Register an entity for collision detection
  registerEntity(entityId, isStatic = false) {
    if (!this.entityManager.hasComponent(entityId, 'position')) {
      return false;
    }
      
    // Calculate collision radius based on the entity's render component
    let radius = 0.5; // Default radius
      
    if (this.entityManager.hasComponent(entityId, 'render')) {
      const renderComponent = this.entityManager.getComponent(entityId, 'render');
      const scale = renderComponent.scale;
        
      // Use the largest horizontal scale value
      radius = Math.max(scale.x, scale.z) * 0.5;
        
      // Special case for buildings
      const factionComponent = this.entityManager.getComponent(entityId, 'faction');
      if (factionComponent && factionComponent.unitType === 'building') {
        radius *= 1.2; // Make buildings have slightly larger collision areas
      }
    }
      
    // Store collision radius
    this.collisionRadii.set(entityId, radius);
      
    // Mark as static if needed
    if (isStatic) {
      this.staticEntities.add(entityId);
    }
      
    // Add to spatial grid
    this.updateEntityInGrid(entityId);
      
    return true;
  }
    
  // Remove an entity from collision detection
  unregisterEntity(entityId) {
    // Remove from spatial grid
    this.removeEntityFromGrid(entityId);
      
    // Remove collision radius
    this.collisionRadii.delete(entityId);
      
    // Remove from static entities if present
    this.staticEntities.delete(entityId);
      
    return true;
  }
    
  // Convert world position to grid cell coordinates
  worldToGrid(x, z) {
    const gridX = Math.floor(x / this.cellSize);
    const gridZ = Math.floor(z / this.cellSize);
    return `${gridX},${gridZ}`;
  }
    
  // Update entity position in the spatial grid
  updateEntityInGrid(entityId) {
    if (!this.entityManager.hasComponent(entityId, 'position')) {
      return;
    }
      
    const position = this.entityManager.getComponent(entityId, 'position');
    const cellKey = this.worldToGrid(position.x, position.z);
      
    // Create cell if it doesn't exist
    if (!this.spatialGrid[cellKey]) {
      this.spatialGrid[cellKey] = new Set();
    }
      
    // Add entity to cell
    this.spatialGrid[cellKey].add(entityId);
  }
    
  // Remove entity from previous grid cell
  removeEntityFromGrid(entityId) {
    // For simplicity, we could search all cells, but that's inefficient
    // Instead, we'll calculate the cell based on the entity's current position
    if (!this.entityManager.hasComponent(entityId, 'position')) {
      return;
    }
      
    const position = this.entityManager.getComponent(entityId, 'position');
    const cellKey = this.worldToGrid(position.x, position.z);
      
    // Remove from cell if it exists
    if (this.spatialGrid[cellKey]) {
      this.spatialGrid[cellKey].delete(entityId);
        
      // Clean up empty cells
      if (this.spatialGrid[cellKey].size === 0) {
        delete this.spatialGrid[cellKey];
      }
    }
  }
    
  // Check if a move to a new position would cause a collision
  checkCollision(entityId, newPosition) {
    // If entity isn't registered for collision, no collision occurs
    if (!this.collisionRadii.has(entityId)) {
      return false;
    }
      
    const entityRadius = this.collisionRadii.get(entityId);
      
    // Get neighboring cells to check
    const cellKeys = this.getNeighboringCells(newPosition.x, newPosition.z);
      
    // Check entities in those cells
    for (const cellKey of cellKeys) {
      const cellEntities = this.spatialGrid[cellKey];
      if (!cellEntities) {continue;}
        
      for (const otherEntityId of cellEntities) {
        // Skip self
        if (otherEntityId === entityId) {continue;}
          
        // Get other entity's position and radius
        if (!this.entityManager.hasComponent(otherEntityId, 'position')) {continue;}
        const otherPosition = this.entityManager.getComponent(otherEntityId, 'position');
        const otherRadius = this.collisionRadii.get(otherEntityId) || 0.5;
          
        // Calculate distance between centers
        const dx = newPosition.x - otherPosition.x;
        const dz = newPosition.z - otherPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
          
        // Check if circles overlap
        if (distance < (entityRadius + otherRadius)) {
          return true; // Collision detected
        }
      }
    }
      
    return false; // No collision
  }
    
  // Get array of cell keys for neighboring cells (including the cell itself)
  getNeighboringCells(x, z) {
    const centerX = Math.floor(x / this.cellSize);
    const centerZ = Math.floor(z / this.cellSize);
    const result = [];
      
    // Get a 3x3 grid of cells around the specified position
    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
        const gridX = centerX + offsetX;
        const gridZ = centerZ + offsetZ;
        const cellKey = `${gridX},${gridZ}`;
          
        if (this.spatialGrid[cellKey]) {
          result.push(cellKey);
        }
      }
    }
      
    return result;
  }
    
  // Find a valid position near the target if the target position has a collision
  findNearestValidPosition(entityId, targetPosition, originalPosition, maxAttempts = 8) {
    // If no collision at the target position, just return it
    if (!this.checkCollision(entityId, targetPosition)) {
      return targetPosition;
    }
      
    const entityRadius = this.collisionRadii.get(entityId) || 0.5;
      
    // Try positions in a spiral pattern around the target
    const spiralOffsets = [];
    for (let i = 1; i <= maxAttempts; i++) {
      const angle = (i / maxAttempts) * Math.PI * 2;
      // Gradually increase distance from center
      const distance = entityRadius * (1 + (i / maxAttempts));
      spiralOffsets.push({
        x: Math.sin(angle) * distance,
        z: Math.cos(angle) * distance
      });
    }
      
    // Try each offset position
    for (const offset of spiralOffsets) {
      const testPosition = {
        x: targetPosition.x + offset.x,
        y: targetPosition.y,
        z: targetPosition.z + offset.z
      };
        
      if (!this.checkCollision(entityId, testPosition)) {
        return testPosition;
      }
    }
      
    // If we couldn't find a valid position, return the original position
    return originalPosition;
  }
    
  // Update the system - called each frame
  update(deltaTime) {
    // Update positions of all non-static entities in the grid
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      if (this.staticEntities.has(entityId)) {
        return; // Skip static entities
      }
        
      if (this.collisionRadii.has(entityId) && 
            this.entityManager.hasComponent(entityId, 'position')) {
        this.updateEntityInGrid(entityId);
      }
    });

    if (this.debugMeshes && this.debugMeshes.length > 0) {
      // Get the scene from the first debug mesh
      const scene = this.debugMeshes[0].parent;
      if (scene) {
        this.updateDebugVisualization(scene);
      }
    }
  }

  createDebugVisualization(scene) {
    // Remove any existing visualization
    this.removeDebugVisualization(scene);
    
    // Create material for collision boundaries
    const staticMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Red for static objects
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    
    const dynamicMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green for dynamic objects
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    
    // Keep track of all visualization meshes
    this.debugMeshes = [];
    
    // Create visualization for all registered entities
    this.collisionRadii.forEach((radius, entityId) => {
      const isStatic = this.staticEntities.has(entityId);
      
      // Skip if entity doesn't have position
      if (!this.entityManager.hasComponent(entityId, 'position')) {
        return;
      }
      
      // Get position
      const position = this.entityManager.getComponent(entityId, 'position');
      
      // Create cylinder for collision boundary
      const geometry = new THREE.CylinderGeometry(radius, radius, 1, 16);
      const material = isStatic ? staticMaterial : dynamicMaterial;
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position the collision visualization
      mesh.position.set(position.x, 0.5, position.z);
      
      // Store entity ID in user data
      mesh.userData.entityId = entityId;
      mesh.userData.isCollisionVisualization = true;
      
      // Add to scene
      scene.add(mesh);
      
      // Track for cleanup
      this.debugMeshes.push(mesh);
    });
    
    console.log(`Created collision visualization for ${this.debugMeshes.length} entities`);
    return this.debugMeshes.length;
  }
  
  // Remove collision visualization
  removeDebugVisualization(scene) {
    if (!this.debugMeshes) {
      return 0;
    }
    
    let count = 0;
    for (const mesh of this.debugMeshes) {
      scene.remove(mesh);
      if (mesh.geometry) {mesh.geometry.dispose();}
      count++;
    }
    
    this.debugMeshes = [];
    console.log(`Removed ${count} collision visualization meshes`);
    return count;
  }
  
  // Update collision visualization
  updateDebugVisualization(scene) {
    if (!this.debugMeshes || this.debugMeshes.length === 0) {
      return;
    }
    
    // Update positions of visualizations
    for (const mesh of this.debugMeshes) {
      const entityId = mesh.userData.entityId;
      
      // Skip if entity no longer exists
      if (!this.entityManager.hasComponent(entityId, 'position')) {
        continue;
      }
      
      // Update position
      const position = this.entityManager.getComponent(entityId, 'position');
      mesh.position.set(position.x, 0.5, position.z);
    }
  }
}
  
export default CollisionSystem;