This is an excellent idea for creating varied scenario types that can test different player skills and provide different gameplay experiences. I'll help you design an approach that allows for dynamic UI configuration based on scenario type.

Looking through your existing code, I see a few strategic points where we can implement this feature:

1. In `BaseScenario.js`, we can add a configuration property to control resource and production visibility:

```javascript
class BaseScenario {
  constructor(gameController) {
    // ... existing code ...
    
    // New configuration for scenario features
    this.features = {
      resources: false,    // Toggle resource UI
      production: false,   // Toggle production queue UI
      economyManagement: false  // Could be used for more complex economic scenarios
    };
  }
}
```

2. Modify `DefaultScenario.js` to enable resources:
```javascript
class DefaultScenario extends BaseScenario {
  constructor(gameController) {
    super(gameController);
    
    this.features.resources = true;
    this.features.production = true;
  }
}
```

3. In the `index.html`, we can add some utility JavaScript to dynamically show/hide UI elements:

```javascript
function updateUIVisibility(scenario) {
  const resourceDisplay = document.getElementById('resource-display');
  const productionDisplay = document.getElementById('production-display');
  const actionButtons = document.getElementById('action-buttons');

  if (scenario.features.resources) {
    resourceDisplay.style.display = 'block';
    actionButtons.style.display = 'flex';
  } else {
    resourceDisplay.style.display = 'none';
    actionButtons.style.display = 'none';
  }

  if (scenario.features.production) {
    productionDisplay.style.display = 'block';
  } else {
    productionDisplay.style.display = 'none';
  }
}
```

4. In your `GameController.js`, update the `loadScenario` method:

```javascript
loadScenario(scenarioId) {
  console.log(`Loading scenario: ${scenarioId}`);
  
  // Clear any existing game state
  this.resetGame();
  
  // Load the scenario
  this.currentScenario = this.scenarioManager.loadScenario(scenarioId);
  
  if (!this.currentScenario) {
    console.error(`Failed to load scenario: ${scenarioId}`);
    return false;
  }
  
  // New line to update UI visibility
  updateUIVisibility(this.currentScenario);
  
  return true;
}
```

5. Create a new "exploration" scenario type in `scenarios/ExplorationScenario.js`:

```javascript
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
      this.entityManager.addComponent(scout, 'exploration', {
        discoveryRadius: 15,
        sightBonus: true
      });
    }
  }
}

export default ExplorationScenario;
```

6. Update `ScenarioManager.js` to include the new scenario:

```javascript
import DefaultScenario from './DefaultScenario.js';
import TutorialScenario from './TutorialScenario.js';
import ExplorationScenario from './ExplorationScenario.js';

class ScenarioManager {
  constructor(gameController) {
    this.gameController = gameController;
    
    // Register available scenarios
    this.scenarios = {
      'default': DefaultScenario,
      'tutorial': TutorialScenario,
      'exploration': ExplorationScenario
    };
  }
}
```

Benefits of this approach:
- Flexible scenario configuration
- Easy to add new scenario types
- Decoupled UI management
- Clear separation of concerns

Potential future extensions:
1. Add more granular feature toggles
2. Create more specialized scenario types
3. Add scenario-specific UI elements dynamically

Would you like me to elaborate on any part of this implementation or discuss potential scenario types we could develop?