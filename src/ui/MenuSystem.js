// ui/MenuSystem.js
class MenuSystem {
    constructor() {
      // Create menu container
      this.menuContainer = document.createElement('div');
      this.menuContainer.id = 'menu-container';
      this.menuContainer.style.position = 'absolute';
      this.menuContainer.style.top = '0';
      this.menuContainer.style.left = '0';
      this.menuContainer.style.width = '100%';
      this.menuContainer.style.height = '100%';
      this.menuContainer.style.display = 'flex';
      this.menuContainer.style.flexDirection = 'column';
      this.menuContainer.style.justifyContent = 'center';
      this.menuContainer.style.alignItems = 'center';
      this.menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      this.menuContainer.style.color = 'white';
      this.menuContainer.style.fontFamily = 'Arial, sans-serif';
      this.menuContainer.style.zIndex = '1000';
      document.body.appendChild(this.menuContainer);
      
      // Callback for game start (will be set by index.js)
      this.onStartGame = null;
    }
  
    showMainMenu() {
      this.menuContainer.style.display = 'flex';
      this.menuContainer.innerHTML = `
        <div style="text-align: center; max-width: 600px; padding: 20px;">
          <h1 style="font-size: 48px; margin-bottom: 20px;">RTS Combat Game</h1>
          <p style="font-size: 18px; margin-bottom: 30px;">
            Command your forces to victory! Build units, gather resources,
            and defeat enemy waves to win.
          </p>
          <button id="start-game-btn" style="padding: 15px 30px; font-size: 24px; 
            background: #4CAF50; color: white; border: none; border-radius: 5px;
            cursor: pointer; margin-bottom: 20px;">
            Start Game
          </button>
          <div style="margin-top: 40px; font-size: 16px; text-align: left;">
            <h3>Controls:</h3>
            <p>- Left-click to select units</p>
            <p>- Shift + Left-click to add to selection</p>
            <p>- Right-click to move selected units</p>
            <p>- Right-click on enemy to attack</p>
            <p>- WASD or arrow keys to move camera</p>
          </div>
        </div>
      `;
      
      // Add event listener to start button
      const startButton = document.getElementById('start-game-btn');
      if (startButton && this.onStartGame) {
        startButton.addEventListener('click', () => {
          this.onStartGame('default'); // Start default scenario
        });
      }
    }
  
    hideMainMenu() {
      this.menuContainer.style.display = 'none';
    }
  
    showGameOver(playerWon) {
      this.menuContainer.style.display = 'flex';
      this.menuContainer.innerHTML = `
        <div style="text-align: center; max-width: 600px;">
          <h1 style="font-size: 48px; margin-bottom: 20px;">
            ${playerWon ? 'Victory!' : 'Defeat!'}
          </h1>
          <p style="font-size: 18px; margin-bottom: 30px;">
            ${playerWon ? 
              'You have successfully defeated all enemy waves!' : 
              'Your base has been destroyed. Better luck next time!'}
          </p>
          <button id="play-again-btn" style="padding: 15px 30px; font-size: 24px; 
            background: #4CAF50; color: white; border: none; border-radius: 5px;
            cursor: pointer;">
            Play Again
          </button>
        </div>
      `;
      
      // Add event listener to play again button
      const playAgainButton = document.getElementById('play-again-btn');
      if (playAgainButton) {
        playAgainButton.addEventListener('click', () => {
          this.showMainMenu();
        });
      }
    }
  
    // Add more menu methods as needed (settings, pause menu, etc.)
  }
  
  export default MenuSystem;