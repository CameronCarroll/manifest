// src/core/ObjectivesSystem.js

class ObjectivesSystem {
    constructor(entityManager) {
      this.entityManager = entityManager;
      this.winConditions = [];
      this.failConditions = [];
      this.objectives = [];
      this.status = {
        gameWon: false,
        gameLost: false,
        objectivesCompleted: 0,
        totalObjectives: 0
      };
    }
    
    // Define a win condition for the game
    defineWinCondition(condition) {
      this.winConditions.push(condition);
      
      // If it's a wave completion objective, update total objectives
      if (condition.type === 'SURVIVE_WAVES') {
        this.status.totalObjectives += 1;
      }
    }
    
    // Define a fail condition for the game
    defineFailCondition(condition) {
      this.failConditions.push(condition);
    }
    
    // Add an objective for the player
    addObjective(objective) {
      this.objectives.push({
        ...objective,
        completed: false,
        progress: 0
      });
      this.status.totalObjectives += 1;
    }
    
    // Update objectives progress
    updateObjectiveProgress(objectiveId, progress) {
      const objective = this.objectives.find(obj => obj.id === objectiveId);
      if (objective) {
        objective.progress = Math.min(1, Math.max(0, progress));
        if (objective.progress >= 1 && !objective.completed) {
          objective.completed = true;
          this.status.objectivesCompleted += 1;
        }
      }
    }
    
    // Check if the player has won
    checkWinState() {
      // If already won, return true
      if (this.status.gameWon) return true;
      
      // Check each win condition
      for (const condition of this.winConditions) {
        switch (condition.type) {
          case 'SURVIVE_WAVES':
            // Check if all waves are completed
            if (this.entityManager.gameState.systems && 
                this.entityManager.gameState.systems.spawn) {
              
              const spawnSystem = this.entityManager.gameState.systems.spawn;
              let activeWaves = 0;
              let completedWaves = 0;
              let totalWaves = 0;
              
              spawnSystem.activeWaves.forEach(wave => {
                totalWaves++;
                if (wave.completed) completedWaves++;
                if (wave.active && !wave.completed) activeWaves++;
              });
              
              // Win if all waves completed with no active waves
              if (totalWaves > 0 && completedWaves === totalWaves && activeWaves === 0) {
                this.status.gameWon = true;
                return true;
              }
              
              // Update objective progress
              if (condition.objectiveId && totalWaves > 0) {
                this.updateObjectiveProgress(condition.objectiveId, completedWaves / condition.totalWaves);
              }
            }
            break;
            
          case 'DESTROY_ALL_ENEMIES':
            // Check if all enemies are destroyed
            let enemyCount = 0;
            this.entityManager.gameState.entities.forEach((entity, id) => {
              if (this.entityManager.hasComponent(id, 'faction')) {
                const faction = this.entityManager.getComponent(id, 'faction');
                if (faction.faction === 'enemy') {
                  enemyCount++;
                }
              }
            });
            
            if (enemyCount === 0) {
              this.status.gameWon = true;
              return true;
            }
            break;
            
          case 'PROTECT_VIP':
            // Check if the VIP entity still exists and has health
            if (condition.entityId && 
                this.entityManager.hasComponent(condition.entityId, 'health')) {
              const health = this.entityManager.getComponent(condition.entityId, 'health');
              if (health.currentHealth > 0) {
                // VIP still alive, check for additional win requirements
                if (condition.requiredTime) {
                  if (this.entityManager.gameState.gameTime >= condition.requiredTime) {
                    this.status.gameWon = true;
                    return true;
                  }
                  
                  // Update objective progress
                  if (condition.objectiveId) {
                    this.updateObjectiveProgress(
                      condition.objectiveId, 
                      this.entityManager.gameState.gameTime / condition.requiredTime
                    );
                  }
                }
              }
            } else {
              // VIP is gone, objective failed
            }
            break;
            
          case 'CAPTURE_POINTS':
            // Check if all required points are captured
            if (condition.requiredPoints && condition.requiredPoints > 0) {
              // Count captured points
              let capturedPoints = 0;
              
              // Implement point capture counting logic here
              
              if (capturedPoints >= condition.requiredPoints) {
                this.status.gameWon = true;
                return true;
              }
              
              // Update objective progress
              if (condition.objectiveId) {
                this.updateObjectiveProgress(
                  condition.objectiveId,
                  capturedPoints / condition.requiredPoints
                );
              }
            }
            break;
        }
      }
      
      // If all objectives are completed and there are any, the player has won
      if (this.objectives.length > 0 && 
          this.status.objectivesCompleted === this.status.totalObjectives) {
        this.status.gameWon = true;
        return true;
      }
      
      return false;
    }
    
    // Check if the player has lost
    checkFailState() {
      // If already lost, return true
      if (this.status.gameLost) return true;
      
      // Check each fail condition
      for (const condition of this.failConditions) {
        switch (condition.type) {
          case 'BASE_DESTROYED':
            // Check if the base entity still exists and has health
            if (condition.entityId && 
                !this.entityManager.hasComponent(condition.entityId, 'health')) {
              this.status.gameLost = true;
              return true;
            } else if (condition.entityId && 
                      this.entityManager.hasComponent(condition.entityId, 'health')) {
              const health = this.entityManager.getComponent(condition.entityId, 'health');
              if (health.currentHealth <= 0) {
                this.status.gameLost = true;
                return true;
              }
            }
            break;
            
          case 'TIME_EXPIRED':
            // Check if the time limit has been reached
            if (condition.timeLimit && 
                this.entityManager.gameState.gameTime >= condition.timeLimit) {
              this.status.gameLost = true;
              return true;
            }
            break;
            
          case 'ALL_UNITS_DESTROYED':
            // Check if all player units are destroyed
            let playerUnitCount = 0;
            this.entityManager.gameState.entities.forEach((entity, id) => {
              if (this.entityManager.hasComponent(id, 'faction')) {
                const faction = this.entityManager.getComponent(id, 'faction');
                if (faction.faction === 'player') {
                  playerUnitCount++;
                }
              }
            });
            
            if (playerUnitCount === 0) {
              this.status.gameLost = true;
              return true;
            }
            break;
        }
      }
      
      return false;
    }
    
    // Update the objectives system
    update(deltaTime) {
      // Skip if game is already decided
      if (this.status.gameWon || this.status.gameLost) return;
      
      // Check win/loss conditions
      this.checkWinState();
      this.checkFailState();
    }
    
    // Get current objectives status
    getObjectivesStatus() {
      return {
        objectives: this.objectives.map(obj => ({
          id: obj.id,
          title: obj.title,
          description: obj.description,
          completed: obj.completed,
          progress: obj.progress
        })),
        gameWon: this.status.gameWon,
        gameLost: this.status.gameLost,
        progress: this.status.totalObjectives > 0 
          ? this.status.objectivesCompleted / this.status.totalObjectives 
          : 0
      };
    }
  }
  
  export default ObjectivesSystem;