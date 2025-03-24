// ui/HUD.js
class HUD {
  constructor() {
    // Create UI containers
    this.createUIContainers();
  }
  
  createUIContainers() {
    // Use existing elements instead of creating new ones
    this.resourceDisplay = document.getElementById('resource-display');
    this.productionDisplay = document.getElementById('production-display');
    this.actionButtons = document.getElementById('action-buttons');
    
    // Clear existing placeholder action buttons if we found the container
    if (this.actionButtons) {
      this.actionButtons.innerHTML = '';
      
      // Add our action buttons
      this.addActionButton('Build', '#FFD700');
      this.addActionButton('Research', '#00FFFF');
      this.addActionButton('Attack', '#FF0000');
    }
  }

  // Add ability UI
  createAbilityUI() {
    const abilityBar = document.createElement('div');
    abilityBar.id = 'ability-bar';
    abilityBar.style.position = 'absolute';
    abilityBar.style.bottom = '10px';
    abilityBar.style.left = '50%';
    abilityBar.style.transform = 'translateX(-50%)';
    abilityBar.style.display = 'flex';
    abilityBar.style.gap = '10px';
    abilityBar.style.zIndex = '10';
  
    // Create ability slots
    for (let i = 1; i <= 4; i++) {
      const abilitySlot = document.createElement('div');
      abilitySlot.className = 'ability-slot';
      abilitySlot.id = `ability-slot-${i}`;
      abilitySlot.style.width = '50px';
      abilitySlot.style.height = '50px';
      abilitySlot.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      abilitySlot.style.border = '2px solid #666';
      abilitySlot.style.borderRadius = '5px';
      abilitySlot.style.display = 'flex';
      abilitySlot.style.alignItems = 'center';
      abilitySlot.style.justifyContent = 'center';
      abilitySlot.style.color = 'white';
      abilitySlot.style.fontSize = '12px';
      abilitySlot.style.position = 'relative';
    
      // Add hotkey label
      const hotkeyLabel = document.createElement('div');
      hotkeyLabel.style.position = 'absolute';
      hotkeyLabel.style.bottom = '2px';
      hotkeyLabel.style.right = '2px';
      hotkeyLabel.style.fontSize = '10px';
      hotkeyLabel.textContent = i;
    
      abilitySlot.appendChild(hotkeyLabel);
      abilityBar.appendChild(abilitySlot);
    }
  
    document.body.appendChild(abilityBar);
    this.abilityBar = abilityBar;
  }

  // Update ability UI based on selected entity
  updateAbilityUI(selectedEntities, abilitySystem) {
    if (!this.abilityBar) {return;}
  
    // If no entities selected, hide ability bar
    if (selectedEntities.size === 0) {
      this.abilityBar.style.display = 'none';
      return;
    }
  
    // Show ability bar
    this.abilityBar.style.display = 'flex';
  
    // Get abilities for first selected entity (could enhance to show common abilities)
    const entityId = Array.from(selectedEntities)[0];
    const abilities = abilitySystem.getEntityAbilities(entityId);
  
    // Update ability slots
    for (let i = 1; i <= 4; i++) {
      const slot = document.getElementById(`ability-slot-${i}`);
      if (!slot) {continue;}
    
      const abilityIndex = i - 1;
      const ability = abilities[abilityIndex];
    
      if (ability) {
      // Update slot with ability info
        slot.style.border = '2px solid #4CAF50';
      
        // Clear previous content (except hotkey)
        while (slot.childNodes.length > 1) {
          slot.removeChild(slot.firstChild);
        }
      
        // Add ability icon/name
        const abilityName = document.createElement('div');
        abilityName.style.fontSize = '10px';
        abilityName.textContent = this.formatAbilityName(ability);
      
        // Insert before hotkey label
        slot.insertBefore(abilityName, slot.firstChild);
      
        // Check cooldown
        const cooldownKey = `${entityId}_${ability}`;
        if (abilitySystem.abilityCooldowns.has(cooldownKey)) {
          const cooldown = abilitySystem.abilityCooldowns.get(cooldownKey);
        
          // Add cooldown overlay
          const cooldownOverlay = document.createElement('div');
          cooldownOverlay.style.position = 'absolute';
          cooldownOverlay.style.bottom = '0';
          cooldownOverlay.style.left = '0';
          cooldownOverlay.style.width = '100%';
          cooldownOverlay.style.height = `${cooldown * 20}%`; // Scale based on max cooldown
          cooldownOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          cooldownOverlay.style.zIndex = '1';
        
          slot.appendChild(cooldownOverlay);
        }
      } else {
      // Empty slot
        slot.style.border = '2px solid #666';
      
        // Clear previous content (except hotkey)
        while (slot.childNodes.length > 1) {
          slot.removeChild(slot.firstChild);
        }
      }
    }
  }

  // Format ability name for display
  formatAbilityName(ability) {
    return ability
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  addActionButton(text, color) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.padding = '8px 15px';
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    button.style.color = color;
    button.style.border = `2px solid ${color}`;
    button.style.borderRadius = '5px';
    button.style.fontFamily = '"Courier New", Courier, monospace';
    button.style.cursor = 'pointer';
    
    // Add hover effects
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    });
    
    this.actionButtons.appendChild(button);
  }
  
  updateResourceDisplay(resources) {
    if (!this.resourceDisplay) {return;}
    
    // Update existing resource panel content
    const contentDiv = this.resourceDisplay.querySelector('.panel-content');
    if (!contentDiv) {return;}
    
    let resourceHtml = '<div class="resource-counter">';
    
    // Format each resource
    for (const [type, amount] of Object.entries(resources)) {
      const formattedAmount = Math.floor(amount);
      const icon = type === 'minerals' ? '⬡' : '⬢';
      resourceHtml += `<div class="resource-item"><span class="resource-icon">${icon}</span> ${formattedAmount}</div>`;
    }
    
    resourceHtml += '</div>';
    contentDiv.innerHTML = resourceHtml;
  }
  
  updateProductionQueue(queue) {
    if (!this.productionDisplay) {return;}
    
    // Update existing production panel content
    const contentDiv = this.productionDisplay.querySelector('.panel-content');
    if (!contentDiv) {return;}
    
    if (!queue || queue.length === 0) {
      contentDiv.innerHTML = '<div>No units in production</div>';
      return;
    }
    
    let productionHtml = '';
    
    queue.forEach((item, index) => {
      const progressPercent = Math.floor(item.progress * 100);
      
      productionHtml += `
        <div class="production-item">
          <span>${item.name}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span>${progressPercent}%</span>
        </div>
      `;
    });
    
    contentDiv.innerHTML = productionHtml;
  }
  
  updateObjectives(objectives) {
    // Implement objective display
  }
  
  clear() {
    // We no longer need to remove elements from the DOM
    // since we're using existing elements
    this.resourceDisplay = null;
    this.productionDisplay = null;
    this.actionButtons = null;
  }
}

export default HUD;