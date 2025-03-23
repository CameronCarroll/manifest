import * as THREE from 'three';
import MenuSystem from './ui/MenuSystem.js';
import GameController from './core/GameController.js';

// Initialize core systems on page load
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, initializing game');
  
  // Create game controller but don't start it yet
  const gameController = new GameController();
  
  // Create menu system AFTER game controller is initialized
  const menuSystem = new MenuSystem();
  
  // Register game start callback
  menuSystem.onStartGame = (scenarioId) => {
    console.log(`Starting scenario: ${scenarioId}`);
    menuSystem.hideMainMenu();
    gameController.loadScenario(scenarioId);
    gameController.start();
  };
  
  // Register game end callback
  gameController.onGameEnd = (playerWon) => {
    menuSystem.showGameOver(playerWon);
  };
  
  // Expose for debugging and menu access to scenarios
  window.game = {
    menuSystem,
    gameController
  };
  
  // Show the main menu
  menuSystem.showMainMenu();
});