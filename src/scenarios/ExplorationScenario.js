// scenarios/ExplorationScenario.js
import BaseScenario from './BaseScenario.js';

class ExplorationScenario extends BaseScenario {
  constructor(gameController) {
    super(gameController);
    
    this.name = 'Exploration';
    this.description = 'Discover and explore the map with limited resources';
    
    // By default, no economy UI
    this.features.resources = false;
    this.features.production = false;
  }
  
  start() {
    super.start();
    
    // Create exploration-focused units
    this.createExplorationUnits();
  }
  
  createExplorationUnits() {
    // Create scout-like units with high mobility
    const scoutCount = 5;
    for (let i = 0; i < scoutCount; i++) {
      const scout = this.createPlayerUnit('sniper', {
        x: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 40
      });
      
      // Maybe give scouts special exploration abilities
      // This would require adding an exploration component to the entity manager
      if (this.entityManager.componentManagers['exploration']) {
        this.entityManager.addComponent(scout, 'exploration', {
          discoveryRadius: 15,
          sightBonus: true
        });
      }
    }
  }
}

export default ExplorationScenario;