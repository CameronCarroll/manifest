import HealthComponent from '../../../../src/entities/components/HealthComponent.js';

describe('HealthComponent', () => {
  let healthComponent;

  beforeEach(() => {
    healthComponent = new HealthComponent();
  });

  describe('initialization', () => {
    test('should initialize with empty components map', () => {
      expect(healthComponent.components).toBeInstanceOf(Map);
      expect(healthComponent.components.size).toBe(0);
    });
  });

  describe('component management', () => {
    test('should add component with default values when not provided', () => {
      healthComponent.addComponent(1, {});
      
      expect(healthComponent.components.get(1)).toEqual({
        maxHealth: 100,
        currentHealth: 100,
        armor: 0,
        shield: 0,
        regeneration: 0
      });
    });

    test('should add component with provided values', () => {
      const data = {
        maxHealth: 200,
        currentHealth: 150,
        armor: 50,
        shield: 100,
        regeneration: 2
      };
      
      healthComponent.addComponent(1, data);
      
      expect(healthComponent.components.get(1)).toEqual(data);
    });

    test('should set currentHealth to maxHealth if only maxHealth is provided', () => {
      healthComponent.addComponent(1, { maxHealth: 200 });
      
      expect(healthComponent.components.get(1).currentHealth).toBe(200);
    });

    test('should add component with partial values', () => {
      healthComponent.addComponent(1, { maxHealth: 200, armor: 20 });
      
      expect(healthComponent.components.get(1)).toEqual({
        maxHealth: 200,
        currentHealth: 200,
        armor: 20,
        shield: 0,
        regeneration: 0
      });
    });

    test('should remove component', () => {
      healthComponent.addComponent(1, {});
      expect(healthComponent.hasComponent(1)).toBe(true);
      
      healthComponent.removeComponent(1);
      expect(healthComponent.hasComponent(1)).toBe(false);
    });

    test('should get component', () => {
      const data = { maxHealth: 200, currentHealth: 150, armor: 50, shield: 100, regeneration: 2 };
      healthComponent.addComponent(1, data);
      
      expect(healthComponent.getComponent(1)).toEqual(data);
    });

    test('should check if component exists', () => {
      expect(healthComponent.hasComponent(1)).toBe(false);
      
      healthComponent.addComponent(1, {});
      expect(healthComponent.hasComponent(1)).toBe(true);
    });
  });

  describe('serialization', () => {
    test('should return all components as array', () => {
      healthComponent.addComponent(1, { maxHealth: 200, currentHealth: 150 });
      healthComponent.addComponent(2, { maxHealth: 300, currentHealth: 300, armor: 50 });
      
      const allComponents = healthComponent.getAllComponents();
      
      expect(allComponents).toEqual([
        [1, { maxHealth: 200, currentHealth: 150, armor: 0, shield: 0, regeneration: 0 }],
        [2, { maxHealth: 300, currentHealth: 300, armor: 50, shield: 0, regeneration: 0 }]
      ]);
    });

    test('should set all components from array', () => {
      const componentsData = [
        [1, { maxHealth: 200, currentHealth: 150, armor: 0, shield: 0, regeneration: 0 }],
        [2, { maxHealth: 300, currentHealth: 300, armor: 50, shield: 0, regeneration: 0 }]
      ];
      
      healthComponent.setAllComponents(componentsData);
      
      expect(healthComponent.components.size).toBe(2);
      expect(healthComponent.getComponent(1)).toEqual({ 
        maxHealth: 200, currentHealth: 150, armor: 0, shield: 0, regeneration: 0 
      });
      expect(healthComponent.getComponent(2)).toEqual({ 
        maxHealth: 300, currentHealth: 300, armor: 50, shield: 0, regeneration: 0 
      });
    });
  });
});