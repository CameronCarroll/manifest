import RenderComponent from '../../../../src/entities/components/RenderComponent.js';

describe('RenderComponent', () => {
  let renderComponent;

  beforeEach(() => {
    renderComponent = new RenderComponent();
  });

  describe('initialization', () => {
    test('should initialize with empty components map', () => {
      expect(renderComponent.components).toBeInstanceOf(Map);
      expect(renderComponent.components.size).toBe(0);
    });
  });

  describe('component management', () => {
    test('should add component with default values when not provided', () => {
      renderComponent.addComponent(1, { meshId: 'testMesh' });
      
      expect(renderComponent.components.get(1)).toEqual({
        meshId: 'testMesh',
        visible: true,
        scale: { x: 1, y: 1, z: 1 },
        color: 0xffffff,
        opacity: 1
      });
    });

    test('should add component with provided values', () => {
      const data = {
        meshId: 'customMesh',
        visible: false,
        scale: { x: 2, y: 3, z: 1 },
        color: 0xff0000,
        opacity: 0.5
      };
      
      renderComponent.addComponent(1, data);
      
      expect(renderComponent.components.get(1)).toEqual(data);
    });

    test('should respect visible flag when provided', () => {
      renderComponent.addComponent(1, { meshId: 'testMesh', visible: false });
      
      expect(renderComponent.components.get(1).visible).toBe(false);
    });

    test('should add component with partial values', () => {
      renderComponent.addComponent(1, { 
        meshId: 'testMesh', 
        color: 0x00ff00, 
        opacity: 0.8 
      });
      
      expect(renderComponent.components.get(1)).toEqual({
        meshId: 'testMesh',
        visible: true,
        scale: { x: 1, y: 1, z: 1 },
        color: 0x00ff00,
        opacity: 0.8
      });
    });

    test('should remove component', () => {
      renderComponent.addComponent(1, { meshId: 'testMesh' });
      expect(renderComponent.hasComponent(1)).toBe(true);
      
      renderComponent.removeComponent(1);
      expect(renderComponent.hasComponent(1)).toBe(false);
    });

    test('should get component', () => {
      const data = { 
        meshId: 'testMesh',
        scale: { x: 2, y: 2, z: 2 },
        color: 0x0000ff
      };
      
      renderComponent.addComponent(1, data);
      
      const component = renderComponent.getComponent(1);
      expect(component.meshId).toBe('testMesh');
      expect(component.scale).toEqual({ x: 2, y: 2, z: 2 });
      expect(component.color).toBe(0x0000ff);
      expect(component.visible).toBe(true); // Default value
      expect(component.opacity).toBe(1); // Default value
    });

    test('should check if component exists', () => {
      expect(renderComponent.hasComponent(1)).toBe(false);
      
      renderComponent.addComponent(1, { meshId: 'testMesh' });
      expect(renderComponent.hasComponent(1)).toBe(true);
    });
  });

  describe('serialization', () => {
    test('should return all components as array', () => {
      renderComponent.addComponent(1, { meshId: 'mesh1', color: 0xff0000 });
      renderComponent.addComponent(2, { 
        meshId: 'mesh2', 
        scale: { x: 2, y: 2, z: 2 },
        visible: false
      });
      
      const allComponents = renderComponent.getAllComponents();
      
      expect(allComponents).toEqual([
        [1, {
          meshId: 'mesh1',
          visible: true,
          scale: { x: 1, y: 1, z: 1 },
          color: 0xff0000,
          opacity: 1
        }],
        [2, {
          meshId: 'mesh2',
          visible: false,
          scale: { x: 2, y: 2, z: 2 },
          color: 0xffffff,
          opacity: 1
        }]
      ]);
    });

    test('should set all components from array', () => {
      const componentsData = [
        [1, {
          meshId: 'mesh1',
          visible: true,
          scale: { x: 1, y: 1, z: 1 },
          color: 0xff0000,
          opacity: 1
        }],
        [2, {
          meshId: 'mesh2',
          visible: false,
          scale: { x: 2, y: 2, z: 2 },
          color: 0xffffff,
          opacity: 0.5
        }]
      ];
      
      renderComponent.setAllComponents(componentsData);
      
      expect(renderComponent.components.size).toBe(2);
      expect(renderComponent.getComponent(1)).toEqual({
        meshId: 'mesh1',
        visible: true,
        scale: { x: 1, y: 1, z: 1 },
        color: 0xff0000,
        opacity: 1
      });
      expect(renderComponent.getComponent(2)).toEqual({
        meshId: 'mesh2',
        visible: false,
        scale: { x: 2, y: 2, z: 2 },
        color: 0xffffff,
        opacity: 0.5
      });
    });
  });
});