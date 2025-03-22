class PositionComponent {
  constructor() {
    this.components = new Map();
  }

  addComponent(entityId, data) {
    this.components.set(entityId, {
      x: data.x || 0,
      y: data.y || 0,
      z: data.z || 0,
      rotation: data.rotation || 0
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

export default PositionComponent;