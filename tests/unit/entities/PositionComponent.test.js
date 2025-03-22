import PositionComponent from '../../../src/entities/components/PositionComponent.js';

describe('PositionComponent', () => {
  let positionComponent;

  beforeEach(() => {
    positionComponent = new PositionComponent();
  });

  describe('initialization', () => {
    test('should initialize with empty components map', () => {
      expect(positionComponent.components).toBeInstanceOf(Map);
      expect(positionComponent.components.size).toBe(0);
    });
  });

  describe('component management', () => {
    test('should add component with default values when not provided', () => {
      positionComponent.addComponent(1, {});
      
      expect(positionComponent.components.get(1)).toEqual({
        x: 0,
        y: 0,
        z: 0,
        rotation: 0
      });
    });

    test('should add component with provided values', () => {
      const data = {
        x: 10,
        y: 5,
        z: 20,
        rotation: 1.5
      };
      
      positionComponent.addComponent(1, data);
      
      expect(positionComponent.components.get(1)).toEqual(data);
    });

    test('should add component with partial values', () => {
      positionComponent.addComponent(1, { x: 10, z: 20 });
      
      expect(positionComponent.components.get(1)).toEqual({
        x: 10,
        y: 0,
        z: 20,
        rotation: 0
      });
    });

    test('should remove component', () => {
      positionComponent.addComponent(1, {});
      expect(positionComponent.hasComponent(1)).toBe(true);
      
      positionComponent.removeComponent(1);
      expect(positionComponent.hasComponent(1)).toBe(false);
    });

    test('should get component', () => {
      const data = { x: 10, y: 5, z: 20, rotation: 1.5 };
      positionComponent.addComponent(1, data);
      
      expect(positionComponent.getComponent(1)).toEqual(data);
    });

    test('should check if component exists', () => {
      expect(positionComponent.hasComponent(1)).toBe(false);
      
      positionComponent.addComponent(1, {});
      expect(positionComponent.hasComponent(1)).toBe(true);
    });
  });

  describe('serialization', () => {
    test('should return all components as array', () => {
      positionComponent.addComponent(1, { x: 10, y: 5, z: 20 });
      positionComponent.addComponent(2, { x: -5, y: 0, z: 15, rotation: 2.5 });
      
      const allComponents = positionComponent.getAllComponents();
      
      expect(allComponents).toEqual([
        [1, { x: 10, y: 5, z: 20, rotation: 0 }],
        [2, { x: -5, y: 0, z: 15, rotation: 2.5 }]
      ]);
    });

    test('should set all components from array', () => {
      const componentsData = [
        [1, { x: 10, y: 5, z: 20, rotation: 0 }],
        [2, { x: -5, y: 0, z: 15, rotation: 2.5 }]
      ];
      
      positionComponent.setAllComponents(componentsData);
      
      expect(positionComponent.components.size).toBe(2);
      expect(positionComponent.getComponent(1)).toEqual({ x: 10, y: 5, z: 20, rotation: 0 });
      expect(positionComponent.getComponent(2)).toEqual({ x: -5, y: 0, z: 15, rotation: 2.5 });
    });
  });
});