import MoveCommand from '../../../src/utils/MoveCommand';

// Mock dependencies
jest.mock('../../../src/entities/systems/MovementSystem', () => {
  return jest.fn().mockImplementation(() => ({
    moveEntity: jest.fn(),
    stopEntity: jest.fn(),
    entityManager: {
      getComponent: jest.fn()
    }
  }));
});

describe('MoveCommand', () => {
  let movementSystem;
  let entityId;
  let destination;
  let command;
  
  beforeEach(() => {
    // Setup mocks
    movementSystem = {
      moveEntity: jest.fn(),
      stopEntity: jest.fn(),
      entityManager: {
        getComponent: jest.fn()
      }
    };
    entityId = 1;
    destination = { x: 10, y: 0, z: 10 };
    command = new MoveCommand(entityId, destination, movementSystem);
  });

  describe('execute', () => {
    it('should return false if position component does not exist', () => {
      movementSystem.entityManager.getComponent.mockReturnValue(null);
      
      const result = command.execute();
      
      expect(result).toBe(false);
      expect(movementSystem.entityManager.getComponent).toHaveBeenCalledWith(entityId, 'position');
      expect(movementSystem.moveEntity).not.toHaveBeenCalled();
    });

    it('should store previous position and move entity to destination', () => {
      const positionComponent = { x: 0, y: 0, z: 0 };
      movementSystem.entityManager.getComponent.mockReturnValue(positionComponent);
      
      const result = command.execute();
      
      expect(result).toBe(true);
      expect(command.previousPosition).toEqual(positionComponent);
      expect(movementSystem.moveEntity).toHaveBeenCalledWith(entityId, destination);
    });
  });

  describe('undo', () => {
    it('should return false if no previous position exists', () => {
      command.previousPosition = null;
      
      const result = command.undo();
      
      expect(result).toBe(false);
      expect(movementSystem.stopEntity).not.toHaveBeenCalled();
    });

    it('should return false if position component no longer exists', () => {
      command.previousPosition = { x: 0, y: 0, z: 0 };
      movementSystem.entityManager.getComponent.mockReturnValue(null);
      
      const result = command.undo();
      
      expect(result).toBe(false);
      expect(movementSystem.entityManager.getComponent).toHaveBeenCalledWith(entityId, 'position');
      expect(movementSystem.stopEntity).not.toHaveBeenCalled();
    });

    it('should restore previous position and stop entity movement', () => {
      const previousPosition = { x: 0, y: 0, z: 0 };
      const currentPosition = { x: 5, y: 0, z: 5 };
      command.previousPosition = previousPosition;
      movementSystem.entityManager.getComponent.mockReturnValue(currentPosition);
      
      const result = command.undo();
      
      expect(result).toBe(true);
      expect(movementSystem.stopEntity).toHaveBeenCalledWith(entityId);
      expect(currentPosition).toEqual(previousPosition);
    });
  });
});