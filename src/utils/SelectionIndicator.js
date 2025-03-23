import * as THREE from 'three';

// Class to handle selection visualization
class SelectionIndicator {
  constructor(scene) {
    this.scene = scene;
    this.selectionRings = new Map(); // Maps entityId to selection ring mesh
    this.createMaterials();
  }

  createMaterials() {
    // Material for friendly unit selection
    this.friendlySelectionMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false // Prevents z-fighting with ground
    });
    
    // Material for enemy unit selection (if needed)
    this.enemySelectionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Red
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  // Add selection ring for an entity
  addSelectionRing(entityId, position, radius = 1.2, isEnemy = false) {
    console.log('Adding selection ring', { 
      entityId, 
      position, 
      radius, 
      isEnemy 
    });

    // Remove existing ring if there is one
    this.removeSelectionRing(entityId);
    
    // Create a ring geometry
    const ringGeometry = new THREE.RingGeometry(radius * 0.9, radius, 32);
    const material = isEnemy ? this.enemySelectionMaterial : this.friendlySelectionMaterial;
    const ring = new THREE.Mesh(ringGeometry, material);
    
    // Position the ring
    ring.position.set(position.x, 0.1, position.z); // Slightly above ground
    ring.rotation.x = -Math.PI / 2; // Lay flat on the ground
    
    // Add to scene
    this.scene.add(ring);
    this.selectionRings.set(entityId, ring);
    
    return ring;
  }

  // Update ring position for an entity
  updateSelectionRingPosition(entityId, position) {
    const ring = this.selectionRings.get(entityId);
    if (ring) {
      ring.position.set(position.x, 0.1, position.z);
    }
  }

  // Remove selection ring for an entity
  removeSelectionRing(entityId) {
    const ring = this.selectionRings.get(entityId);
    if (ring) {
      this.scene.remove(ring);
      if (ring.geometry) {ring.geometry.dispose();}
      this.selectionRings.delete(entityId);
    }
  }

  // Clear all selection rings
  clearAllSelectionRings() {
    for (const entityId of this.selectionRings.keys()) {
      this.removeSelectionRing(entityId);
    }
  }

  // Update all selection rings based on current selection
  updateSelectionRings(selectedEntities, entityManager) {
    console.log('Updating selection rings', { 
      selectedEntities: Array.from(selectedEntities),
      entityManagerExists: !!entityManager 
    });
  
    // First, remove rings for entities no longer selected
    for (const entityId of this.selectionRings.keys()) {
      if (!selectedEntities.has(entityId)) {
        this.removeSelectionRing(entityId);
      }
    }
    
    // Then, add/update rings for selected entities
    for (const entityId of selectedEntities) {
      // Check if entity has position component
      if (entityManager.hasComponent(entityId, 'position')) {
        const positionComponent = entityManager.getComponent(entityId, 'position');
        
        // If ring already exists, update its position
        if (this.selectionRings.has(entityId)) {
          this.updateSelectionRingPosition(entityId, positionComponent);
        } else {
          // Create a new ring
          // Calculate radius based on entity's render component
          let radius = 1.2; // Default size
          if (entityManager.hasComponent(entityId, 'render')) {
            const renderComponent = entityManager.getComponent(entityId, 'render');
            radius = Math.max(
              renderComponent.scale.x, 
              renderComponent.scale.z
            ) * 0.7;
          }
          
          // Determine if it's an enemy unit
          const isEnemy = entityManager.hasComponent(entityId, 'faction') && 
            entityManager.getComponent(entityId, 'faction').faction !== 'player';
          
          // Add the selection ring
          this.addSelectionRing(entityId, positionComponent, radius, isEnemy);
        }
      }
    }
  }
  
  // Dispose resources when not needed
  dispose() {
    this.clearAllSelectionRings();
    if (this.friendlySelectionMaterial) {this.friendlySelectionMaterial.dispose();}
    if (this.enemySelectionMaterial) {this.enemySelectionMaterial.dispose();}
  }
}

export default SelectionIndicator;