// src/entities/components/ResourceComponent.js
class ResourceComponent {
  constructor() {
    this.components = new Map();
  }
  
  addComponent(entityId, data) {
    this.components.set(entityId, {
      type: data.type || 'minerals',
      amount: data.amount || 1000,
      harvestRate: data.harvestRate || 1.0
    });
  }
  
  removeComponent(entityId) {
    this.components.delete(entityId);
  }
  
  getComponent(entityId) {
    return this.components.get(entityId);
  }
  
  hasComponent(entityId) {
    return this.components.has(entityId);
  }
  
  // For serialization
  getAllComponents() {
    return Array.from(this.components.entries());
  }
  
  // For deserialization
  setAllComponents(components) {
    this.components = new Map(components);
  }
}
  
export default ResourceComponent;