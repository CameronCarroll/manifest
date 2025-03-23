// scenarios/TutorialScenario.js
import BaseScenario from './BaseScenario.js';

class TutorialScenario extends BaseScenario {
  constructor(gameController) {
    super(gameController);
    
    this.name = "Tutorial";
    this.description = "Learn the basics of the game";
    
    // Steps for the tutorial
    this.tutorialSteps = [
      {
        message: "Welcome to the tutorial! First, select a unit by clicking on it.",
        condition: () => this.gameController.inputManager.selectedEntities.size > 0,
        completed: false
      },
      {
        message: "Great! Now right-click somewhere to move your unit.",
        condition: () => this.unitMoved,
        completed: false
      },
      {
        message: "Perfect! Now select multiple units by dragging a box around them.",
        condition: () => this.gameController.inputManager.selectedEntities.size > 2,
        completed: false
      },
      {
        message: "Excellent! Now let's defeat a practice enemy.",
        condition: () => this.enemyDefeated,
        completed: false
      },
      {
        message: "Congratulations! You've completed the tutorial!",
        completed: false
      }
    ];
    
    this.currentStep = 0;
    this.unitMoved = false;
    this.enemyDefeated = false;
    this.tutorialFinished = false;
  }
  
  start() {
    super.start();
    
    // Create player units in formation
    for (let i = 0; i < 5; i++) {
      this.createPlayerUnit('assault', { x: -10 + i * 3, z: 0 });
    }
    
    // Create a couple more off to the side
    this.createPlayerUnit('assault', { x: -15, z: 5 });
    this.createPlayerUnit('assault', { x: -15, z: -5 });
    
    // Add UI overlay for tutorial
    this.createTutorialUI();
    
    // Add hooks to detect events
    if (this.gameController.systems.movement) {
      const originalMoveEntity = this.gameController.systems.movement.moveEntity;
      this.gameController.systems.movement.moveEntity = (entityId, destination, speed, targetEntityId) => {
        this.unitMoved = true;
        return originalMoveEntity.call(
          this.gameController.systems.movement, 
          entityId, 
          destination, 
          speed, 
          targetEntityId
        );
      };
    }
    
    // Add hook to detect combat
    if (this.gameController.systems.combat) {
      const originalApplyDamage = this.gameController.systems.combat.applyDamage;
      this.gameController.systems.combat.applyDamage = (targetId, damageInfo) => {
        // If an enemy is destroyed
        if (this.isEnemyEntity(targetId) && 
            this.entityManager.getComponent(targetId, 'health').currentHealth <= damageInfo.damage) {
          this.enemyDefeated = true;
        }
        return originalApplyDamage.call(
          this.gameController.systems.combat,
          targetId,
          damageInfo
        );
      };
    }
    
    // Start first step
    this.showTutorialMessage(this.tutorialSteps[this.currentStep].message);
  }
  
  createTutorialUI() {
    // Create UI container
    this.tutorialUI = document.createElement('div');
    this.tutorialUI.id = 'tutorial-ui';
    this.tutorialUI.style.position = 'absolute';
    this.tutorialUI.style.bottom = '100px';
    this.tutorialUI.style.left = '50%';
    this.tutorialUI.style.transform = 'translateX(-50%)';
    this.tutorialUI.style.padding = '20px';
    this.tutorialUI.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.tutorialUI.style.color = 'white';
    this.tutorialUI.style.borderRadius = '10px';
    this.tutorialUI.style.fontSize = '18px';
    this.tutorialUI.style.textAlign = 'center';
    this.tutorialUI.style.zIndex = '100';
    this.tutorialUI.style.maxWidth = '80%';
    
    document.body.appendChild(this.tutorialUI);
  }
  
  showTutorialMessage(message) {
    if (this.tutorialUI) {
      this.tutorialUI.textContent = message;
    }
  }
  
  update(deltaTime) {
    super.update(deltaTime);
    
    // Check tutorial step completion
    if (this.currentStep < this.tutorialSteps.length - 1) {
      const step = this.tutorialSteps[this.currentStep];
      
      if (!step.completed && step.condition && step.condition()) {
        step.completed = true;
        this.currentStep++;
        this.showTutorialMessage(this.tutorialSteps[this.currentStep].message);
        
        // If this is the "defeat an enemy" step, spawn an enemy
        if (this.currentStep === 3) {
          this.spawnTutorialEnemy();
        }
      }
    }
    
    // Final step doesn't have a condition
    if (this.currentStep === this.tutorialSteps.length - 1 && !this.tutorialSteps[this.currentStep].completed) {
      // Let the message display for a few seconds
      if (!this.tutorialEndTimer) {
        this.tutorialEndTimer = setTimeout(() => {
          this.tutorialSteps[this.currentStep].completed = true;
          this.tutorialFinished = true;
          
          // Hide tutorial UI
          if (this.tutorialUI) {
            this.tutorialUI.style.display = 'none';
          }
        }, 5000);
      }
    }
  }
  
  spawnTutorialEnemy() {
    // Get average position of player units
    let totalX = 0;
    let totalZ = 0;
    let count = 0;
    
    this.entityManager.gameState.entities.forEach((entity, id) => {
      if (this.isPlayerEntity(id) && this.entityManager.hasComponent(id, 'position')) {
        const pos = this.entityManager.getComponent(id, 'position');
        totalX += pos.x;
        totalZ += pos.z;
        count++;
      }
    });
    
    const avgX = count > 0 ? totalX / count : 0;
    const avgZ = count > 0 ? totalZ / count : 0;
    
    // Spawn enemy at a position visible to the player but at a distance
    const spawnPos = {
      x: avgX + 20,
      y: 0,
      z: avgZ + 20
    };
    
    // Use the spawn system to create an enemy
    if (this.systems.spawn) {
      this.systems.spawn.spawnEnemy('lightInfantry', spawnPos, this.systems.ai);
    }
  }
  
  checkVictory() {
    return this.tutorialFinished;
  }
  
  checkDefeat() {
    // No defeat in tutorial
    return false;
  }
  
  isPlayerEntity(entityId) {
    if (this.entityManager.hasComponent(entityId, 'faction')) {
      const faction = this.entityManager.getComponent(entityId, 'faction');
      return faction.faction === 'player';
    }
    return false;
  }
  
  isEnemyEntity(entityId) {
    if (this.entityManager.hasComponent(entityId, 'faction')) {
      const faction = this.entityManager.getComponent(entityId, 'faction');
      return faction.faction === 'enemy';
    }
    return false;
  }
}

export default TutorialScenario;