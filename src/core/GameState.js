class GameState {
  constructor() {
    this.entities = new Map();
    this.nextEntityId = 1;
    this.playerResources = { minerals: 0, gas: 0 };
    this.gameTime = 0;
    this.version = '1.0.0';
  }

  update(deltaTime) {
    this.gameTime += deltaTime;
  }

  serialize() {
    return {
      entities: Array.from(this.entities.entries()),
      nextEntityId: this.nextEntityId,
      playerResources: { ...this.playerResources },
      gameTime: this.gameTime,
      version: this.version,
      timestamp: Date.now()
    };
  }

  deserialize(data) {
    this.entities = new Map(data.entities);
    this.nextEntityId = data.nextEntityId;
    this.playerResources = { ...data.playerResources };
    this.gameTime = data.gameTime;
    this.version = data.version;
  }
}

export default GameState;
