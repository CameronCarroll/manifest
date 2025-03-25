// scenarios/ScenarioManager.js
import DefaultScenario from './DefaultScenario.js';
import TutorialScenario from './TutorialScenario.js';
import ExplorationScenario from './ExplorationScenario.js';

class ScenarioManager {
  constructor(gameController) {
    this.gameController = gameController;
    
    // Register available scenarios
    this.scenarios = {
      'exploration': ExplorationScenario
    };
  }
  
  getScenarioList() {
    return Object.keys(this.scenarios);
  }
  
  loadScenario(scenarioId) {
    if (!this.scenarios[scenarioId]) {
      console.error(`Scenario ${scenarioId} not found`);
      return null;
    }
    
    // Create a new instance of the scenario
    const ScenarioClass = this.scenarios[scenarioId];
    return new ScenarioClass(this.gameController);
  }
}

export default ScenarioManager;