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
    this.menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.92)'; // Increased opacity
    this.menuContainer.style.color = 'white';
    this.menuContainer.style.fontFamily = '"Courier New", Courier, monospace'; // Retro font
    this.menuContainer.style.zIndex = '1000';
    document.body.appendChild(this.menuContainer);
    
    // Callback for game start (will be set by index.js)
    this.onStartGame = null;
  }

  showMainMenu() {
    // Get available scenarios from ScenarioManager
    let scenarioOptionsHTML = '';
    
    if (window.game && window.game.gameController && window.game.gameController.scenarioManager) {
      const scenarioList = window.game.gameController.scenarioManager.getScenarioList();
      
      scenarioOptionsHTML = scenarioList.map(scenarioId => {
        // Get scenario instance to display name/description
        const scenario = window.game.gameController.scenarioManager.loadScenario(scenarioId);
        const scenarioName = scenario ? scenario.name : scenarioId;
        const scenarioDesc = scenario ? scenario.description : '';
        
        return `
          <div class="scenario-option" data-scenario-id="${scenarioId}" style="
            background-color: rgba(0, 0, 0, 0.5);
            border: 2px solid #FFD700;
            border-radius: 10px;
            padding: 10px;
            margin: 8px 0;
            cursor: pointer;
            transition: transform 0.2s, background-color 0.2s;
          ">
            <h3 style="margin: 0 0 5px 0; color: #FFD700;">${scenarioName}</h3>
            <p style="margin: 0; font-size: 14px;">${scenarioDesc}</p>
          </div>
        `;
      }).join('');
    }
    
    this.menuContainer.style.display = 'flex';
    this.menuContainer.innerHTML = `
      <div style="
        text-align: center; 
        max-width: 600px; 
        padding: 30px;
        background-color: rgba(40, 40, 40, 0.8);
        border: 4px solid #FFD700;
        border-radius: 15px;
      ">
        <h1 style="
          font-size: 52px; 
          margin-bottom: 10px; 
          text-transform: uppercase; 
          letter-spacing: 3px;
          color: #FFD700;
          text-shadow: 4px 4px 0px #FF5500;
        ">RTS Combat</h1>
        
        <div style="
          width: 80%;
          height: 4px;
          background: linear-gradient(90deg, transparent, #FF5500, #FFD700, #FF5500, transparent);
          margin: 0 auto 20px auto;
        "></div>
        
        <p style="
          font-size: 18px; 
          margin-bottom: 30px;
          color: #F5F5F5;
          line-height: 1.5;
        ">
          Command your forces to victory! Build units, gather resources,
          and defeat enemy waves to win.
        </p>
        
        <div style="margin-bottom: 30px;">
          <h2 style="
            color: #FF5500; 
            font-size: 24px; 
            margin-bottom: 15px;
            text-transform: uppercase;
          ">SELECT SCENARIO</h2>
          <div id="scenario-list" style="text-align: left;">
            ${scenarioOptionsHTML || '<p>No scenarios available</p>'}
          </div>
        </div>
        
        <div style="
          margin-top: 40px; 
          font-size: 16px; 
          text-align: left;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 15px;
          border-radius: 10px;
        ">
          <h3 style="
            color: #FFD700; 
            margin-top: 0; 
            border-bottom: 2px solid #FF5500;
            padding-bottom: 5px;
          ">CONTROLS:</h3>
          <p>- Left-click to select units</p>
          <p>- Shift + Left-click to add to selection</p>
          <p>- Right-click to move selected units</p>
          <p>- Right-click on enemy to attack</p>
          <p>- WASD or arrow keys to move camera</p>
        </div>
      </div>
    `;
    
    // Add event listener to scenario options
    const scenarioOptionElements = document.querySelectorAll('.scenario-option');
    scenarioOptionElements.forEach(option => {
      // Add hover effect
      option.addEventListener('mouseover', () => {
        option.style.backgroundColor = 'rgba(60, 60, 60, 0.7)';
        option.style.transform = 'translateY(-2px)';
      });
      
      option.addEventListener('mouseout', () => {
        option.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        option.style.transform = 'translateY(0)';
      });
      
      // Add click handler
      option.addEventListener('click', () => {
        if (this.onStartGame) {
          const scenarioId = option.getAttribute('data-scenario-id');
          this.onStartGame(scenarioId);
        }
      });
    });
  }

  hideMainMenu() {
    this.menuContainer.style.display = 'none';
  }

  showGameOver(playerWon) {
    this.menuContainer.style.display = 'flex';
    this.menuContainer.innerHTML = `
      <div style="
        text-align: center; 
        max-width: 600px;
        padding: 30px;
        background-color: rgba(40, 40, 40, 0.8);
        border: 4px solid #FFD700;
        border-radius: 15px;
      ">
        <h1 style="
          font-size: 52px; 
          margin-bottom: 20px;
          text-transform: uppercase; 
          letter-spacing: 3px;
          color: ${playerWon ? '#FFD700' : '#FF5500'};
          text-shadow: 4px 4px 0px ${playerWon ? '#FF5500' : '#990000'};
        ">
          ${playerWon ? 'Victory!' : 'Defeat!'}
        </h1>
        
        <div style="
          width: 80%;
          height: 4px;
          background: linear-gradient(90deg, transparent, #FF5500, #FFD700, #FF5500, transparent);
          margin: 0 auto 20px auto;
        "></div>
        
        <p style="
          font-size: 18px; 
          margin-bottom: 30px;
          color: #F5F5F5;
          line-height: 1.5;
        ">
          ${playerWon ? 
    'You have successfully defeated all enemy waves!' : 
    'Your base has been destroyed. Better luck next time!'}
        </p>
        
        <button id="play-again-btn" style="
          padding: 15px 30px; 
          font-size: 24px; 
          font-family: 'Courier New', Courier, monospace;
          background-color: #FF5500; 
          color: white; 
          border: 3px solid #FFD700; 
          border-radius: 5px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 2px;
          transition: background-color 0.3s, transform 0.2s;
        ">
          Play Again
        </button>
      </div>
    `;
    
    // Add event listener to play again button
    const playAgainButton = document.getElementById('play-again-btn');
    if (playAgainButton) {
      // Add hover effects
      playAgainButton.addEventListener('mouseover', () => {
        playAgainButton.style.backgroundColor = '#FFD700';
        playAgainButton.style.color = '#000';
        playAgainButton.style.transform = 'translateY(-3px)';
      });
      
      playAgainButton.addEventListener('mouseout', () => {
        playAgainButton.style.backgroundColor = '#FF5500';
        playAgainButton.style.color = '#FFF';
        playAgainButton.style.transform = 'translateY(0)';
      });
      
      playAgainButton.addEventListener('click', () => {
        this.showMainMenu();
      });
    }
  }

  // Add more menu methods as needed (settings, pause menu, etc.)
}

export default MenuSystem;