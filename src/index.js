import * as THREE from 'three';
import MenuSystem from './ui/MenuSystem.js';
import GameController from './core/GameController.js';
import HUD from './ui/HUD.js';

// Initialize core systems on page load
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, initializing game');
  
  // Create game controller but don't start it yet
  const gameController = new GameController();
  
  // Create menu system AFTER game controller is initialized
  const menuSystem = new MenuSystem();
  
  // Create HUD system
  const hud = new HUD();
  
  // Register game start callback
  menuSystem.onStartGame = (scenarioId) => {
    console.log(`Starting scenario: ${scenarioId}`);
    menuSystem.hideMainMenu();
    
    // Load the scenario
    gameController.loadScenario(scenarioId);
    
    // Start the game
    gameController.start();
    
    // Set up a resource update interval to update the HUD
    const resourceUpdateInterval = setInterval(() => {
      if (gameController.isRunning && !gameController.isPaused) {
        hud.updateResourceDisplay(gameController.gameState.playerResources);
        
        // Here we would update production queue if we had it
        // hud.updateProductionQueue(productionQueue);
      }
    }, 100); // Update 10 times per second
    
    // Store the interval ID so we can clear it later
    window.game.resourceUpdateInterval = resourceUpdateInterval;
  };
  
  // Register game end callback
  gameController.onGameEnd = (playerWon) => {
    // Clear the resource update interval
    if (window.game.resourceUpdateInterval) {
      clearInterval(window.game.resourceUpdateInterval);
      window.game.resourceUpdateInterval = null;
    }
    
    menuSystem.showGameOver(playerWon);
  };
  
  // Expose for debugging and menu access to scenarios
  window.game = {
    menuSystem,
    gameController,
    hud,
    resourceUpdateInterval: null
  };
  
  // Show the main menu
  menuSystem.showMainMenu();
});