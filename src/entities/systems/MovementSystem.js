class MovementSystem {
  constructor(entityManager) {
    this.entityManager = entityManager;
    this.movingEntities = new Map(); // Maps entityId to movement data
  }

  initialize() {
    // Initialize system if needed
  }

  moveEntity(entityId, destination, speed) {
    // Add entity to moving entities list with destination
    if (this.entityManager.hasComponent(entityId, 'position')) {
      this.movingEntities.set(entityId, {
        destination: { ...destination },
        speed: speed || 5, // Default speed if not specified
        path: [] // For pathfinding, if implemented
      });
      return true;
    }
    return false;
  }

  stopEntity(entityId) {
    // Remove entity from moving entities list
    return this.movingEntities.delete(entityId);
  }

  update(deltaTime) {
    // Process all moving entities
    this.movingEntities.forEach((movementData, entityId) => {
      const positionComponent = this.entityManager.getComponent(entityId, 'position');
      
      if (!positionComponent) {
        // Entity lost its position component, stop tracking it
        this.stopEntity(entityId);
        return;
      }
      
      const { destination, speed } = movementData;
      
      // Calculate direction and distance
      const dx = destination.x - positionComponent.x;
      const dz = destination.z - positionComponent.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 0.1) {
        // Close enough to destination, stop moving
        positionComponent.x = destination.x;
        positionComponent.z = destination.z;
        this.stopEntity(entityId);
        return;
      }
      
      // Calculate movement for this frame
      const moveDistance = speed * deltaTime;
      const moveRatio = moveDistance / distance;
      
      // Update position
      positionComponent.x += dx * moveRatio;
      positionComponent.z += dz * moveRatio;
      
      // Update rotation to face movement direction
      positionComponent.rotation = Math.atan2(dx, dz);
    });
  }

  // For serialization
  serialize() {
    return Array.from(this.movingEntities.entries());
  }

  // For deserialization
  deserialize(data) {
    this.movingEntities = new Map(data);
  }
}

export default MovementSystem;