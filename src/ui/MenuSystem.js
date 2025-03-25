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
    this.menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // More transparency
    this.menuContainer.style.color = 'white';
    this.menuContainer.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'; // Modern font
    this.menuContainer.style.zIndex = '1000';
    document.body.appendChild(this.menuContainer);

    // Game options
    this.edgeScrollingEnabled = false;
    
    // Callback for game start (will be set by index.js)
    this.onStartGame = null;
  }

  showMainMenu() {
    // Get scenario options HTML before creating the template
    const scenarioOptionsHTML = this.createScenarioOptions();
    
    this.menuContainer.style.display = 'flex';
    this.menuContainer.innerHTML = `
      <div style="
        text-align: center; 
        max-width: 600px; 
        padding: 30px;
        background-color: rgba(15, 20, 30, 0.9);
        border: 2px solid #00ccff;
        border-radius: 6px;
        box-shadow: 0 0 20px rgba(0, 204, 255, 0.3);
      ">
        <h1 style="
          font-size: 52px; 
          margin-bottom: 10px; 
          letter-spacing: 3px;
          color: #ffffff;
          text-shadow: 0 0 10px #00ccff, 0 0 20px #00ccff;
          font-weight: 300;
        ">MANIFEST</h1>
        
        <div style="
          width: 80%;
          height: 3px;
          background: linear-gradient(90deg, transparent, #00ccff, #ffffff, #00ccff, transparent);
          margin: 0 auto 20px auto;
        "></div>
        
        <p style="
          font-size: 16px; 
          margin-bottom: 30px;
          color: #cccccc;
          line-height: 1.6;
        ">
          Navigate the desolate wasteland with your two-man squad - a precision Neon Assassin and 
          resilient Scrap Golem. Reach the mysterious techno-arcane beacon while avoiding
          hostile forces that guard this forgotten realm.
        </p>
        
        <div style="margin-bottom: 30px;">
          <h2 style="
            color: #00ccff; 
            font-size: 20px; 
            margin-bottom: 15px;
            font-weight: 400;
            letter-spacing: 1px;
          ">SELECT MISSION</h2>
          <div id="scenario-list" style="text-align: left;">
            ${scenarioOptionsHTML || '<p>No scenarios available</p>'}
          </div>
        </div>
        
        <div style="
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 20px;
        ">
          <div style="
            color: #00ccff;
            margin-right: 15px;
            font-size: 16px;
          ">Edge Scrolling:</div>
          
          <button id="edge-scroll-toggle" style="
            background-color: ${this.edgeScrollingEnabled ? 'rgba(0, 204, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
            color: ${this.edgeScrollingEnabled ? '#ffffff' : '#999999'};
            border: 1px solid #00ccff;
            border-radius: 4px;
            padding: 8px 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.3s ease;
            outline: none;
          ">
            ${this.edgeScrollingEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        
        <div style="
          margin-top: 40px; 
          font-size: 14px; 
          text-align: left;
          background-color: rgba(0, 0, 0, 0.4);
          padding: 15px;
          border-radius: 4px;
          border: 1px solid rgba(0, 204, 255, 0.3);
        ">
          <h3 style="
            color: #00ccff; 
            margin-top: 0; 
            padding-bottom: 5px;
            font-weight: 400;
            letter-spacing: 1px;
          ">CONTROLS:</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <p>Left-click: Select units</p>
            <p>Right-click: Move selected units</p>
            <p>Shift + Left-click: Add to selection</p>
            <p>Right-click on enemy: Attack</p>
            <p>Arrow keys: Move camera</p>
            <p>Mouse wheel: Zoom camera</p>
            <p>1-4: Use abilities</p>
            <p>S: Stop selected units</p>
            <p>ESC: Clear selection</p>
            <p>Middle mouse & drag: Pan camera</p>
          </div>
        </div>
      </div>
    `;
    
    // Add event listener to edge scrolling toggle
    const edgeScrollToggle = document.getElementById('edge-scroll-toggle');
    edgeScrollToggle.addEventListener('click', () => {
      this.toggleEdgeScrolling();
      
      // Update button appearance
      edgeScrollToggle.textContent = this.edgeScrollingEnabled ? 'ON' : 'OFF';
      edgeScrollToggle.style.backgroundColor = this.edgeScrollingEnabled ? 'rgba(0, 204, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)';
      edgeScrollToggle.style.color = this.edgeScrollingEnabled ? '#ffffff' : '#999999';

      // Play UI sound
      this.playUISound();
    });
    
    // Add event listeners to scenario options
    const scenarioOptionElements = document.querySelectorAll('.scenario-option');
    scenarioOptionElements.forEach(option => {
      // Add hover effect
      option.addEventListener('mouseover', () => {
        option.style.backgroundColor = 'rgba(0, 204, 255, 0.1)';
        option.style.transform = 'translateY(-2px)';
        option.style.boxShadow = '0 5px 15px rgba(0, 204, 255, 0.2)';
      });
      
      option.addEventListener('mouseout', () => {
        option.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        option.style.transform = 'translateY(0)';
        option.style.boxShadow = 'none';
      });
      
      // Add click handler
      option.addEventListener('click', () => {
        if (this.onStartGame) {
          const scenarioId = option.getAttribute('data-scenario-id');
          this.playUISound();
          this.onStartGame(scenarioId);
        }
      });
    });
  }

  createScenarioOptions() {
    if (!window.game?.gameController?.scenarioManager) {
      return '<p>No scenarios available</p>';
    }
  
    const scenarioList = window.game.gameController.scenarioManager.getScenarioList();
    
    return scenarioList.map(scenarioId => {
      // Get scenario instance to display name/description
      const scenario = window.game.gameController.scenarioManager.loadScenario(scenarioId);
      const scenarioName = scenario?.name || scenarioId;
      const scenarioDesc = scenario?.description || 'No description available';
      
      return `
        <div class="scenario-option" data-scenario-id="${scenarioId}" style="
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 204, 255, 0.5);
          border-radius: 4px;
          padding: 12px;
          margin: 8px 0;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          <h3 style="margin: 0 0 5px 0; color: #ffffff; font-weight: 400;">${scenarioName}</h3>
          <p style="margin: 0; font-size: 14px; color: #aaaaaa;">${scenarioDesc}</p>
        </div>
      `;
    }).join('');
  }

  // Add method to toggle edge scrolling
  toggleEdgeScrolling(enable = !this.edgeScrollingEnabled) {
    this.edgeScrollingEnabled = enable;
    console.info(`Edge scrolling ${enable ? 'enabled' : 'disabled'}`);
    
    // If game is running, we might want to communicate this to the input manager
    if (window.game && window.game.gameController && window.game.gameController.inputManager) {
      // This assumes InputManager has a method to toggle edge scrolling
      window.game.gameController.inputManager.toggleEdgeScrolling(this.edgeScrollingEnabled);
    }
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
        background-color: rgba(15, 20, 30, 0.9);
        border: 2px solid ${playerWon ? '#00ccff' : '#ff3366'};
        border-radius: 6px;
        box-shadow: 0 0 20px ${playerWon ? 'rgba(0, 204, 255, 0.3)' : 'rgba(255, 51, 102, 0.3)'};
      ">
        <h1 style="
          font-size: 52px; 
          margin-bottom: 20px;
          letter-spacing: 3px;
          color: ${playerWon ? '#ffffff' : '#ff3366'};
          text-shadow: 0 0 10px ${playerWon ? '#00ccff' : '#ff3366'};
          font-weight: 300;
        ">
          ${playerWon ? 'MISSION COMPLETE' : 'MISSION FAILED'}
        </h1>
        
        <div style="
          width: 80%;
          height: 3px;
          background: linear-gradient(90deg, transparent, ${playerWon ? '#00ccff' : '#ff3366'}, #ffffff, ${playerWon ? '#00ccff' : '#ff3366'}, transparent);
          margin: 0 auto 20px auto;
        "></div>
        
        <p style="
          font-size: 18px; 
          margin-bottom: 30px;
          color: #cccccc;
          line-height: 1.5;
        ">
          ${playerWon ? 
            'Your team has successfully secured the techno-arcane beacon. The secrets of the wasteland are now within reach.' : 
            'Your team has been lost to the wasteland. The beacon remains undisturbed, awaiting another expedition.'}
        </p>
        
        <button id="play-again-btn" style="
          padding: 12px 25px; 
          font-size: 18px; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: rgba(0, 0, 0, 0.5); 
          color: ${playerWon ? '#00ccff' : '#ff3366'}; 
          border: 1px solid ${playerWon ? '#00ccff' : '#ff3366'}; 
          border-radius: 4px;
          cursor: pointer;
          letter-spacing: 1px;
          transition: all 0.3s ease;
        ">
          RETURN TO BASE
        </button>
      </div>
    `;
    
    // Add event listener to play again button
    const playAgainButton = document.getElementById('play-again-btn');
    if (playAgainButton) {
      // Add hover effects
      playAgainButton.addEventListener('mouseover', () => {
        playAgainButton.style.backgroundColor = playerWon ? 'rgba(0, 204, 255, 0.2)' : 'rgba(255, 51, 102, 0.2)';
        playAgainButton.style.transform = 'translateY(-3px)';
        playAgainButton.style.boxShadow = `0 5px 15px ${playerWon ? 'rgba(0, 204, 255, 0.3)' : 'rgba(255, 51, 102, 0.3)'}`;
      });
      
      playAgainButton.addEventListener('mouseout', () => {
        playAgainButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        playAgainButton.style.transform = 'translateY(0)';
        playAgainButton.style.boxShadow = 'none';
      });
      
      playAgainButton.addEventListener('click', () => {
        this.playUISound();
        this.showMainMenu();
      });
    }
  }

  playUISound(sound = 'ui-click') {
    if (window.game && window.game.gameController && window.game.gameController.audioSystem) {
      window.game.gameController.audioSystem.playSound(sound);
    }
  }

  // Add more menu methods as needed (settings, pause menu, etc.)
}

export default MenuSystem;