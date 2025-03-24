// src/entities/components/UnitTypeComponent.js
class UnitTypeComponent {
  constructor() {
    this.components = new Map();
  }

  addComponent(entityId, data) {
    this.components.set(entityId, {
      type: data.type || 'basic', // basic, techno_shaman, solar_knight, neon_assassin, biohacker, scrap_golem, eco_drone
      abilities: data.abilities || [],
      visualEffects: data.visualEffects || []
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

export default UnitTypeComponent;
