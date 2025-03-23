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
    if (!this.resourceDisplay) return;
    
    // Update existing resource panel content
    const contentDiv = this.resourceDisplay.querySelector('.panel-content');
    if (!contentDiv) return;
    
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
    if (!this.productionDisplay) return;
    
    // Update existing production panel content
    const contentDiv = this.productionDisplay.querySelector('.panel-content');
    if (!contentDiv) return;
    
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