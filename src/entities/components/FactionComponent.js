class FactionComponent {
  constructor() {
    this.components = new Map();
    this.FACTIONS = {
      PLAYER: 'player',
      ALLY: 'ally',
      ENEMY: 'enemy'
    };
  }

  addComponent(entityId, data) {
    this.components.set(entityId, {
      faction: data.faction || this.FACTIONS.PLAYER, // Default to player faction
      visibility: data.visibility !== undefined ? data.visibility : true, // Default to visible (for fog of war)
      unitType: data.unitType || 'basic', // Unit type (assault, support, sniper, etc.)
      attackType: data.attackType || 'ranged', // Attack type (ranged, melee)
      damageType: data.damageType || 'normal' // Damage type for resistances/vulnerabilities
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

export default FactionComponent;
