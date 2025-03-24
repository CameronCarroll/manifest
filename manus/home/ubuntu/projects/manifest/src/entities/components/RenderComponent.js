class RenderComponent {
  constructor() {
    this.components = new Map();
  }

  addComponent(entityId, data) {
    this.components.set(entityId, {
      meshId: data.meshId,  // Reference to the 3D model
      visible: data.visible !== undefined ? data.visible : true,
      scale: data.scale || { x: 1, y: 1, z: 1 },
      color: data.color || 0xffffff,
      opacity: data.opacity || 1
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
