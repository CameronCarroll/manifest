class HealthComponent {
  constructor() {
    this.components = new Map();
  }

  addComponent(entityId, data) {
    this.components.set(entityId, {
      maxHealth: data.maxHealth || 100,
      currentHealth: data.currentHealth || data.maxHealth || 100,
      armor: data.armor || 0,
      shield: data.shield || 0,
      regeneration: data.regeneration || 0
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

export default HealthComponent;