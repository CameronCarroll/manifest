import * as THREE from 'three';
import MenuSystem from './ui/MenuSystem.js';
import GameController from './core/GameController.js';

// Initialize core systems on page load
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, initializing game');
  
  // Create menu system
  const menuSystem = new MenuSystem();
  
  // Create game controller but don't start it yet
  const gameController = new GameController();
  
  // Register game start callback
  menuSystem.onStartGame = (scenarioId) => {
    menuSystem.hideMainMenu();
    gameController.loadScenario(scenarioId);
    gameController.start();
  };
  
  // Register game end callback
  gameController.onGameEnd = (playerWon) => {
    menuSystem.showGameOver(playerWon);
  };
  
  // Show the main menu
  menuSystem.showMainMenu();
  
  // Expose for debugging
  window.game = {
    menuSystem,
    gameController
  };
});