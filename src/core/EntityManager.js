class EntityManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.componentManagers = new Map();
  }

  registerComponentManager(componentType, manager) {
    this.componentManagers.set(componentType, manager);
  }

  createEntity() {
    const entityId = this.gameState.nextEntityId++;
    this.gameState.entities.set(entityId, {});
    return entityId;
  }

  removeEntity(entityId) {
    if (!this.gameState.entities.has(entityId)) {return false;}
    
    // Unregister from collision system first if available
    if (this.gameState.systems && this.gameState.systems.collision) {
      this.gameState.systems.collision.unregisterEntity(entityId);
    }
    
    // Remove all components for this entity
    for (const manager of this.componentManagers.values()) {
      if (manager.hasComponent(entityId)) {
        manager.removeComponent(entityId);
      }
    }
    
    this.gameState.entities.delete(entityId);
    return true;
  }

  addComponent(entityId, componentType, componentData) {
    if (!this.gameState.entities.has(entityId)) {return false;}
    if (!this.componentManagers.has(componentType)) {
      console.error(`Component manager for ${componentType} not registered`);
      return false;
    }
    
    const manager = this.componentManagers.get(componentType);
    manager.addComponent(entityId, componentData);
    
    const entity = this.gameState.entities.get(entityId);
    entity[componentType] = true;
    
    return true;
  }

  removeComponent(entityId, componentType) {
    if (!this.gameState.entities.has(entityId)) {return false;}
    if (!this.componentManagers.has(componentType)) {return false;}
    
    const manager = this.componentManagers.get(componentType);
    if (!manager.hasComponent(entityId)) {return false;}
    
    manager.removeComponent(entityId);
    
    const entity = this.gameState.entities.get(entityId);
    delete entity[componentType];
    
    return true;
  }

  getComponent(entityId, componentType) {
    if (!this.gameState.entities.has(entityId)) {return null;}
    if (!this.componentManagers.has(componentType)) {return null;}
    
    const manager = this.componentManagers.get(componentType);
    return manager.getComponent(entityId);
  }

  hasComponent(entityId, componentType) {
    if (!this.gameState.entities.has(entityId)) {return false;}
    if (!this.componentManagers.has(componentType)) {return false;}
    
    const manager = this.componentManagers.get(componentType);
    return manager.hasComponent(entityId);
  }
}

export default EntityManager;