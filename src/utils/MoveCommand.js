class MoveCommand {
  constructor(entityId, destination, movementSystem) {
    this.entityId = entityId;
    this.destination = destination;
    this.movementSystem = movementSystem;
    this.previousPosition = null;
  }
    
  execute() {
    const entityManager = this.movementSystem.entityManager;
    const positionComponent = entityManager.getComponent(this.entityId, 'position');
      
    if (positionComponent) {
      this.previousPosition = { ...positionComponent };
      this.movementSystem.moveEntity(this.entityId, this.destination);
      return true;
    }
    return false;
  }
    
  undo() {
    if (this.previousPosition) {
      const entityManager = this.movementSystem.entityManager;
      const positionComponent = entityManager.getComponent(this.entityId, 'position');
        
      if (positionComponent) {
        this.movementSystem.stopEntity(this.entityId);
        Object.assign(positionComponent, this.previousPosition);
        return true;
      }
    }
    return false;
  }
}

export default MoveCommand;