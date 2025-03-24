// src/entities/components/BuildingTypeComponent.js
class BuildingTypeComponent {
    constructor() {
      this.components = new Map();
    }
  
    addComponent(entityId, data) {
      this.components.set(entityId, {
        type: data.type || 'basic', // basic, arcane_reactor, reclaimed_sanctuary, bioforge, mana_well, scavenger_outpost, harmonic_tower
        level: data.level || 1,
        visualEffects: data.visualEffects || [],
        animationState: data.animationState || 'idle'
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
  
  export default BuildingTypeComponent;
  