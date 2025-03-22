import FactionComponent from '../../../../src/entities/components/FactionComponent.js';

describe('FactionComponent', () => {
  let factionComponent;

  beforeEach(() => {
    factionComponent = new FactionComponent();
  });

  describe('initialization', () => {
    test('should initialize with empty components map', () => {
      expect(factionComponent.components).toBeInstanceOf(Map);
      expect(factionComponent.components.size).toBe(0);
    });

    test('should define faction constants', () => {
      expect(factionComponent.FACTIONS.PLAYER).toBe('player');
      expect(factionComponent.FACTIONS.ALLY).toBe('ally');
      expect(factionComponent.FACTIONS.ENEMY).toBe('enemy');
    });
  });

  describe('component management', () => {
    test('should add component with default values when not provided', () => {
      factionComponent.addComponent(1, {});
      
      expect(factionComponent.components.get(1)).toEqual({
        faction: 'player',
        visibility: true,
        unitType: 'basic',
        attackType: 'ranged',
        damageType: 'normal'
      });
    });

    test('should add component with provided values', () => {
      const data = {
        faction: 'enemy',
        visibility: false,
        unitType: 'assault',
        attackType: 'melee',
        damageType: 'piercing'
      };
      
      factionComponent.addComponent(1, data);
      
      expect(factionComponent.components.get(1)).toEqual(data);
    });

    test('should remove component', () => {
      factionComponent.addComponent(1, {});
      expect(factionComponent.hasComponent(1)).toBe(true);
      
      factionComponent.removeComponent(1);
      expect(factionComponent.hasComponent(1)).toBe(false);
    });

    test('should get component', () => {
      const data = { faction: 'enemy', unitType: 'sniper' };
      factionComponent.addComponent(1, data);
      
      expect(factionComponent.getComponent(1).faction).toBe('enemy');
      expect(factionComponent.getComponent(1).unitType).toBe('sniper');
    });
  });

  describe('serialization', () => {
    test('should return all components as array', () => {
      factionComponent.addComponent(1, { faction: 'player', unitType: 'assault' });
      factionComponent.addComponent(2, { faction: 'enemy', unitType: 'sniper' });
      
      const allComponents = factionComponent.getAllComponents();
      
      expect(allComponents).toHaveLength(2);
      expect(allComponents[0][0]).toBe(1);
      expect(allComponents[0][1].faction).toBe('player');
      expect(allComponents[1][0]).toBe(2);
      expect(allComponents[1][1].faction).toBe('enemy');
    });

    test('should set all components from array', () => {
      const componentsData = [
        [1, { faction: 'player', visibility: true, unitType: 'assault', attackType: 'ranged', damageType: 'normal' }],
        [2, { faction: 'enemy', visibility: false, unitType: 'sniper', attackType: 'ranged', damageType: 'piercing' }]
      ];
      
      factionComponent.setAllComponents(componentsData);
      
      expect(factionComponent.components.size).toBe(2);
      expect(factionComponent.getComponent(1).unitType).toBe('assault');
      expect(factionComponent.getComponent(2).unitType).toBe('sniper');
    });
  });
});